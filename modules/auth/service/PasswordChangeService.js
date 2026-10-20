const crypto = require("node:crypto");
const Joi = require("joi");
const { UserModel } = require("../../../model/db_song");
const Challenge = require("../model/PasswordChallenge");
const Password = require("./PasswordService");
const Email = require("./EmailService");
const Validator = require("../validator/PasswordChangeValidator");
// Previous: const failure = (status, message) => Object.assign(new Error(message), { status });
const failure = (status, message, details = {}) => Object.assign(new Error(message), { status, ...details });
const { retryDetails } = require('./PasswordOtpPolicy');
const { mailDiagnostics, isMailAuthError } = require('../../../utils/mailDiagnostics');
const version = user => user.authVersion || 0;
const emailOf = user => typeof user.gmail === "string" ? user.gmail.trim() : "";
const credentialHash = user => crypto.createHash("sha256").update(user.namePassword).digest("hex");
const mask = email => { const [name, domain] = email.split("@"); return name.slice(0, 1) + "***@" + domain; };
function digest(userId, challengeId, otp) {
  const key = process.env.PASSWORD_OTP_SECRET || process.env.SESSION_SECRET;
  if (!key || Buffer.byteLength(key) < 32) throw failure(503, "Dịch vụ OTP chưa được cấu hình.");
  return crypto.createHmac("sha256", key).update([userId, challengeId, otp].join(":")).digest("hex");
}
async function matches(plain, stored) {
  if (typeof stored !== "string" || !stored) return false;
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(stored)) return Password.compare(plain, stored);
  if (stored.startsWith("$2")) return false;
  const a = Buffer.from(plain), b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
exports.actor = async identity => {
  if (typeof identity !== "string" || !identity) throw failure(401, "Vui lòng đăng nhập lại.");
  const user = await UserModel.findOne({ $or: [{ userID: identity }, ...(/^[a-f0-9]{24}$/i.test(identity) ? [{ _id: identity }] : [])] })
    .select("_id userID namePassword gmail authVersion").lean();
  if (!user) throw failure(401, "Vui lòng đăng nhập lại.");
  return user;
};
exports.options = actor => {
  const email = emailOf(actor), valid = !Joi.string().email().required().validate(email).error;
  return { canUseEmail: valid, email: valid ? mask(email) : null, expiresIn: 300, retryAfter: 60 };
};
exports.getOptions = async actor => {
  const options = exports.options(actor);
  if (!options.canUseEmail) return { ...options, retryAfter: 0 };
  const challenge = await Challenge.findOne({ userId: actor._id })
    .select('challengeId email authVersion credentialHash expiresAt sentAt windowStartedAt sendCount attempts ready consumed').lean();
  const active = challenge?.ready && !challenge.consumed && challenge.attempts < 5 &&
    new Date(challenge.expiresAt).getTime() > Date.now() && challenge.email === emailOf(actor) &&
    challenge.authVersion === version(actor) && challenge.credentialHash === credentialHash(actor);
  return { ...options, ...retryDetails(challenge),
    ...(active ? { challenge: { challengeId: challenge.challengeId, expiresAt: challenge.expiresAt } } : {}) };
};
exports.requestOtp = async actor => {
  const email = emailOf(actor);
  if (!exports.options(actor).canUseEmail) throw failure(400, "Tài khoản chưa có email nhận OTP hợp lệ. Bạn có thể dùng mật khẩu hiện tại.");
  Email.assertConfigured();
  const now = new Date(), challengeId = crypto.randomUUID(), otp = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
  const hash = digest(actor._id, challengeId, otp);
  try { await Challenge.updateOne({ userId: actor._id }, { $setOnInsert: { windowStartedAt: now, sendCount: 0 } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  await Challenge.updateOne({ userId: actor._id, windowStartedAt: { $lte: new Date(now.getTime() - 3600000) } }, { $set: { windowStartedAt: now, sendCount: 0 } });
  // Reserve the send atomically so concurrent requests cannot bypass the cooldown.
  const challenge = await Challenge.findOneAndUpdate({ userId: actor._id, sendCount: { $lt: 5 },
    $or: [{ sentAt: { $lte: new Date(now.getTime() - 60000) } }, { sentAt: { $exists: false } }],
  }, { $set: { challengeId, hash, email, authVersion: version(actor), credentialHash: credentialHash(actor),
    sentAt: now, expiresAt: new Date(now.getTime() + 300000), deleteAt: new Date(now.getTime() + 3900000), attempts: 0, ready: false, consumed: false },
    $inc: { sendCount: 1 },
  }, { new: true }).lean();
  // Previous: if (!challenge) throw failure(429, "Vui lòng chờ ít nhất 60 giây giữa các lần gửi, tối đa 5 lần mỗi giờ.");
  if (!challenge) {
    const state = await Challenge.findOne({ userId: actor._id }).select('sentAt windowStartedAt sendCount').lean();
    const details = retryDetails(state);
    throw failure(429, details.code === 'OTP_HOURLY_LIMIT'
      ? 'Đã đạt giới hạn 5 lần gửi OTP mỗi giờ. Vui lòng chờ hết thời gian đếm ngược rồi thử lại.'
      : 'Vui lòng chờ ít nhất 60 giây giữa các lần gửi OTP.',
    details.retryAfter ? details : { retryAfter: 60, code: 'OTP_COOLDOWN' });
  }
  try {
    await Email.sendPasswordChangeOtp(email, otp);
    const ready = await Challenge.updateOne({ userId: actor._id, challengeId, consumed: false }, { $set: { ready: true } });
    if (!ready.modifiedCount) throw new Error("Challenge replaced");
  // Previous: catch discarded the delivery error and returned no retry metadata.
  } catch (error) {
    await Challenge.updateOne({ userId: actor._id, challengeId }, { $set: { ready: false, consumed: true }, $unset: { hash: "" } });
    // Never log the mail payload, recipient, OTP or OAuth credentials.
    // Previous log retained only code/responseCode and could not identify invalid_grant.
    // console.warn('Password OTP delivery failed.', { code: error.code, responseCode: error.responseCode });
    const details = mailDiagnostics(error);
    console.warn('Password OTP delivery failed.', details);
    // Previous: throw failure(503, "Không gửi được OTP. Vui lòng thử lại sau; mật khẩu chưa thay đổi.");
    // Previous: throw failure(503, "Không gửi được OTP. Vui lòng thử lại sau; mật khẩu chưa thay đổi.", { ...retryDetails(challenge), code: 'OTP_DELIVERY_FAILED' });
    const authFailed = isMailAuthError(details);
    throw failure(503, authFailed
      ? 'Máy chủ chưa xác thực được tài khoản gửi email. Cần cập nhật quyền OAuth hoặc cấu hình mail; bạn có thể dùng mật khẩu hiện tại để đổi mật khẩu.'
      : 'Không gửi được OTP. Vui lòng thử lại sau; mật khẩu chưa thay đổi.',
    { ...retryDetails(challenge), code: authFailed ? 'OTP_MAIL_AUTH_FAILED' : 'OTP_DELIVERY_FAILED' });
  }
  // Previous: return { challengeId, email: mask(email), expiresAt: challenge.expiresAt, retryAfter: 60 };
  return { challengeId, email: mask(email), expiresAt: challenge.expiresAt, ...retryDetails(challenge) };
};
async function consumeOtp(actor, data) {
  const query = { userId: actor._id, challengeId: data.challengeId, ready: true, consumed: false,
    expiresAt: { $gt: new Date() }, attempts: { $lt: 5 }, email: emailOf(actor), authVersion: version(actor), credentialHash: credentialHash(actor) };
  const challenge = await Challenge.findOneAndUpdate(query, { $inc: { attempts: 1 } }, { new: true }).lean();
  const invalid = () => failure(400, "OTP không đúng, đã hết hạn hoặc đã dùng. Tối đa 5 lần nhập cho mỗi mã.");
  if (!challenge?.hash) throw invalid();
  const actual = Buffer.from(digest(actor._id, data.challengeId, data.otp), "hex"), expected = Buffer.from(challenge.hash, "hex");
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw invalid();
  const claimed = await Challenge.findOneAndUpdate({ ...query, attempts: { $lte: 5 }, hash: challenge.hash },
    { $set: { consumed: true, ready: false }, $unset: { hash: "" } }, { new: true }).lean();
  if (!claimed) throw invalid();
}
exports.change = async (actor, input) => {
  const data = Validator.change(input);
  if (data.method === "password" && !await matches(data.oldPassword, actor.namePassword)) throw failure(403, "Mật khẩu hiện tại không đúng.");
  if (data.method === "otp") await consumeOtp(actor, data);
  if (await matches(data.newPassword, actor.namePassword)) throw failure(400, "Mật khẩu mới phải khác mật khẩu hiện tại.");
  const hash = await Password.hash(data.newPassword);
  const result = await UserModel.updateOne({ _id: actor._id, namePassword: actor.namePassword, gmail: actor.gmail,
    ...(version(actor) ? { authVersion: version(actor) } : { $or: [{ authVersion: 0 }, { authVersion: { $exists: false } }] }),
  }, { $set: { namePassword: hash, refreshTokens: [] }, $inc: { authVersion: 1 }, $unset: { otp: "" } });
  if (!result.modifiedCount) throw failure(409, "Thông tin tài khoản vừa thay đổi. Vui lòng đăng nhập lại rồi thử lại.");
  await Challenge.updateOne({ userId: actor._id }, { $set: { consumed: true, ready: false }, $unset: { hash: "" } }).catch(() => console.error("Cannot clear password challenge metadata."));
  if (exports.options(actor).canUseEmail) await Email.sendPasswordChangedNotice(emailOf(actor)).catch(() => console.error("Cannot deliver password change notice."));
  return { requiresLogin: true, message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
};

const Joi = require("joi");
const Mail = require("../model/Mail");
const { UserModel } = require("../../../model/db_song");
const isId = value => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
const failure = (status, message) => Object.assign(new Error(message), { status });
const PUBLIC_USER = "_id fullName userName imageAccount profileTag";
const FIELDS = "sender recipient kind subject body replyTo readBy createdAt clientId";
const createSchema = Joi.object({
  kind: Joi.string().valid("message", "complaint", "request").required(),
  recipient: Joi.when("kind", { is: "message", then: Joi.string().trim().max(254).required(), otherwise: Joi.string().max(254).allow("").default("") }),
  subject: Joi.string().trim().max(140).required(),
  body: Joi.string().trim().max(5000).required(),
  clientId: Joi.string().guid({ version: ["uuidv4"] }).required(),
  replyTo: Joi.string().pattern(/^[a-f0-9]{24}$/i).allow(null).default(null),
}).unknown(false);
const listSchema = Joi.object({ box: Joi.string().valid("inbox", "sent").default("inbox"), page: Joi.number().integer().min(1).max(500).default(1) }).unknown(false);
const recipientSchema = Joi.object({ q: Joi.string().trim().min(2).max(80).required() }).unknown(false);
function validate(schema, input) {
  const result = schema.validate(input);
  if (result.error) throw failure(400, "Thông tin thư không hợp lệ. Tiêu đề tối đa 140 ký tự, nội dung tối đa 5.000 ký tự.");
  return result.value;
}
const same = (a, b) => String(a?._id || a || "") === String(b?._id || b || "");
function incoming(actor) {
  const targets = [{ recipient: actor._id }];
  if (actor.role === 2) targets.push({ recipient: null, kind: { $in: ["complaint", "request"] } });
  return { sender: { $ne: actor._id }, $or: targets };
}
function readable(actor, id) {
  const targets = [{ sender: actor._id }, { recipient: actor._id }];
  if (actor.role === 2) targets.push({ recipient: null, kind: { $in: ["complaint", "request"] } });
  return { _id: id, $or: targets };
}
function userDto(user) {
  if (!user?._id) return null;
  return { id: String(user._id), name: user.fullName || user.userName || (user.profileTag ? '#' + user.profileTag : "Tài khoản"), avatar: user.imageAccount || "", tag: user.profileTag || "" };
}
function dto(mail, actor, detail = false) {
  return { id: String(mail._id), kind: mail.kind, subject: mail.subject,
    sender: userDto(mail.sender), recipient: userDto(mail.recipient),
    createdAt: mail.createdAt, replyTo: mail.replyTo ? String(mail.replyTo) : null,
    unread: !same(mail.sender, actor) && !(mail.readBy || []).some(id => same(id, actor)),
    ...(detail ? { body: mail.body } : { preview: mail.body.slice(0, 120) }) };
}
function populated(query) { return query.select(FIELDS).populate("sender", PUBLIC_USER).populate("recipient", PUBLIC_USER); }
async function resolveRecipient(value) {
  let filter;
  if (/^#?hz\d{3,12}$/i.test(value)) filter = { profileTag: value.replace(/^#/, "").toLowerCase() };
  else if (isId(value)) filter = { _id: value };
  else filter = { nameAccount: value };
  const user = await UserModel.findOne(filter).select(PUBLIC_USER).lean();
  if (!user) throw failure(404, "Không tìm thấy người nhận. Hãy nhập đúng tài khoản hoặc biệt danh #hz.");
  return user;
}
exports.actor = async function (identity) {
  if (typeof identity !== "string" || !identity) throw failure(401, "Vui lòng đăng nhập để mở hộp thư.");
  const user = await UserModel.findOne({ $or: [{ userID: identity }, ...(isId(identity) ? [{ _id: identity }] : [])] }).select(PUBLIC_USER + " role").lean();
  if (!user) throw failure(401, "Vui lòng đăng nhập lại.");
  return user;
};
exports.unread = actor => Mail.countDocuments({ ...incoming(actor), readBy: { $ne: actor._id } });
exports.recipients = async function (actor, input) {
  const { q } = validate(recipientSchema, input);
  const term = q.normalize("NFC").replace(/^#/, "");
  if (term.length < 2) return { items: [] };
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = new RegExp("^" + escaped, "i");
  const targets = q.startsWith("#") ? [{ profileTag: prefix }] : [
    { profileTag: prefix }, { nameAccount: prefix },
    { fullName: new RegExp(escaped, "i") }, { userName: prefix },
  ];
  const users = await UserModel.find({ _id: { $ne: actor._id }, $or: targets })
    .select(PUBLIC_USER).sort({ fullName: 1, _id: 1 }).limit(8).maxTimeMS(1500).lean();
  return { items: users.map(userDto) };
};
exports.list = async function (actor, input) {
  const { box, page } = validate(listSchema, input);
  const filter = box === "sent" ? { sender: actor._id } : incoming(actor);
  const mails = await populated(Mail.find(filter)).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(21).lean();
  return { items: mails.slice(0, 20).map(mail => dto(mail, actor)), hasMore: mails.length > 20, page, unread: await exports.unread(actor) };
};
exports.detail = async function (actor, id) {
  if (!isId(id)) throw failure(400, "ID thư không hợp lệ.");
  const mail = await populated(Mail.findOne(readable(actor, id))).lean();
  if (!mail) throw failure(404, "Không tìm thấy thư.");
  if (!same(mail.sender, actor)) {
    await Mail.updateOne({ _id: mail._id, ...incoming(actor) }, { $addToSet: { readBy: actor._id } });
    mail.readBy = [...(mail.readBy || []), actor._id];
  }
  return dto(mail, actor, true);
};
exports.send = async function (actor, input) {
  const data = validate(createSchema, input);
  const recipient = data.kind === "message" ? await resolveRecipient(data.recipient) : null;
  if (same(actor, recipient)) throw failure(400, "Bạn không thể gửi thư cho chính mình.");
  if (data.replyTo && !await Mail.exists(readable(actor, data.replyTo))) throw failure(404, "Không tìm thấy thư cần trả lời.");
  const payload = { sender: actor._id, recipient: recipient?._id || null, kind: data.kind,
    subject: data.subject, body: data.body, clientId: data.clientId, replyTo: data.replyTo };
  let mail;
  try { mail = (await Mail.create(payload)).toObject(); }
  catch (error) {
    if (error.code !== 11000) throw error;
    mail = await Mail.findOne({ sender: actor._id, clientId: data.clientId }).lean();
    if (!mail || !same(mail.recipient, payload.recipient) || mail.kind !== payload.kind || mail.subject !== payload.subject || mail.body !== payload.body || !same(mail.replyTo, payload.replyTo)) {
      throw failure(409, "Mã gửi thư đã được dùng cho nội dung khác. Vui lòng mở một thư mới.");
    }
  }
  return dto({ ...mail, sender: actor, recipient }, actor, true);
};

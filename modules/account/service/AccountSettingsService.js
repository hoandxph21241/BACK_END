const { UserModel } = require('../../../model/db_song');
const profileUrl = require('../../../utils/profileUrl');
const Joi = require('joi');
const failure = (status, message) => Object.assign(new Error(message), { status });
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const fields = '_id userID nameAccount gmail fullName userName imageAccount profileSlug profileTag authVersion refreshTokens';
const active = user => (user.refreshTokens || []).filter(session => session.token && new Date(session.expiresAt).getTime() > Date.now());
function device(raw) {
  const ua = String(raw || '').slice(0,600);
  const browser = /Edg\//i.test(ua) ? 'Microsoft Edge' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /Chrome\/|CriOS\//i.test(ua) ? 'Chrome' : /Firefox\/|FxiOS\//i.test(ua) ? 'Firefox' : /Safari\//i.test(ua) ? 'Safari' : 'Thiết bị khác';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Macintosh|Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : '';
  return { browser, os, kind:/Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'computer' };
}
function sessions(user, currentId) {
  return active(user).map(session => ({ id:String(session._id), ...device(session.device), current:String(session._id) === currentId,
    updatedAt:Number.isFinite(new Date(session.createdAt).getTime()) ? new Date(session.createdAt).toISOString() : null,
    expiresAt:new Date(session.expiresAt).toISOString(),
  })).sort((a,b) => Number(b.current) - Number(a.current) || new Date(b.updatedAt) - new Date(a.updatedAt));
}
async function context(identity, refreshToken, accessSessionId, viaBearer = false) {
  if (!validId(identity) || (viaBearer ? !validId(accessSessionId) : typeof refreshToken !== 'string' || !refreshToken)) throw failure(401,'Vui lòng đăng nhập lại.');
  const user = await UserModel.findById(identity).select(fields).lean();
  const current = user && active(user).find(session => viaBearer ? String(session._id) === accessSessionId : session.token === refreshToken);
  if (!current || accessSessionId && String(current._id) !== accessSessionId) throw failure(401,'Phiên đăng nhập đã hết hạn hoặc bị thu hồi.');
  return { user, current };
}
exports.context = context;
exports.info = ({ user }) => {
  const url = profileUrl(user) || '/users/profile';
  const email = !Joi.string().email().validate(user.gmail || '').error ? user.gmail : null;
  return { viewerId:String(user._id), account:{ id:String(user._id), login:user.nameAccount || '', email,
    name:user.fullName || user.userName || 'MediaHz', tag:user.profileTag || null,
    profileUrl:url, editProfileUrl:url === '/users/profile' ? '/users/profile/edit' : url + '/edit' } };
};
exports.list = ({ user, current }) => ({ viewerId:String(user._id), sessions:sessions(user,String(current._id)) });
exports.revoke = async ({ user, current }, target) => {
  if (target !== 'others' && !validId(target)) throw failure(400,'Phiên đăng nhập không hợp lệ.');
  const currentId = String(current._id), before = active(user);
  if (target !== 'others' && !before.some(session => String(session._id) === target)) return { viewerId:String(user._id), sessions:sessions(user,currentId), signedOut:false, removed:0 };
  const updated = await UserModel.findOneAndUpdate({ _id:user._id,
    ...((user.authVersion || 0) ? {authVersion:user.authVersion} : {$or:[{authVersion:0},{authVersion:{$exists:false}}]}),
    refreshTokens:{ $elemMatch:{ _id:current._id, token:current.token, expiresAt:{ $gt:new Date() } } },
  }, { $pull:{ refreshTokens:target === 'others' ? { _id:{ $ne:current._id } } : { _id:target } },
    $set:{ sessionBindingRequired:true }, $inc:{ sessionRevision:1 },
  }, {new:true,runValidators:true}).select('_id refreshTokens').lean();
  if (!updated) throw failure(409,'Phiên vừa thay đổi. Vui lòng tải lại danh sách.');
  if(before.length>active(updated).length)await require('./AccountSecurityService').record(user,target==='others'?'sessions_revoked':'session_revoked')
    .catch(error=>console.warn('Cannot record session security event:',error.code||'AUDIT_FAILED'));
  return { viewerId:String(user._id), sessions:sessions(updated,currentId), signedOut:target === currentId,
    removed:before.length - active(updated).length };
};

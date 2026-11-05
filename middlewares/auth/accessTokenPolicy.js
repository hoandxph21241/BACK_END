// Keep both access-token verifiers consistent without changing their req.user contracts.
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
exports.filter = payload => {
  const identity = validId(payload.id) ? { _id:payload.id }
    : typeof payload.userID === 'string' && payload.userID ? { userID:payload.userID } : null;
  if (!identity || payload.sid !== undefined && !validId(payload.sid)) return null;
  if (payload.sid) identity.refreshTokens = { $elemMatch:{ _id:payload.sid, expiresAt:{ $gt:new Date() } } };
  // Reject inactive owners even when a previously issued valid JWT is presented.
  identity.accountStatus = { $nin:["deactivated","deletion-pending"] };
  return identity;
};
exports.accepts = (user,payload) => Boolean(user
  && (payload.authVersion || 0) === (user.authVersion || 0)
  && (!user.sessionBindingRequired || payload.sid));

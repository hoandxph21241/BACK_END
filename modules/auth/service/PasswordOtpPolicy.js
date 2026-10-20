const SEND_INTERVAL_MS = 60000;
const SEND_WINDOW_MS = 3600000;
const SEND_LIMIT = 5;

function retryDetails(challenge, now = Date.now()) {
  const sentAt = new Date(challenge?.sentAt || 0).getTime();
  const windowStartedAt = new Date(challenge?.windowStartedAt || 0).getTime();
  const hourlyLimit = Number(challenge?.sendCount) >= SEND_LIMIT && windowStartedAt + SEND_WINDOW_MS > now;
  const until = Math.max(sentAt + SEND_INTERVAL_MS, hourlyLimit ? windowStartedAt + SEND_WINDOW_MS : 0);
  const retryAfter = Math.max(0, Math.ceil((until - now) / 1000));
  return { retryAfter, retryAt: retryAfter ? new Date(until).toISOString() : null,
    ...(retryAfter ? { code: hourlyLimit ? 'OTP_HOURLY_LIMIT' : 'OTP_COOLDOWN' } : {}) };
}

module.exports = { retryDetails, SEND_INTERVAL_MS, SEND_WINDOW_MS, SEND_LIMIT };

const providerErrors = new Set(['invalid_grant', 'invalid_client', 'unauthorized_client', 'invalid_scope', 'access_denied', 'admin_policy_enforced']);
const authCodes = new Set(['EAUTH', 'ENOAUTH', 'EOAUTH2', 'MAIL_CONFIG_INVALID']);

function mailDiagnostics(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'MAIL_ERROR';
  const candidate = error?.response?.data?.error;
  const providerError = providerErrors.has(candidate) ? candidate :
    [...providerErrors].find(value => new RegExp(`\\b${value}\\b`).test(String(error?.message || '')));
  return { code, ...(providerError ? { providerError } : {}),
    ...(Number.isInteger(error?.responseCode) ? { responseCode: error.responseCode } : {}) };
}

function isMailAuthError(details) {
  return authCodes.has(details.code) || providerErrors.has(details.providerError);
}

module.exports = { mailDiagnostics, isMailAuthError };

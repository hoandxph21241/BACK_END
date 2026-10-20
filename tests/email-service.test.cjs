const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/profile-fixture.cjs');
const { mailDiagnostics, isMailAuthError } = require('../utils/mailDiagnostics');
const keys = ['EMAIL_SENDER', 'CLIENT_ID_MAIL', 'CLIENT_SECRET_MAIL', 'CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI', 'REDIRECT_URI_MAIL', 'REFRESH_TOKEN', 'MAIL_SERVICE'];

function fixture(t, env = {}) {
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => { delete process.env[key]; });
  Object.assign(process.env, { EMAIL_SENDER: 'test-sender@example.com', CLIENT_ID_MAIL: 'test-mail-client',
    CLIENT_SECRET_MAIL: 'test-mail-secret', REFRESH_TOKEN: 'test-refresh-token', ...env });
  t.after(() => keys.forEach(key => {
    if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }));
  const state = { sends: 0, verifies: 0, closes: 0, result: { token: 'test-access-token' } };
  class OAuth2 {
    constructor(options) { state.client = options; }
    setCredentials(credentials) { state.credentials = credentials; }
    async getAccessToken() { if (state.tokenError) throw state.tokenError; return state.result; }
  }
  const mail = load('modules/auth/service/EmailService.js', {
    googleapis: { google: { auth: { OAuth2 } } },
    nodemailer: { createTransport(options) {
      state.transport = options;
      return {
        async sendMail(message) { state.sends++; state.message = message; if (state.sendError) throw state.sendError; return { accepted: ['test@example.com'] }; },
        async verify() { state.verifies++; return true; },
        close() { state.closes++; },
      };
    } },
  });
  return { mail, state };
}

test('mail obtains a string access token through googleapis before SMTP', async t => {
  const { mail, state } = fixture(t);
  await mail.sendPasswordChangeOtp('test@example.com', '123456');
  assert.equal(state.client.clientId, 'test-mail-client');
  assert.equal(state.credentials.refresh_token, 'test-refresh-token');
  assert.equal(state.transport.auth.accessToken, 'test-access-token');
  assert.equal(typeof state.transport.auth.accessToken, 'string');
  assert.equal(state.transport.auth.user, 'test-sender@example.com');
  assert.equal(state.sends, 1);
  assert.equal(state.closes, 1);
});
test('legacy CLIENT_ID/CLIENT_SECRET pair remains supported without mixing pairs', async t => {
  const { mail, state } = fixture(t, { CLIENT_ID_MAIL: '', CLIENT_SECRET_MAIL: '', CLIENT_ID: 'test-legacy-client',
    CLIENT_SECRET: 'test-legacy-secret', REDIRECT_URI: 'https://developers.google.com/oauthplayground' });
  await mail.verify();
  assert.equal(state.client.clientId, 'test-legacy-client');
  assert.equal(state.client.clientSecret, 'test-legacy-secret');
  assert.equal(state.verifies, 1);
  assert.equal(state.sends, 0);
});
test('dedicated mail client takes precedence over legacy pair', async t => {
  const { mail, state } = fixture(t, { CLIENT_ID: 'test-legacy-client', CLIENT_SECRET: 'test-legacy-secret' });
  await mail.verify();
  assert.equal(state.client.clientId, 'test-mail-client');
  assert.equal(state.client.clientSecret, 'test-mail-secret');
});
test('partial mail credentials never silently borrow a secret from another OAuth client', async t => {
  const { mail, state } = fixture(t, { CLIENT_SECRET_MAIL: '', CLIENT_ID: 'test-legacy-client', CLIENT_SECRET: 'test-legacy-secret' });
  await assert.rejects(mail.verify(), error => error.code === 'MAIL_CONFIG_INVALID');
  assert.equal(state.verifies, 0);
  assert.equal(state.sends, 0);
});
test('revoked OAuth token prevents SMTP submission and preserves diagnostic cause', async t => {
  const { mail, state } = fixture(t);
  state.tokenError = Object.assign(new Error('invalid_grant: revoked test grant'), {
    response: { data: { error: 'invalid_grant' }, config: { data: 'secret-request-payload' } },
  });
  await assert.rejects(mail.sendPasswordChangeOtp('test@example.com', '123456'), error => {
    const details = mailDiagnostics(error);
    assert.equal(details.providerError, 'invalid_grant');
    assert.equal(isMailAuthError(details), true);
    assert.ok(!JSON.stringify(details).includes('secret-request-payload'));
    return true;
  });
  assert.equal(state.sends, 0);
});
test('missing access token is not passed as an object to SMTP', async t => {
  const { mail, state } = fixture(t);
  state.result = { token: null };
  await assert.rejects(mail.verify(), error => error.code === 'EOAUTH2');
  assert.equal(state.sends, 0);
  assert.equal(state.verifies, 0);
});
test('SMTP errors still close the connection', async t => {
  const { mail, state } = fixture(t);
  state.sendError = Object.assign(new Error('Test SMTP rejection'), { code: 'EAUTH', responseCode: 535 });
  await assert.rejects(mail.sendPasswordChangeOtp('test@example.com', '123456'), error => error.code === 'EAUTH');
  assert.equal(state.closes, 1);
});
test('diagnostics allow only known provider errors and never serialize raw secrets', () => {
  const details = mailDiagnostics({ code: 'EAUTH', message: 'secret@example.com secret-token',
    responseCode: 535, response: { data: { error: 'arbitrary-secret' } }, config: { secret: 'secret-value' } });
  assert.deepEqual(details, { code: 'EAUTH', responseCode: 535 });
  assert.equal(isMailAuthError(details), true);
  assert.equal(isMailAuthError(mailDiagnostics({ code: 'ETIMEDOUT' })), false);
});

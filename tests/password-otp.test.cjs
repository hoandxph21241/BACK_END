const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { retryDetails } = require('../modules/auth/service/PasswordOtpPolicy');
const { load } = require('./helpers/profile-fixture.cjs');
const now = Date.UTC(2026, 9, 20, 3, 37, 0);

test('OTP policy returns actual cooldown and hourly reset', () => {
  assert.equal(retryDetails(null, now).retryAfter, 0);
  assert.deepEqual(retryDetails({ sentAt: new Date(now - 20000), sendCount: 1 }, now), {
    retryAfter: 40, retryAt: new Date(now + 40000).toISOString(), code: 'OTP_COOLDOWN',
  });
  const hourly = retryDetails({ sentAt: new Date(now - 120000), sendCount: 5, windowStartedAt: new Date(now - 3000000) }, now);
  assert.equal(hourly.code, 'OTP_HOURLY_LIMIT');
  assert.equal(hourly.retryAfter, 600);
});
test('expired hourly window never bypasses the one-minute resend cooldown', () => {
  const state = { sendCount: 5, windowStartedAt: new Date(now - 3600001), sentAt: new Date(now - 5000) };
  assert.equal(retryDetails(state, now).code, 'OTP_COOLDOWN');
  assert.equal(retryDetails(state, now).retryAfter, 55);
  state.sentAt = new Date(now - 61000);
  assert.equal(retryDetails(state, now).retryAfter, 0);
});

async function routerFixture(t, overrides = {}) {
  const express = require('express');
  const service = { actor: async () => ({ _id: crypto.randomUUID() }), getOptions: async () => ({ retryAfter: 900 }),
    requestOtp: async () => ({ challengeId: crypto.randomUUID(), retryAfter: 60 }), ...overrides };
  const actor = { _id: crypto.randomUUID() };
  service.actor = async () => actor;
  const auth = (req, res, next) => { req.user = { id: 'test-user' }; next(); };
  const router = load('modules/auth/router/PasswordRouter.js', {
    '../../../middlewares/auth/verifyAccessToken': auth, '../../../middlewares/auth/webAccessToken': auth,
    '../service/PasswordChangeService': service,
  });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api/auth/password`;
  const post = () => fetch(url + '/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return { url, post };
}

test('OTP 429 response contains real Retry-After, code and reset time', async t => {
  const { post } = await routerFixture(t, { requestOtp: async () => { throw Object.assign(new Error('Hourly limit'), {
    status: 429, code: 'OTP_HOURLY_LIMIT', retryAfter: 900, retryAt: new Date(now + 900000).toISOString(),
  }); } });
  const response = await post(), data = await response.json();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '900');
  assert.equal(data.retryAfter, 900);
  assert.equal(data.code, 'OTP_HOURLY_LIMIT');
});
test('options waits for stored cooldown state instead of serializing a Promise', async t => {
  const { url } = await routerFixture(t);
  const response = await fetch(url + '/options');
  assert.equal((await response.json()).data.retryAfter, 900);
});
test('failed/cooldown requests do not spend a separate five-request hourly quota', async t => {
  let called = 0;
  const { post } = await routerFixture(t, { requestOtp: async () => { called++; throw Object.assign(new Error('Cooldown'), { status: 429, retryAfter: 45 }); } });
  for (let n = 0; n < 6; n++) {
    const response = await post();
    assert.equal(response.headers.get('retry-after'), '45');
    await response.text();
  }
  assert.equal(called, 6);
});
test('account burst limiter still blocks excessive requests with retry metadata', async t => {
  let called = 0;
  const { post } = await routerFixture(t, { requestOtp: async () => { called++; return { retryAfter: 60 }; } });
  for (let n = 0; n < 30; n++) { const response = await post(); assert.equal(response.status, 200); await response.text(); }
  const response = await post(), data = await response.json();
  assert.equal(response.status, 429);
  assert.equal(called, 30);
  assert.equal(data.code, 'OTP_REQUEST_LIMIT');
  assert.ok(data.retryAfter > 0 && data.retryAfter <= 60);
});

test('real OTP state enforces send limits, restores active codes and invalidates failed mail', { skip: !process.env.OTP_TEST_MONGO_URL }, async t => {
  const mongoose = require('mongoose');
  const dbName = `MediaHz_Otp_Test_${crypto.randomBytes(12).toString('hex')}`;
  const connection = await mongoose.createConnection(process.env.OTP_TEST_MONGO_URL, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
  t.after(async () => {
    if (connection.name === dbName && /^MediaHz_Otp_Test_[a-f0-9]{24}$/.test(dbName)) await connection.dropDatabase();
    await connection.close();
  });
  const Challenge = load('modules/auth/model/PasswordChallenge.js', {
    '../../../model/db': { mongoose: { Schema: mongoose.Schema, models: connection.models, model: connection.model.bind(connection) } },
  });
  await Challenge.init();
  let sends = 0, fail = false;
  const service = load('modules/auth/service/PasswordChangeService.js', {
    '../../../model/db_song': { UserModel: {} }, '../model/PasswordChallenge': Challenge,
    './EmailService': { assertConfigured() {}, async sendPasswordChangeOtp() {
      sends++;
      if (fail) throw Object.assign(new Error('private-test@example.test 123456'), { code: 'EAUTH', responseCode: 535 });
    } },
  });
  const previousSecret = process.env.PASSWORD_OTP_SECRET;
  process.env.PASSWORD_OTP_SECRET = crypto.randomBytes(32).toString('hex');
  t.after(() => { if (previousSecret === undefined) delete process.env.PASSWORD_OTP_SECRET; else process.env.PASSWORD_OTP_SECRET = previousSecret; });
  const actor = { _id: new mongoose.Types.ObjectId(), gmail: 'otp-test@example.com', namePassword: 'test-credential', authVersion: 0 };
  const result = await service.requestOtp(actor);
  assert.equal(sends, 1);
  await assert.rejects(service.requestOtp(actor), error => error.status === 429 && error.code === 'OTP_COOLDOWN' && error.retryAfter > 0);
  assert.equal(sends, 1);
  const options = await service.getOptions(actor);
  assert.equal(options.challenge.challengeId, result.challengeId);
  assert.ok(!JSON.stringify(options).includes('hash') && !JSON.stringify(options).includes(actor.gmail));
  const wrongCredential = await service.getOptions({ ...actor, namePassword: 'changed-credential' });
  assert.equal(wrongCredential.challenge, undefined);
  await Challenge.updateOne({ userId: actor._id }, { $set: { sendCount: 5, windowStartedAt: new Date(Date.now() - 600000), sentAt: new Date(Date.now() - 120000) } });
  await assert.rejects(service.requestOtp(actor), error => error.code === 'OTP_HOURLY_LIMIT' && error.retryAfter > 2900 && error.retryAfter <= 3000);
  const limitedOptions = await service.getOptions(actor);
  assert.equal(limitedOptions.code, 'OTP_HOURLY_LIMIT');
  assert.equal(limitedOptions.challenge.challengeId, result.challengeId);
  assert.equal(sends, 1);
  await Challenge.updateOne({ userId: actor._id }, { $set: { windowStartedAt: new Date(Date.now() - 3600001) } });
  await service.requestOtp(actor);
  assert.equal((await Challenge.findOne({ userId: actor._id }).lean()).sendCount, 1);
  await Challenge.updateOne({ userId: actor._id }, { $set: { sentAt: new Date(Date.now() - 61000) } });
  fail = true;
  const logs = [], originalWarn = console.warn;
  console.warn = (...args) => logs.push(args);
  try { await assert.rejects(service.requestOtp(actor), error => error.status === 503 && error.code === 'OTP_MAIL_AUTH_FAILED' && error.retryAfter > 0); }
  finally { console.warn = originalWarn; }
  const failed = await Challenge.findOne({ userId: actor._id }).lean();
  assert.equal(failed.ready, false);
  assert.equal(failed.consumed, true);
  assert.equal(failed.hash, undefined);
  assert.equal((await service.getOptions(actor)).challenge, undefined);
  assert.ok(JSON.stringify(logs).includes('EAUTH'));
  assert.ok(!JSON.stringify(logs).includes('123456') && !JSON.stringify(logs).includes('@'));
  fail = false;
  const otherActor = { ...actor, _id: new mongoose.Types.ObjectId() };
  const concurrent = await Promise.allSettled([service.requestOtp(otherActor), service.requestOtp(otherActor)]);
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(concurrent.find(result => result.status === 'rejected').reason.status, 429);
  assert.equal((await Challenge.findOne({ userId: otherActor._id }).lean()).sendCount, 1);
});

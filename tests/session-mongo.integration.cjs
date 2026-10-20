const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { MongoClient } = require('mongodb');
const createSessionConfig = require('../config/session');

// Opt in with SESSION_TEST_MONGO_URL; only this test's random collection is created/dropped.
test('Mongo sessions survive a new store/client, expire, encrypt tokens and support deletion', { skip: !process.env.SESSION_TEST_MONGO_URL }, async () => {
  const uri = process.env.SESSION_TEST_MONGO_URL;
  const name = 'mediahz_session_test_' + randomBytes(12).toString('hex');
  const secret = randomBytes(32).toString('hex');
  let client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const buildStore = () => {
    const settings = createSessionConfig({ clientPromise: Promise.resolve(client), env: { SESSION_SECRET: secret }, collectionName: name });
    return settings.options.store;
  };
  const call = (store, method, ...args) => new Promise((resolve, reject) => store[method](...args, (error, value) => error ? reject(error) : resolve(value)));
  try {
    assert.equal(client.db().databaseName, 'MediaHz_Session_Test', 'Integration checks must use the dedicated test database');
    const first = buildStore();
    const value = { cookie: { expires: new Date(Date.now() + 7 * 86400000).toISOString(), originalMaxAge: 7 * 86400000 }, userLogin: { _id: 'test-user' }, authTokens: { refreshToken: 'PRIVATE_TEST_REFRESH_TOKEN' } };
    await call(first, 'set', 'test-session', value);
    const document = await client.db().collection(name).findOne({ _id: 'test-session' });
    assert(document); assert(!document.session.includes('PRIVATE_TEST_REFRESH_TOKEN'));
    assert(document.expires instanceof Date);
    assert((await client.db().collection(name).indexes()).some(index => index.key.expires === 1 && index.expireAfterSeconds === 0));
    await client.close();
    client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const second = buildStore();
    const restored = await call(second, 'get', 'test-session');
    assert.equal(restored.userLogin._id, 'test-user'); assert.equal(restored.authTokens.refreshToken, 'PRIVATE_TEST_REFRESH_TOKEN');
    await client.db().collection(name).updateOne({ _id: 'test-session' }, { $set: { expires: new Date(Date.now() - 1000) } });
    assert.equal(await call(second, 'get', 'test-session'), null);
    await call(second, 'set', 'test-session', value); await call(second, 'destroy', 'test-session');
    assert.equal(await call(second, 'get', 'test-session'), null);
  } finally {
    if (!/^mediahz_session_test_[a-f0-9]{24}$/.test(name)) throw new Error('Unsafe cleanup target');
    try {
      if (client.db().databaseName === 'MediaHz_Session_Test') await client.db().collection(name).drop().catch(error => { if (error.code !== 26) throw error; });
    } finally { await client.close(); }
  }
});

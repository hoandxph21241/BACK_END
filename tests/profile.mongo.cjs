const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { fixture, load } = require('./helpers/profile-fixture.cjs');

test('legacy account saves new profile fields in isolated MongoDB', { skip: !process.env.PROFILE_TEST_MONGO_URL }, async t => {
  const mongoose = require('mongoose');
  const dbName = `MediaHz_Profile_Test_${randomBytes(12).toString('hex')}`;
  const connection = await mongoose.createConnection(process.env.PROFILE_TEST_MONGO_URL, { dbName, serverSelectionTimeoutMS: 5000 }).asPromise();
  t.after(async () => {
    // This exact random test database is the only cleanup target.
    if (connection.name === dbName && /^MediaHz_Profile_Test_[a-f0-9]{24}$/.test(dbName)) await connection.dropDatabase();
    await connection.close();
  });
  const { UserModel } = load('model/db_song.js', { './db': { mongoose: { Schema: mongoose.Schema, model: connection.model.bind(connection) } } });
  await UserModel.init();
  const legacy = {
    _id: new mongoose.Types.ObjectId(), userID: 'legacy-profile-test', nameAccount: 'legacy-profile-test',
    namePassword: 'unchanged-password', gmail: 'private@example.test', role: 1,
    profileTag: 'hz231', bannerImage: '/users/profile-images/existing-banner',
  };
  await UserModel.collection.insertOne(legacy);
  const { app, state, controller } = fixture({ model: UserModel });
  state.user = legacy;
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const form = new FormData();
  for (const [key, value] of Object.entries({ fullName: 'Hz Dev', profileTag: '#hz231', firstName: 'Huy', lastName: '', city: 'Hà Nội', country: 'Việt Nam', bio: 'Music', links: '[{"label":"Website","url":"https://example.test/music"}]', role: '2', gmail: 'other@example.test' })) form.set(key, value);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/users/profile/edit`, { method: 'POST', body: form, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  const stored = await UserModel.findById(legacy._id).lean();
  assert.equal(stored.city, 'Hà Nội');
  assert.equal(stored.firstName, 'Huy');
  assert.equal(stored.lastName, '');
  assert.equal(stored.links[0].url, 'https://example.test/music');
  assert.equal(stored.bannerImage, legacy.bannerImage);
  assert.equal(stored.namePassword, legacy.namePassword);
  assert.equal(stored.gmail, legacy.gmail);
  assert.equal(stored.role, 1);
  const req = { session: { userLogin: { _id: legacy._id } } };
  let view;
  const res = { status() { return this; }, render(template, locals) { view = locals; return this; } };
  await controller.getEditProfile(req, res);
  assert.equal(view.user.city, 'Hà Nội');
  assert.equal(view.editOpen, true);
  assert.equal(req.session.userLogin.namePassword, undefined);
});

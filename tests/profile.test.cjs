const test = require('node:test');
const assert = require('node:assert/strict');
const { parseProfileForm, isWebLink } = require('../utils/profileFields');
const { fixture, load } = require('./helpers/profile-fixture.cjs');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const vm = require('node:vm');
const base = { fullName: ' Hz Dev ', profileTag: '#HZ231' };

test('old accounts can save with all optional information absent', () => {
  assert.deepEqual(parseProfileForm(base), { fullName: 'Hz Dev', profileTag: 'hz231' });
  assert.throws(() => parseProfileForm({ ...base, fullName: ' ' }), /Display name/);
});
test('new fields accept Unicode, normalize whitespace and can be cleared', () => {
  const value = parseProfileForm({ ...base, firstName: ' Huy ', lastName: '', city: ' Hà Nội ', country: ' Việt Nam ', bio: '', links: '[]' });
  assert.equal(value.city, 'Hà Nội');
  assert.equal(value.firstName, 'Huy');
  assert.equal(value.lastName, '');
  assert.deepEqual(value.links, []);
});
test('profile mutations cannot change credentials, email, role or tokens', () => {
  const value = parseProfileForm({ ...base, gmail: 'attacker@example.test', namePassword: 'bad', role: 2, authVersion: 99, refreshTokens: [] });
  assert.deepEqual(Object.keys(value).sort(), ['fullName', 'profileTag']);
});
test('bounded optional fields and typed values reject malformed input', () => {
  for (const [field, value] of [['firstName', 'x'.repeat(61)], ['city', 'x'.repeat(81)], ['bio', 'x'.repeat(501)], ['country', ['a', 'b']]]) {
    assert.throws(() => parseProfileForm({ ...base, [field]: value }));
  }
  assert.throws(() => parseProfileForm({ ...base, profileTag: '#other' }));
});
test('links are bounded, validated, unique and cannot contain active URL schemes', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', '//example.test', 'https://user:secret@example.test', 'not a URL']) {
    assert.equal(isWebLink(url), false);
    assert.throws(() => parseProfileForm({ ...base, links: JSON.stringify([{ url }]) }));
  }
  assert.throws(() => parseProfileForm({ ...base, links: '{' }));
  assert.throws(() => parseProfileForm({ ...base, links: [{ url: 'https://example.test' }, { url: 'https://example.test' }] }));
  assert.throws(() => parseProfileForm({ ...base, links: Array.from({ length: 6 }, (_, n) => ({ url: `https://example.test/${n}` })) }));
  assert.equal(parseProfileForm({ ...base, links: [{ label: ' Web ', url: 'https://example.test' }] }).links[0].label, 'Web');
});
test('Mongoose schema supports legacy documents and persists optional fields', async () => {
  const mongoose = require('mongoose'), connection = mongoose.createConnection();
  const { UserModel } = load('model/db_song.js', { './db': { mongoose: { Schema: mongoose.Schema, model: connection.model.bind(connection) } } });
  const user = new UserModel({ userID: 'test', nameAccount: 'test', namePassword: 'test' });
  assert.equal(user.city, '');
  assert.equal(user.firstName, '');
  assert.deepEqual(user.links.toObject(), []);
  await user.validate();
  user.links = [{ url: 'javascript:bad()' }];
  await assert.rejects(user.validate());
  await connection.close();
});
test('profile rendering escapes display values and leaves missing fields blank', () => {
  const { render } = fixture();
  const html = render({ profileTag: 'hz231', fullName: '<img src=x onerror=bad()>', links: [{ label: '<script>bad()</script>', url: 'https://example.test' }] }, true);
  assert.ok(html.includes('&lt;img src=x onerror=bad()&gt;'));
  assert.ok(!html.includes('<script>bad()</script>'));
  assert.match(html, /name="firstName" value=""/);
  assert.match(html, /name="country" value=""/);
});
test('profile copy is English and empty file hints are hidden', () => {
  const { render } = fixture();
  const html = render({ profileTag: 'hz231' }).replace(/<!--[\s\S]*?-->/g, '');
  assert.match(html, /id="editProfileButton"[^>]*>[\s\S]*?Edit Profile<\/button>/);
  assert.ok(html.includes('Display name') && html.includes('Your links') && html.includes('Save changes'));
  assert.ok(!html.includes('Chưa chọn ảnh') && !html.includes('Chỉnh sửa hồ sơ'));
  assert.match(html, /id="profileAvatarFileName"[^>]*hidden><\/span>/);
  assert.match(html, /id="profileBannerFileName"[^>]*hidden><\/span>/);
});
test('Home renders skeleton before JavaScript for direct profile and edit routes', async () => {
  const file = path.resolve(__dirname, '../views/home/Home.ejs');
  for (const initialView of ['/users/profile', '/users/profile/edit', '/home/ct_home_v2']) {
    const html = await ejs.renderFile(file, { user: null, mp3List: [], initialView });
    const main = /<main id="main">([\s\S]*?)<\/main>/.exec(html)[1];
    assert.equal(main.includes('data-profile-loading'), initialView.startsWith('/users/profile'));
    assert.ok(html.includes('id="profileLoadingTemplate"'));
    assert.ok(html.includes('/stylesheets/CSS_User/profile_user.css'));
    for (const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
  }
});
test('API profile uses the same link validation and exposes the additional fields', () => {
  const validator = require('../modules/user/validator/ProfileValidator');
  const mapper = require('../modules/user/mapper/UserMapper');
  assert.ok(!validator.update.validate({ city: '', firstName: 'Huy', links: [] }).error);
  assert.ok(validator.update.validate({ links: [{ url: 'javascript:bad()' }] }).error);
  assert.equal(mapper.profile({ city: 'Hà Nội' }).city, 'Hà Nội');
  assert.deepEqual(mapper.profile({}).links, []);
});
test('multipart saves all fields, preserves images and does not leak private data', async t => {
  const { app, state } = fixture();
  state.user.bannerImage = '/users/profile-images/old-banner';
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, bio: 'Hi', firstName: 'Huy', lastName: '', city: 'Hà Nội', country: 'Việt Nam', links: JSON.stringify([{ label: 'Website', url: 'https://example.test' }]) })) form.set(key, value);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNgoAAAAASUVORK5CYII=', 'base64');
  form.set('avatar', new Blob([png], { type: 'image/png' }), 'avatar.png');
  form.set('banner', new Blob([png], { type: 'image/png' }), 'banner.png');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/users/profile/edit`, { method: 'POST', body: form, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.user.city, 'Hà Nội');
  assert.equal(data.user.bannerImage, '/users/profile-images/old-banner');
  assert.equal(data.user.links[0].label, 'Website');
  assert.equal(state.writes, 1);
  assert.equal(state.uploads, 2);
  assert.ok(!JSON.stringify(data).includes('not-public'));
  assert.equal(data.user.gmail, undefined);
});

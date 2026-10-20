const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const express = require('express');
const ejs = require('ejs');
const root = path.resolve(__dirname, '../..');

function load(relative, mocks) {
  const filename = path.join(root, relative), module = { exports: {} };
  const localRequire = id => Object.hasOwn(mocks, id) ? mocks[id] :
    require(id.startsWith('.') ? path.resolve(path.dirname(filename), id) : id);
  vm.compileFunction(fs.readFileSync(filename, 'utf8'), ['require', 'module', 'exports'], { filename })(localRequire, module, module.exports);
  return module.exports;
}

function fixture({ model } = {}) {
  const state = {
    user: { _id: '0123456789abcdef01234567', userID: 'profile-test', nameAccount: 'test',
      profileTag: 'hz231', gmail: 'private@example.test', namePassword: 'not-public',
      refreshTokens: [{ token: 'not-public' }], role: 1 },
    writes: 0, uploads: 0, fail: false,
  };
  const controller = load('controllers/CTL_user.js', {
    '../model/db_song': { UserModel: model || {
      findById() { return { lean: async () => ({ ...state.user }) }; },
      async findByIdAndUpdate(id, update) {
        if (state.delayMs) await new Promise(resolve => setTimeout(resolve, state.delayMs));
        if (state.fail) throw new Error('Không thể lưu hồ sơ thử nghiệm.');
        state.writes++;
        Object.assign(state.user, update.$set);
        return { ...state.user };
      },
    } },
    '../utils/profileImages': {
      async saveProfileImages(files) {
        state.uploads += Object.values(files || {}).flat().length;
        return { fileIds: [], changes: {} };
      },
      async cleanup() {}, async cleanupReplacedImages() {},
    },
  });
  const app = express();
  app.use((req, res, next) => {
    req.session = { userLogin: { _id: state.user._id }, save: done => done() };
    next();
  });
  app.post('/users/profile/edit', require('../../middlewares/upload/uploadProfileImages'), controller.postEditProfile);
  app.use('/stylesheets', express.static(path.join(root, 'public/stylesheets')));
  app.use('/javascripts', express.static(path.join(root, 'public/javascripts')));
  app.use('/images', express.static(path.join(root, 'public/images')));
  function render(user = state.user, editOpen = false) {
    return ejs.render(fs.readFileSync(path.join(root, 'views/user/profile.ejs'), 'utf8'), { user, editOpen, message: '' });
  }
  return { app, state, render, controller };
}

module.exports = { fixture, load };

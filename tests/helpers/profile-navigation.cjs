const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const root = path.resolve(__dirname, '../..');

async function navigationChecks(cdp, check, screenshots) {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(predicate) {
    for (let n = 0; n < 120; n++) { if (predicate()) return; await pause(25); }
    throw new Error('Timed out waiting for profile navigation');
  }
  const controls = changes => fetch('/profile-nav-test/control', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
  }).then(response => response.json());
  const main = document.getElementById('main');
  const nav = document.getElementById('profileNavBar'), media = document.getElementById('mediaPlayerFrame');
  const loading = () => main.querySelector('[data-profile-loading]');
  const loaded = () => main.querySelector('[data-profile-view]');
  await until(loading);
  check(main.getAttribute('aria-busy') === 'true', 'profile loading sets aria-busy');
  check(!loading().querySelector('button, input, a'), 'profile skeleton has no active controls');
  check(loading().querySelector('[role="status"]').textContent === 'Loading profile...', 'profile loading status is English');
  for (const width of [1280, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await pause(250);
    check(document.documentElement.scrollWidth <= innerWidth + 1, `profile skeleton fits ${width}`);
    check(loading().querySelector('.profile-header').getBoundingClientRect().height === (width <= 600 ? 300 : 320), `profile skeleton banner size ${width}`);
    const result = await cdp('Page.captureScreenshot', { format: 'png' });
    screenshots.push({ name: `profile-skeleton-${width}.png`, data: result.data });
  }
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check(getComputedStyle(loading().querySelector('.profile-skeleton-block')).animationName === 'none', 'profile skeleton respects reduced motion');
  const bannerBounds = loading().querySelector('.profile-header').getBoundingClientRect();
  const avatarBounds = loading().querySelector('.profile-avatar').getBoundingClientRect();
  const mainHeight = main.getBoundingClientRect().height;
  await controls({ hold: false });
  await until(() => loaded()?.dataset.initialized && !main.hasAttribute('aria-busy'));
  check(!loading(), 'profile data replaces skeleton');
  const realBanner = loaded().querySelector('.profile-header').getBoundingClientRect();
  const realAvatar = loaded().querySelector('.profile-avatar').getBoundingClientRect();
  check(realBanner.top === bannerBounds.top && realBanner.height === bannerBounds.height &&
    realAvatar.top === avatarBounds.top && realAvatar.width === avatarBounds.width, 'profile header and avatar stay in place');
  check(main.getBoundingClientRect().height >= mainHeight, 'profile loading keeps reserved page height');
  const before = (await controls({ hold: true })).requests;
  const pending = window.navigateMediaHz('/users/profile', false, { refresh: true });
  await until(loading);
  await window.navigateMediaHz('/users/profile', false, { refresh: true });
  await pause(100);
  check((await controls({})).requests === before + 1, 'duplicate profile navigation sends one request');
  await window.navigateMediaHz('/home/ct_home_v2', true);
  await pending;
  await controls({ hold: false });
  await pause(100);
  check(main.querySelector('[data-other-view]') && !loading() && !loaded(), 'aborted profile cannot overwrite another tab');
  check(!main.classList.contains('profile-page-active') && main.style.minHeight === '', 'another tab releases profile height');
  await controls({ fail: true });
  await window.navigateMediaHz('/users/profile', true);
  check(document.getElementById('retryTabBtn') && !loading() && !main.hasAttribute('aria-busy'), 'profile error clears skeleton and offers retry');
  await controls({ fail: false });
  document.getElementById('retryTabBtn').click();
  await until(() => loaded()?.dataset.initialized && !main.hasAttribute('aria-busy'));
  check(Boolean(loaded()), 'retry restores profile');
  await controls({ slowImage: true });
  const slowRequest = window.navigateMediaHz('/users/profile', false, { refresh: true });
  await until(loading);
  await pause(200);
  check(Boolean(loading()), 'profile skeleton covers slow image loading');
  await window.navigateMediaHz('/home/ct_home_v2', true);
  await slowRequest;
  check(Boolean(main.querySelector('[data-other-view]')), 'switching tabs cancels profile image wait');
  const startedAt = performance.now();
  await window.navigateMediaHz('/users/profile', true);
  check(loaded() && performance.now() - startedAt < 2600, 'slow avatar does not block profile indefinitely');
  await controls({ slowImage: false, hold: true });
  const editRequest = window.navigateMediaHz('/users/profile/edit', true);
  check(Boolean(loading()), 'profile edit route also shows skeleton');
  await controls({ hold: false });
  await editRequest;
  check(document.getElementById('profileEditDialog').open, 'profile edit dialog opens after loading');
  check(document.getElementById('profileNavBar') === nav && document.getElementById('mediaPlayerFrame') === media, 'profile navigation preserves nav and mediabar');
  await cdp('Emulation.setEmulatedMedia', { features: [] });
}

function installProfileNavigation(app, render) {
  const source = fs.readFileSync(path.join(root, 'views/home/Home.ejs'), 'utf8');
  const start = source.indexOf('        // Keep the application shell mounted; only replace the tab content.');
  const end = source.indexOf('        // Previous per-link bindings', start);
  if (start === -1 || end === -1) throw new Error('Home navigation test markers not found');
  const navigation = source.slice(start, end);
  const skeleton = fs.readFileSync(path.join(root, 'views/user/_profile_skeleton.ejs'), 'utf8');
  const state = { hold: true, fail: false, slowImage: false, requests: 0 };
  const waiting = [];
  function send(req, res) {
    if (res.destroyed) return;
    if (state.fail) return res.status(500).send('Test profile unavailable');
    return res.send(render({ profileTag: 'hz231', fullName: 'Hz Dev', bio: 'Music and moments.',
      imageAccount: state.slowImage ? '/profile-nav-test/slow-image' : '',
    }, req.path.endsWith('/edit')));
  }
  app.get(['/users/profile', '/users/profile/edit'], (req, res) => {
    state.requests++;
    if (state.hold) waiting.push({ req, res }); else send(req, res);
  });
  app.get('/home/ct_home_v2', (req, res) => res.send('<section data-other-view>Feed</section>'));
  app.get('/profile-nav-test/slow-image', (req, res) => { /* Deliberately waits until the test closes this connection. */ });
  app.post('/profile-nav-test/control', express.json(), (req, res) => {
    for (const key of ['hold', 'fail', 'slowImage']) if (typeof req.body[key] === 'boolean') state[key] = req.body[key];
    if (!state.hold) waiting.splice(0).forEach(job => send(job.req, job.res));
    res.json(state);
  });
  app.get('/profile-nav-test/page', (req, res) => res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/stylesheets/CSS_User/profile_user.css"><style>body{margin:0;background:#000;color:#eee;font-family:Arial,sans-serif}#profileNavBar{height:48px;background:#101010}#main{max-width:1240px;margin:auto}#mediaPlayerFrame{position:fixed;bottom:0;border:0;width:100%;height:48px;background:#303030}</style></head><body><nav id="profileNavBar"></nav><template id="profileLoadingTemplate">${skeleton}</template><main id="main">${skeleton}</main><iframe id="mediaPlayerFrame" title="Mediabar"></iframe><script src="/javascripts/user_profile.js"></script><script>
  const axios = { async get(url, options) {
    const response = await fetch(url, { headers: options.headers, signal: options.signal });
    const data = await response.text();
    if (!response.ok) { const error = new Error('Navigation test request failed'); error.response = { status: response.status, data }; throw error; }
    return { data };
  } };
  function initializeDynamicContent() { window.initProfileView(); }
  function updateIndicatorPosition() {}
  ${navigation}
  window.navigateMediaHz = loadPage;
  window.runProfileNavigationChecks = ${navigationChecks.toString()};
  loadPage('/users/profile');
  </script></body></html>`));
}

module.exports = { installProfileNavigation };

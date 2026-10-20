const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { fixture } = require('./helpers/profile-fixture.cjs');
const { installProfileNavigation } = require('./helpers/profile-navigation.cjs');
const { installOtpBrowser } = require('./helpers/password-otp-browser.cjs');

async function browserChecks() {
  const results = [], screenshots = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(predicate) {
    for (let n = 0; n < 120; n++) { if (predicate()) return; await pause(25); }
    throw new Error('Timed out waiting for UI');
  }
  try {
    await until(() => document.querySelector('[data-profile-view]')?.dataset.initialized);
    const { webSocketDebuggerUrl } = await (await fetch('/target')).json();
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    ws.onmessage = event => {
      const message = JSON.parse(event.data), job = pending.get(message.id);
      if (!job) return;
      pending.delete(message.id);
      if (message.error) job.reject(new Error(JSON.stringify(message.error))); else job.resolve(message.result);
    };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const find = id => document.getElementById(id);
    const value = (id, text) => { find(id).value = text; find(id).dispatchEvent(new Event('input', { bubbles: true })); };
    const open = () => find('editProfileButton').click();
    const dialog = () => find('profileEditDialog');
    const main = find('main'), media = find('mediaPlayerFrame');
    check(dialog().open, 'direct edit opens dialog');
    check(find('profileFirstNameInput').value === '' && find('profileCountryInput').value === '', 'missing fields are blank');
    check(find('profileSaveButton').disabled, 'unchanged save disabled');
    check(find('editProfileButton').textContent.trim() === 'Edit Profile' && find('profileEditTitle').textContent === 'Edit Profile', 'Edit Profile labels are English');
    check(find('profileAvatarFileName').hidden && find('profileBannerFileName').hidden && !dialog().innerText.includes('Chưa chọn ảnh'), 'no empty image hint');
    const originalClick = HTMLInputElement.prototype.click;
    let fileClicks = 0;
    HTMLInputElement.prototype.click = function () { if (this.type === 'file') fileClicks++; else originalClick.call(this); };
    document.querySelector('.profile-avatar-field').click();
    check(fileClicks === 0, 'avatar row does not open file picker');
    document.querySelector('[data-profile-file-target="profileAvatarFile"]').click();
    check(fileClicks === 1, 'avatar button opens file picker');
    HTMLInputElement.prototype.click = originalClick;
    value('profileFirstNameInput', 'Unsaved');
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNgoAAAAASUVORK5CYII='), c => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([png], 'avatar.png', { type: 'image/png' }));
    find('profileAvatarFile').files = transfer.files;
    find('profileAvatarFile').dispatchEvent(new Event('change', { bubbles: true }));
    check(find('profileAvatarPreview').src.startsWith('blob:'), 'image preview rendered');
    check(!find('profileAvatarFileName').hidden && find('profileAvatarFileName').textContent === 'avatar.png', 'selected filename remains available');
    document.querySelector('.profile-cancel').click();
    await until(() => !dialog().open);
    await pause(50);
    open();
    check(find('profileFirstNameInput').value === '' && find('profileAvatarFile').files.length === 0, 'cancel restores fields and file');
    check(find('profileAvatarFileName').hidden && find('profileAvatarFileName').textContent === '', 'cancel hides selected filename');
    find('profileAddLink').click();
    let row = document.querySelector('.profile-link-row');
    const setLink = (key, text) => { const input = row.querySelector(`.profile-link-${key}`); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); };
    setLink('url', 'javascript:bad()');
    check(!row.querySelector('.profile-link-url').checkValidity(), 'unsafe link rejected before submission');
    setLink('url', 'https://example.test/music');
    setLink('label', 'My music');
    for (let n = 0; n < 4; n++) find('profileAddLink').click();
    check(find('profileAddLink').disabled && document.querySelectorAll('.profile-link-row').length === 5, 'link limit enforced');
    Array.from(document.querySelectorAll('.profile-link-row')).slice(1).forEach(item => item.querySelector('button').click());
    check(!find('profileAddLink').disabled, 'delete link restores add button');
    value('profileFullNameInput', 'Hz Dev');
    value('profileFirstNameInput', 'Huy');
    value('profileLastNameInput', 'Dao');
    value('profileCityInput', 'Hà Nội');
    value('profileCountryInput', 'Việt Nam');
    value('profileBioInput', 'Âm nhạc và những khoảnh khắc.');
    await fetch('/test-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: true }) });
    find('profileSaveButton').click();
    await until(() => !find('profileFormError').hidden);
    check(dialog().open && find('profileCityInput').value === 'Hà Nội', 'failed save preserves edit values');
    await fetch('/test-state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fail: false }) });
    window.initProfileView();
    find('profileSaveButton').click();
    find('profileEditForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    check(find('profileFullNameInput').disabled, 'pending save locks controls');
    await until(() => !dialog().open);
    const state = await (await fetch('/test-state')).json();
    check(state.writes === 1, 'single write despite duplicate submit');
    check(find('profileLocation').textContent === 'Hà Nội, Việt Nam', 'saved location updates without page reload');
    check(find('profileLinks').textContent.includes('My music'), 'saved link updates without page reload');
    check(find('main') === main && find('mediaPlayerFrame') === media, 'main shell and mediabar remain mounted');
    main.innerHTML = await (await fetch('/partial')).text();
    window.initProfileView();
    open();
    check(find('profileCityInput').value === 'Hà Nội', 'reloaded profile keeps saved fields');
    for (const width of [1280, 390]) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await pause(300);
      document.querySelector('.profile-form-body').scrollTop = 0;
      check(document.documentElement.scrollWidth <= innerWidth + 1, `no page overflow ${width}`);
      const bounds = dialog().getBoundingClientRect();
      check(bounds.left >= 0 && bounds.right <= innerWidth + 1, `dialog fits ${width}`);
      check(Array.from(dialog().querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea')).every(input => {
        const rect = input.getBoundingClientRect();
        return rect.left >= bounds.left && rect.right <= bounds.right;
      }), `fields fit ${width}`);
      const result = await cdp('Page.captureScreenshot', { format: 'png' });
      screenshots.push({ name: `profile-${width}.png`, data: result.data });
    }
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 2, y: 2, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 2, y: 2, button: 'left', clickCount: 1 });
    await until(() => !dialog().open);
    check(!dialog().open, 'backdrop click closes dialog');
    open();
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until(() => !dialog().open);
    check(!dialog().open, 'Escape closes dialog');
    const navigationFrame = document.createElement('iframe');
    navigationFrame.title = 'Profile navigation test';
    navigationFrame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10000;background:#000';
    navigationFrame.src = '/profile-nav-test/page';
    document.body.append(navigationFrame);
    await until(() => typeof navigationFrame.contentWindow.runProfileNavigationChecks === 'function');
    await navigationFrame.contentWindow.runProfileNavigationChecks(cdp, check, screenshots);
    navigationFrame.remove();
    const otpFrame = document.createElement('iframe');
    otpFrame.title = 'OTP cooldown test';
    otpFrame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10000;background:#000';
    otpFrame.src = '/otp-test/page';
    document.body.append(otpFrame);
    await until(() => typeof otpFrame.contentWindow.runOtpBrowserChecks === 'function');
    await otpFrame.contentWindow.runOtpBrowserChecks(cdp, check, screenshots);
    otpFrame.remove();
    ws.close();
    await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, screenshots }) });
  } catch (error) {
    await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, error: error.stack }) });
  }
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mediahz-profile-'));
  const { app, state, render } = fixture();
  installProfileNavigation(app, render);
  installOtpBrowser(app);
  state.delayMs = 120;
  const probe = net.createServer().listen(0, '127.0.0.1');
  await new Promise(resolve => probe.once('listening', resolve));
  const debugPort = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  let resolveResult;
  const completed = new Promise(resolve => { resolveResult = resolve; });
  const express = require('express');
  app.get('/', (req, res) => res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#000;font-family:Arial,sans-serif}#main{max-width:1240px;margin:0 auto}#mediaPlayerFrame{position:fixed;bottom:0;border:0;width:100%;height:48px;background:#303030}</style></head><body><main id="main">${render(state.user, true)}</main><iframe id="mediaPlayerFrame" title="Mediabar"></iframe><script src="/javascripts/user_profile.js"></script><script>(${browserChecks.toString()})()</script></body></html>`));
  app.get('/partial', (req, res) => res.send(render()));
  app.get('/target', async (req, res) => {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    res.json(targets.find(target => target.type === 'page'));
  });
  app.get('/test-state', (req, res) => res.json({ writes: state.writes }));
  app.post('/test-state', express.json(), (req, res) => { state.fail = Boolean(req.body.fail); res.json({ ok: true }); });
  app.post('/result', express.json({ limit: '8mb' }), (req, res) => { res.json({ ok: true }); resolveResult(req.body); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1280,900',
    `--remote-debugging-port=${debugPort}`, `--remote-allow-origins=${origin}`,
    `--user-data-dir=${path.join(directory, 'browser')}`, origin,
  ], { windowsHide: true, stdio: 'ignore' });
  let timeout;
  try {
    const result = await Promise.race([completed, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Browser test timed out')), 45000); })]);
    for (const screenshot of result.screenshots || []) fs.writeFileSync(path.join(directory, screenshot.name), Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ passed: result.results.length, results: result.results, error: result.error, screenshots: (result.screenshots || []).map(s => path.join(directory, s.name)) }, null, 2));
    if (result.error) process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
    edge.kill();
    server.closeAllConnections();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

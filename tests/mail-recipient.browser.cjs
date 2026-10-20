const express = require('express');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

// Optional Windows browser check: node tests/mail-recipient.browser.cjs. No real database or accounts.
const app = express(), a = { id: 'a'.repeat(24), name: 'MediaHz Test', tag: 'hz100' };
const b = { id: 'b'.repeat(24), name: 'Nguy\u1ec5n Minh', tag: 'hz246754', avatar: '/missing-avatar.jpg' };
const c = { id: 'c'.repeat(24), name: 'Tr\u1ea7n An', tag: 'hz456789', avatar: '/images/auth/person-circle.svg' };
const unsafe = { id: 'd'.repeat(24), name: '<img src=x onerror=window.injected=true>', tag: 'hz999' };
let debugPort, complete;
const done = new Promise(resolve => { complete = resolve; }), searches = [], sent = [];
const original = { id: '1'.repeat(24), kind: 'message', sender: b, recipient: a, subject: 'Test subject', body: 'Test body', preview: 'Test body', unread: true, createdAt: new Date().toISOString() };
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.get('/target', async (req, res) => res.json((await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json()).find(target => target.type === 'page')));
app.post('/result', (req, res) => { res.json({ ok: true }); complete(req.body); });
app.get('/state', (req, res) => res.json({ searches, sent }));
app.get('/api/mail/unread-count', (req, res) => res.json({ success: true, data: { unread: 1 } }));
app.get('/api/mail/recipients', async (req, res) => {
  const q = req.query.q; searches.push(q);
  await new Promise(resolve => setTimeout(resolve, q === 'slow' ? 650 : 40));
  if (q === 'error') return res.status(500).json({ success: false, message: 'Test failure' });
  const items = q === 'none' ? [] : q === 'Nguyen' ? [b, c] : q === 'fast' ? [c] : q === 'unsafe' ? [unsafe] : [b];
  res.json({ success: true, data: { items } });
});
app.get('/api/mail', (req, res) => res.json({ success: true, data: { items: [original], hasMore: false, page: 1, unread: 1 } }));
app.get('/api/mail/:id', (req, res) => res.json({ success: true, data: original }));
app.post('/api/mail', async (req, res) => {
  sent.push(req.body); await new Promise(resolve => setTimeout(resolve, 100));
  res.json({ success: true, data: { ...original, ...req.body, sender: a, recipient: req.body.recipient === c.id ? c : b } });
});
app.get('/', (req, res) => res.type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/stylesheets/mail.css"><style>body{margin:0;background:#000;color:#fff;font:14px Arial,sans-serif}nav{height:50px;background:#101010;display:flex;align-items:center;gap:24px;padding:0 24px}#mail{margin-left:auto;background:none;color:#ffaa00;border:0;position:relative;width:32px;height:32px}main{padding:40px}iframe{position:fixed;bottom:0;left:0;width:100%;height:50px;border:0;background:#303030}</style></head><body><nav><strong>MediaHz</strong><span>Feed</span><span>Library</span><button id="mail" title="Mail">Mail</button></nav><main><h1>MediaHz</h1></main><iframe id="mediaPlayerFrame" src="about:blank"></iframe><script src="/javascripts/mail.js" data-mail-user="${a.id}"></script><script>(${browserTest.toString()})();</script></body></html>`));

async function browserTest() {
  const results = [], screenshots = {};
  let socket;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = selector => document.querySelector(selector);
  const click = selector => $(selector).click();
  const fill = (selector, value) => { const node = $(selector); node.value = value; node.dispatchEvent(new Event('input', { bubbles: true })); };
  const assert = (condition, message) => { if (!condition) throw new Error(message); results.push(message); };
  const wait = async test => { for (let i = 0; i < 120; i++) { if (test()) return; await sleep(30); } throw new Error('Timed out: ' + test.toString()); };
  const state = async () => (await fetch('/state')).json();
  try {
    const target = await (await fetch('/target')).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0; const pending = new Map();
    socket.onmessage = event => { const message = JSON.parse(event.data), entry = pending.get(message.id); if (!entry) return; pending.delete(message.id); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const resize = async width => { await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 }); await sleep(300); };
    const key = async value => { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code: value, windowsVirtualKeyCode: { Escape: 27, Enter: 13, ArrowDown: 40 }[value] }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code: value }); };
    const shot = async name => { await sleep(220); screenshots[name] = (await cdp('Page.captureScreenshot', { format: 'png' })).data; };
    const mouse = async selector => { const r = $(selector).getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
    const selected = name => !$('.mail-recipient-selected').hidden && $('.mail-recipient-selected').textContent.includes(name);
    const hasResults = () => !$('.mail-recipient-popover').hidden && $('.mail-recipient-option');
    const openCompose = async () => { click('#mail'); await wait(() => $('.mail-row')); click('[title="Soạn thư"]'); };
    await resize(1280); await openCompose();
    fill('#mailRecipient', 'h'); await sleep(400);
    assert((await state()).searches.length === 0 && $('.mail-recipient-popover').hidden, 'Short queries do not call search');
    for (const value of ['#h', '#hz', '#hz2', '#hz246754']) { fill('#mailRecipient', value); await sleep(60); }
    await wait(hasResults);
    assert((await state()).searches.length === 1, 'Rapid typing is debounced');
    assert($('.mail-recipient-option').textContent.includes('#hz246754') && $('#mailRecipient').getAttribute('aria-expanded') === 'true', 'Suggestions show public identity');
    await shot('suggestions-desktop');
    await mouse('.mail-recipient-option'); await wait(() => selected('#hz246754'));
    await wait(() => $('.mail-recipient-selected img').src.endsWith('/images/auth/person-circle.svg'));
    assert($('#mailRecipient').hidden && selected('Minh'), 'Mouse selection shows recipient chip and avatar fallback');
    fill('#mailSubject', 'Test subject'); fill('#mailBody', 'Test message body'); await shot('selected-desktop');
    $('[data-mail-form]').requestSubmit(); await wait(() => $('[data-mail-status]').classList.contains('is-success'));
    assert((await state()).sent[0].recipient === 'bbbbbbbbbbbbbbbbbbbbbbbb', 'Sending uses selected user ID, not typed query');
    click('[data-mail-reply]');
    assert(selected('#hz246754') && $('#mailSubject').value.startsWith('Re:'), 'Replies preselect public identity');
    fill('#mailBody', 'Keep this draft'); click('[title="Thay đổi người nhận"]');
    assert(!$('#mailRecipient').hidden && !$('#mailRecipient').value && $('#mailBody').value === 'Keep this draft', 'Changing recipient preserves draft');
    fill('#mailRecipient', 'Nguyen'); await wait(() => document.querySelectorAll('.mail-recipient-option').length === 2);
    await key('ArrowDown'); await key('Enter');
    assert(selected('#hz456789') && (await state()).sent.length === 1, 'Keyboard selects without sending');
    click('[title="Thay đổi người nhận"]'); fill('#mailRecipient', 'slow'); await sleep(380); fill('#mailRecipient', 'fast');
    await wait(() => hasResults() && $('.mail-recipient-option').textContent.includes('#hz456789')); await sleep(600);
    assert(!$('.mail-recipient-option').textContent.includes('#hz246754'), 'Late responses do not overwrite newer search');
    fill('#mailRecipient', 'none'); await wait(() => $('.mail-recipient-status').textContent.includes('Không tìm thấy'));
    $('[data-mail-form]').requestSubmit(); await sleep(100);
    assert((await state()).sent.length === 1 && $('.mail-dialog').open, 'Unselected text cannot be sent');
    fill('#mailRecipient', 'error'); await wait(() => $('.mail-recipient-status').textContent.includes('Không thể'));
    fill('#mailRecipient', 'unsafe'); await wait(hasResults);
    assert($('.mail-recipient-option').textContent.includes('<img') && !$('.mail-recipient-option strong img') && !window.injected, 'Suggestion names cannot inject HTML');
    await key('Escape'); assert($('.mail-recipient-popover').hidden && $('.mail-dialog').open, 'First Escape closes suggestions only');
    await key('Escape'); await wait(() => !$('.mail-dialog').open);
    await resize(390); await openCompose(); fill('#mailRecipient', '#hz246754'); await wait(hasResults);
    const r = $('.mail-recipient-popover').getBoundingClientRect();
    assert(innerWidth === 390 && r.width > 0 && r.left >= 0 && r.right <= innerWidth && r.bottom < innerHeight, 'Suggestions fit a true mobile viewport');
    await shot('suggestions-mobile');
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true });
    const option = $('.mail-recipient-option').getBoundingClientRect();
    await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: option.x + 40, y: option.y + 20 }] });
    await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(() => selected('#hz246754'));
    assert(selected('#hz246754'), 'Touch selects recipient'); await shot('selected-mobile');
    $('#mailKind').value = 'complaint'; $('#mailKind').dispatchEvent(new Event('change'));
    assert($('[data-mail-recipient]').hidden && $('#mailRecipient').disabled && $('.mail-recipient-popover').hidden, 'Support mail does not require recipient search');
    $('#mailKind').value = 'message'; $('#mailKind').dispatchEvent(new Event('change'));
    assert(selected('#hz246754'), 'Returning to direct mail retains recipient');
    click('[title="Thay đổi người nhận"]'); fill('#mailRecipient', 'slow'); await sleep(380);
    window.dispatchEvent(new CustomEvent('mediahz:authenticated', { detail: { user: { id: 'e'.repeat(24) } } })); await sleep(750);
    assert(!$('.mail-dialog').open && $('.mail-recipient-selected').hidden && $('.mail-recipient-popover').hidden && !$('.mail-recipient-option'), 'Account change clears selection and aborts pending search');
    assert($('#mediaPlayerFrame').isConnected, 'Media player remains mounted');
    await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, screenshots }) });
  } catch (error) {
    await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results, error: error.stack, screenshots }) });
  } finally { socket?.close(); }
}

(async () => {
  const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve)); debugPort = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const port = server.address().port, directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mediahz-recipient-'));
  const edge = spawn(process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + debugPort, '--remote-allow-origins=http://127.0.0.1:' + port, '--user-data-dir=' + path.join(directory, 'profile'), 'http://127.0.0.1:' + port], { windowsHide: true, stdio: 'ignore' });
  edge.once('error', error => complete({ error: error.message }));
  let timer;
  try {
    const result = await Promise.race([done, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Browser check timed out')), 45000); })]);
    const files = [];
    for (const [name, base64] of Object.entries(result.screenshots || {})) { const file = path.join(directory, name + '.png'); fs.writeFileSync(file, Buffer.from(base64, 'base64')); files.push(file); }
    console.log(JSON.stringify({ results: result.results, error: result.error, screenshots: files }, null, 2));
    if (result.error) process.exitCode = 1;
  } finally { clearTimeout(timer); edge.kill(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

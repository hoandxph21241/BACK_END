const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

async function otpBrowserChecks(cdp, check, screenshots) {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(predicate) {
    for (let n = 0; n < 100; n++) { if (predicate()) return; await pause(25); }
    throw new Error('Timed out waiting for OTP UI');
  }
  const find = selector => document.querySelector(selector);
  const send = () => find('[data-password-send-otp]');
  const control = changes => fetch('/otp-test/control', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
  }).then(response => response.json());
  async function remount() {
    document.getElementById('main').innerHTML = await (await fetch('/otp-test/partial')).text();
    await until(() => find('[data-password-destination]').textContent === 't***@example.com');
    document.getElementById('passwordMethodOtp').click();
  }
  await until(() => find('[data-password-destination]').textContent === 't***@example.com');
  document.getElementById('passwordMethodOtp').click();
  check(send().disabled && /\((29:|30:)/.test(send().textContent), 'OTP initial hourly countdown comes from server');
  check((await control({})).sends === 0, 'loading OTP settings never sends mail');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
  await pause(200);
  check(document.documentElement.scrollWidth <= innerWidth + 1, 'OTP hourly countdown fits mobile');
  screenshots.push({ name: 'otp-hourly-countdown.png', data: (await cdp('Page.captureScreenshot', { format: 'png' })).data });
  await control({ retryAfter: 0, active: true });
  await remount();
  check(!document.getElementById('passwordOtp').disabled, 'OTP input restores valid challenge after remount');
  check(find('[data-password-otp-status]').textContent.includes('Mã còn hiệu lực'), 'restored OTP expiry is visible');
  await control({ active: false, failure: 'hourly' });
  await remount();
  send().click();
  await until(() => !find('[data-password-status]').hidden);
  check(send().disabled && /\((29:|30:)/.test(send().textContent), 'OTP 429 keeps hourly wait instead of 60 seconds');
  const count = (await control({})).sends;
  send().click();
  await pause(100);
  check((await control({})).sends === count, 'disabled OTP resend does not send another request');
  await control({ failure: 'header' });
  await remount();
  send().click();
  await until(() => !find('[data-password-status]').hidden);
  check(/\((14:|15:)/.test(send().textContent), 'OTP UI honors Retry-After header without JSON delay');
  await control({ failure: 'smtp' });
  await remount();
  send().click();
  await until(() => !find('[data-password-status]').hidden);
  check(send().disabled && /\((44|45)s\)/.test(send().textContent), 'SMTP failure uses actual retry cooldown');
}

function installOtpBrowser(app) {
  const settings = fs.readFileSync(path.resolve(__dirname, '../../views/user/settings.ejs'), 'utf8');
  const state = { retryAfter: 1800, active: false, failure: 'hourly', sends: 0 };
  app.get('/api/auth/password/options', (req, res) => res.json({ success: true, data: {
    canUseEmail: true, email: 't***@example.com', retryAfter: state.retryAfter,
    ...(state.active ? { challenge: { challengeId: 'test-active-challenge', expiresAt: new Date(Date.now() + 240000).toISOString() } } : {}),
  } }));
  app.post('/api/auth/password/otp', (req, res) => {
    state.sends++;
    const delay = state.failure === 'smtp' ? 45 : state.failure === 'header' ? 900 : 1800;
    res.set('Retry-After', String(delay)).status(state.failure === 'smtp' ? 503 : 429).json({ success: false,
      message: state.failure === 'smtp' ? 'Không gửi được OTP. Vui lòng thử lại sau.' : 'Đã đạt giới hạn gửi OTP. Vui lòng chờ bộ đếm.',
      ...(state.failure === 'header' ? {} : { retryAfter: delay }),
    });
  });
  app.post('/otp-test/control', express.json(), (req, res) => {
    for (const key of ['retryAfter', 'active', 'failure']) if (req.body[key] !== undefined) state[key] = req.body[key];
    res.json(state);
  });
  app.get('/otp-test/partial', (req, res) => res.send(settings));
  app.get('/otp-test/page', (req, res) => res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/stylesheets/auth/password_settings.css"><style>body{margin:0;background:#000;color:#eee;font-family:Arial,sans-serif}#main{max-width:900px;margin:auto;padding:16px}</style></head><body><main id="main">${settings}</main><script src="/javascripts/auth/password_settings.js"></script><script>window.runOtpBrowserChecks=${otpBrowserChecks.toString()};</script></body></html>`));
}

module.exports = { installOtpBrowser };

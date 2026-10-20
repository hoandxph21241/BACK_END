const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../env/B_E_S.env'), quiet: true });
const mail = require('../modules/auth/service/EmailService');
const { mailDiagnostics } = require('../utils/mailDiagnostics');

(async () => {
  try {
    await mail.verify();
    console.log(JSON.stringify({ smtpVerified: true, mailSent: false }));
  } catch (error) {
    // Never print the raw OAuth/Gaxios error: its request config can contain secrets.
    console.error(JSON.stringify({ smtpVerified: false, mailSent: false, ...mailDiagnostics(error) }));
    process.exitCode = 1;
  }
})();

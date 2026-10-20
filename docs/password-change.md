# Password Changes

Open `/users/settings` from the account menu. Both methods require an authenticated
account: current password, or an OTP delivered to the account's registered email.
This is not a public forgotten-password endpoint.

Endpoints:

<!-- Previous: GET /api/auth/password/options returned availability and masked email only. -->
- `GET /api/auth/password/options`: availability, masked email, actual resend wait,
  and the current valid challenge ID/expiry (never the OTP or its hash).
- `POST /api/auth/password/otp`: JSON `{}`; the client cannot choose an email.
- `PUT /api/auth/password`: JSON with `method`, `newPassword`, `confirmPassword`,
  plus `oldPassword` for `password`, or `otp` and `challengeId` for `otp`.
- Existing `/api/auth/change-password` and `/api/users/me/password` use the same
  password update/revocation logic. The API-only legacy confirmation field remains
  optional; the web form requires it.

OTP mail reuses `EMAIL_SENDER`, `CLIENT_ID_MAIL`, `CLIENT_SECRET_MAIL`, and
`REFRESH_TOKEN` from the existing environment. `MAIL_SERVICE` defaults to `gmail`.
These OAuth credentials need Gmail SMTP permission. No OTP, password, or OAuth
credential is returned to the browser or logged. Testing mocks the mail transport;
it does not send emails to real accounts.

Mail follows the original Google OAuth flow: `google.auth.OAuth2`,
`setCredentials({ refresh_token })`, `getAccessToken()`, then SMTP using the returned
`token` string. `CLIENT_ID_MAIL`/`CLIENT_SECRET_MAIL` take precedence. The legacy
`CLIENT_ID`/`CLIENT_SECRET` pair is supported only when neither mail-specific field
is set; fields from different clients are never combined. Keep `EMAIL_SENDER` as
the account that granted the mail permissions. Restart Node after changing `.env`.

Run `node scripts/check-mail.cjs` to check OAuth and SMTP without sending a message.
An `invalid_grant` result means Google rejected the configured refresh grant.
Reauthorize the sending account with the matching OAuth client and Gmail SMTP
scope `https://mail.google.com/`, then update `REFRESH_TOKEN` locally. Do not paste
credentials into chat or commit them. Login-only Google tokens cannot authorize SMTP.
The UI distinguishes sender authentication failures as `OTP_MAIL_AUTH_FAILED`;
changing retry limits cannot repair an invalid OAuth grant.

`PASSWORD_OTP_SECRET` is optional; otherwise the generated `SESSION_SECRET` is used
as the OTP HMAC key. Use the same key across server instances. The challenge is
bound to its user, credential version, password fingerprint and email, expires in
5 minutes, accepts at most 5 verification attempts, and is consumed atomically.
Resend cooldown is 60 seconds, with 5 sends per hour per account stored in MongoDB.
The hourly quota counts reserved delivery attempts, including SMTP failures; blocked
cooldown requests do not consume another send. A separate 30 requests/minute account
limiter guards bursts instead of counting all HTTP requests as hourly sends.
Both 429 and delivery-failure responses provide `retryAfter` and a `Retry-After`
header. Codes distinguish `OTP_COOLDOWN`, `OTP_HOURLY_LIMIT`, `OTP_REQUEST_LIMIT`,
and `OTP_DELIVERY_FAILED`. The UI restores the cooldown after refresh and can reuse
an unexpired challenge for the same account credentials. SMTP diagnostics log only
an error code/response code, not message payloads or authentication details.
The `passwordChallenges` collection uses a separate cleanup TTL, never a User TTL.

Successful changes hash the password with the existing bcrypt service, clear
refresh tokens, increment `authVersion`, invalidate pending password OTPs and require
login again. Access middleware checks credential versions; web sessions are checked
before rendering signed-in pages. Existing accounts/tokens without a version are
treated as version zero until the first password change. Updating a recovery email
through the profile API now requires the current password as well.

References: [OWASP password recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
[Nodemailer OAuth2](https://nodemailer.com/smtp/oauth2).

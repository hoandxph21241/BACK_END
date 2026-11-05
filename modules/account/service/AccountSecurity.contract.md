# Account security backend contract

Implemented in the shared checkout on 2026-11-02. Parent mounted AccountSecurityRouter at `/api/account/security` AFTER its `req.accountContext` middleware; the narrowed parent session-body guard is compatible.

Every success uses `{success:true,data:{viewerId,...}}`. Every mutation requires same-origin JSON and `X-Settings-Owner`; each endpoint rejects unknown fields. Reads use `Cache-Control:no-store`. Errors use `{success:false,code,message,retryAfter?}` and appropriate HTTP status.

| Method/path relative to `/api/account/security` | Request | `data` |
| --- | --- | --- |
| GET `/` | none | `security:{email:{address,verified,verifiedAt},google:{linked,canUnlink,linkAvailable},twoFactor:{enabled,recoveryCodesRemaining,available},account:{status,deletionRequestedAt}}` |
| GET `/activity` | none | `items:[{id,type,createdAt}]`, newest 50, current owner only |
| POST `/email/challenge` | `{purpose:'verify-email'|'change-email'|'sensitive',action?,email?,currentPassword?,emailProof?,twoFactorCode?}` | `challengeId,expiresAt,retryAfter:60` |
| POST `/email/confirm` | `{challengeId,code}` | `verified:true,requiresLogin` |
| POST `/2fa/enroll` | proof | `secret,otpauthUrl,expiresAt` |
| POST `/2fa/confirm` | `{code}` | `recoveryCodes:[10 codes],requiresLogin:true` (show codes once) |
| POST `/2fa/disable` | proof | `requiresLogin:true` |
| POST `/google/link` | proof | `url` (navigate top level to start real OAuth) |
| POST `/google/unlink` | proof | `requiresLogin:true` |
| POST `/deactivate`, `/deletion-request`, `/deletion-cancel` | `{confirm:true,...proof}` | `status,requiresLogin:true` |

Proof is `{currentPassword?,emailProof?:{challengeId,code},twoFactorCode?}`. Current password OR a scoped sensitive email proof is required. Enabled 2FA additionally requires `twoFactorCode` (TOTP or one-use recovery code). Sensitive email challenges require an already verified current address and an `action`: `change-email`, `2fa-enroll`, `2fa-disable`, `google-link`, `google-unlink`, `deactivate`, `deletion-request`, or `deletion-cancel`. Sensitive proofs are consumed directly by the action, not `/email/confirm`.

`verify-email` sends to the current address. `change-email` requires fresh proof and sends a new challenge to the proposed address; only successful confirmation updates it and its verification date. Challenges last five minutes, permit five attempts, are single use, and enforce 60-second resend cooldown with five sends/hour per purpose/action. Delivery rejection never reports success. Email change, 2FA confirm/disable, provider unlink, and closure revoke existing sessions and request fresh login. The enrollment confirmation TOTP counter cannot be reused; wait for the next authenticator code or use a saved recovery code to log in.

Existing local API/web login body:

```json
{"nameAccount":"...","namePassword":"...","twoFactorCode":"optional TOTP or recovery code","reactivate":true,"cancelDeletion":true}
```

Only include restoration flags when explicitly selected. Native form checkbox string `"true"` is accepted. Fresh credentials are checked first; 2FA applies when enabled. `TWO_FACTOR_REQUIRED` -> 401; `TWO_FACTOR_RATE_LIMIT` -> 429 with `retryAfter:300`; `ACCOUNT_INACTIVE` -> 403; `SECURITY_BUSY` or `SECURITY_STALE_ACCOUNT` -> 409. Deactivated/deletion-pending owners cannot use normal login/refresh/access/session creation. Explicit verified login with `reactivate:true` or `cancelDeletion:true` restores access. This is also the post-signout cancellation path; inactive users cannot access the authenticated `/deletion-cancel` endpoint. No physical deletion or automatic purge is scheduled.

Google compatibility/security change: `POST /api/auth/google` no longer accepts arbitrary profile JSON. It returns 403 `VERIFIED_OAUTH_REQUIRED`. API Google ID-token login is not implemented. Real OAuth uses `GET /auth/google` and `GET /auth/google/callback`, Passport session state, a verified Google email, and stable provider subject. Existing `Authorization:'GOOGLE'` accounts may bind their first verified subject by matching email. A local account is never claimed by a matching Google email; it must link from an authenticated session. Legacy Google records without the GOOGLE provider marker require existing-account recovery or a reviewed migration.

Link initiation stores a five-minute server-side intent bound to owner and credential version; callback checks the same owner, live refresh session, version, and Passport state before linking. Callback redirects to `/users/settings?google=linked`. Google sign-in requiring 2FA/restoration displays a server-rendered challenge, completed at `POST /auth/two-factor` with server-held pending identity, CSRF proof, expiration, and database attempt limits. No tokens are issued before the second factor succeeds. Unlink requires an established local password login. Password changes can establish this method for Google users via the hook below.

Parent integration (already applied): User `accountStatus:{type:String,enum:['active','deactivated','deletion-pending'],default:'active'}`; security router mount; after successful PasswordChangeService credential CAS call `await require('../../account/service/AccountSecurityService').passwordChanged(actor)`; after actual session revocation call `.record(user,'session_revoked')` or `.record(user,'sessions_revoked')`. `localPasswordEnabled` is declared in AccountSecurity schema. Audit records contain only owner id, allowlisted event type, and date; safe activity DTO adds event id. No secret payload is accepted by record().

Required runtime configuration: persistent `ACCOUNT_SECURITY_KEY` of at least 32 bytes, or existing strong `SESSION_SECRET` fallback; existing EmailService configuration; Google `CLIENT_ID_GOOGLE`, `CLIENT_SECRET_GOOGLE`, `GOOGLE_CALLBACK_URL` matching the configured callback. Availability reflects configuration; no generated fallback encryption key. TOTP secrets use AES-256-GCM with owner binding; recovery codes and email codes use scoped HMAC hashes. Changing the encryption/HMAC key requires an explicit migration/recovery procedure.

Tests are under TEMP, reuse mediahz-feed-fixture.cjs, and create/drop only isolated mediahz_feed_test_* databases. Email delivery and OAuth provider callbacks are mocked; no real emails, production accounts, production sessions, external OAuth, server restarts, git staging, commits, or branches. Test files: mediahz-security.test.cjs, mediahz-security-integration.test.cjs, mediahz-security-oauth.test.cjs. Additional regression suites: mediahz-account-settings-api.test.cjs and mediahz-account-expansion-api.test.cjs. No npm test script exists in package.json.

Implementation rulings: the existing checkout was reused per explicit instruction; unsafe profile-JSON Google login was disabled; restoration uses explicit fresh login after revocation; separate security storage avoids exporting factor data in user DTOs; a short per-owner security mutation lease prevents a gap between credential CAS and security-state changes on standalone MongoDB. A crashed lease expires after 60 seconds; interrupted closure state can be repaired only by explicit credential-verified restoration. Parent performs the final fresh security review.

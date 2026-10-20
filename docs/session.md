# Web Sessions

Run once from `BACK_END`:

```powershell
node scripts/configure-session.cjs
```

This appends a random 32-byte `SESSION_SECRET` and `SESSION_TTL_HOURS=168` to
`../env/B_E_S.env`, outside this Git repository. Existing keys are not replaced,
and the secret is never printed. Keep this file private and reuse the same secret
across application instances/restarts. Changing the secret requires logging in again.

The application uses the existing Mongoose connection and stores encrypted session
payloads in `Song_Database.webSessions`. MongoDB removes expired documents via a TTL
index. These documents are separate from each user's `refreshTokens`.

Defaults:

- Cookie name: `connect.sid`, unchanged for compatibility with logout.
- Idle expiry: 168 hours; `SESSION_TTL_HOURS` accepts an integer from 1 to 720.
- `HttpOnly`, `SameSite=Lax`, path `/`, and no new session for an untouched guest.
- Expiry rolls forward on requests for an existing session; database touches are
  limited to once per minute unless session data changes.
- Local HTTP works. `NODE_ENV=production` requires HTTPS to set/send the cookie.
- Proxy headers are not trusted by default. If a trusted local reverse proxy
  terminates HTTPS, set `TRUST_PROXY=loopback`. Other deployments must specify
  their actual trusted IP/subnet or known proxy hop count. Do not use `true`.

Restart Node after changing environment variables. The first switch from the old
MemoryStore/hard-coded secret requires signing in again. Database access must allow
creating the expiry index; there is no insecure in-memory fallback.

References: [express-session](https://expressjs.com/en/resources/middleware/session/),
[connect-mongo](https://github.com/jdesboeufs/connect-mongo).

# Selected Song Persistence

`User.currentSongId` stores one optional `MP3` ObjectId per account. No position,
volume, play/pause mode, audio data or queue is stored. Existing users need no
migration: an absent field is read as null.

- `GET /api/users/me/player` returns `{ userId, currentSongId }` in the standard
  API `data` envelope. Responses use `Cache-Control: no-store`.
- `PUT /api/users/me/player` accepts only `{ currentSongId: "24-character ID" }`
  or `{ currentSongId: null }`. The account comes from verified authentication,
  never from the body. Updates change the existing User document with `$set`.
- Both Bearer tokens and the existing server-side web session are supported.
  Cookie-authenticated updates require JSON, a matching `X-Player-Owner` header,
  and a same-origin request. A stale owner header returns HTTP 409.
- Missing, deleted and inaccessible private songs cannot be saved. Reads clear a
  stale reference conditionally, without overwriting a concurrent newer choice.

The browser waits for the initial server read before saving. It saves on song-ID
changes only, debounces short transitions by 300 ms, and serializes writes. User
actions during a pending read take priority over restoration. A saved song is
restored paused at the beginning. An account with no song keeps the mediabar hidden.

Session cache keys are `mediahz.currentSong.v2.1:<user ObjectId>` and
`mediahz.currentSong.v2.1:guest`. The old unscoped key is discarded to prevent
cross-account restoration. The session-only implementation is retained as a
comment in `player_persistence_session_legacy.js` and is not loaded.

Login changes invalidate pending restoration and reset the old player/queue.
Returning focus to the page checks for an account changed in another tab.
Logout stops playback immediately and flushes a pending song choice before the
existing server logout runs, with a two-second navigation fallback. It clears
the local cache but does not send a null selection to the server. Explicitly
removing the current/final song does save null. Guests use session cache only.

Storage failures do not disable server sync. On transient sync failure the local
cache remains available; pending changes retry when the connection recovers or
the session is checked again. Old account responses are ignored and every write
identifies its expected owner, so a delayed request cannot write under a new login.

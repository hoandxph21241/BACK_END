# Song Permalinks

Public track pages use `/{profileSlug}/{slug}`. IDs remain internal to the API,
streaming endpoint, queue, history and engagement actions.

- Accounts receive a globally unique `profileSlug` at registration (web/API/Google).
- Track slugs are unique within the uploader namespace. Duplicate titles use
  `track-name`, `track-name-2`, `track-name-3`, etc. The display title is unchanged.
- Vietnamese accents and decomposed Unicode are normalized for URLs. Titles made
  entirely of non-Latin characters use `track`, with the same collision handling.
- Slugs are permanent: editing names, titles or administrative ownership metadata
  does not rename existing URLs. The namespace is copied onto each track so links
  also survive deletion of its uploader account. Account slug editing is not exposed.
- Existing tracks without an identifiable uploader use the reserved `mediahz` namespace.
- Reserved application paths cannot become account namespaces.
- A unique partial MongoDB index prevents collisions during concurrent requests;
  only slug collisions are retried. Audio is not reuploaded on a slug retry.
- Old `/home/song/:id` links respond with HTTP 301 to the canonical URL. Private and
  deleted tracks are not exposed by either public page route.
- Direct loads/F5 render the Home shell; XHR navigation renders only the track view.
  Sharing, related tracks and the mediabar use the canonical URL.

## Existing Data

```powershell
node scripts/backfill-song-permalinks.cjs
node scripts/backfill-song-permalinks.cjs --apply
```

The first command only reports missing permalinks without loading Mongoose or
creating indexes. `--apply` first writes a metadata-only snapshot into the workspace
`backups` directory, then allocates account and track slugs in `_id` order. It does
not modify titles, ownership, timestamps, file IDs or audio. Re-running is idempotent.
Missing legacy slugs are also allocated when an old track link is opened.

Restart the Node server after deploying, and hard-refresh the browser once so the
player receives the new client scripts. Older cached queue entries can still use
the ID route; navigation resolves and replaces it with the canonical URL.

## Tests

```powershell
node --test tests/permalink.test.cjs tests/profile.test.cjs
$env:PERMALINK_TEST_MONGO_URL = 'mongodb://127.0.0.1'
node --test tests/permalink.mongo.cjs
node tests/profile.browser.cjs
```

Mongo tests use a random `MediaHz_Permalink_Test_*` database and remove only that
exact test database. They do not upload or alter audio in the application database.
The browser runner also verifies canonical URL history, redirects, sharing, mediabar
duplicate guards and direct page loads at desktop/mobile sizes.

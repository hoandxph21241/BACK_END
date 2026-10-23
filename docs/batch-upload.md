# Web Batch Upload

The web form at `/product` uses `public/javascripts/product/upload_queue.js`.
The earlier single-file form remains in `views/product/_upload_single_legacy.ejs`,
with its JavaScript and CSS retained for reference. They are no longer loaded.

The first screen is an audio selector with a drag-and-drop area and a multiple-file
picker. A valid selection opens the existing metadata editor; invalid files stay on
the first screen with an error. Removing all rows returns to the selector. Selection
alone does not send files or publish tracks: the existing API still requires each
track's title and category before submission. Account quota meters, subscription
upsells, unsupported codecs and microphone recording are not presented as features.

- Select up to 20 MP3, M4A, WAV or FLAC files, each up to 25 MiB.
- Each row has its own title, category and optional JPEG/PNG/WebP cover (5 MiB).
- The default category applies to new rows and existing rows without a manual override.
- Two requests run concurrently. Each request posts exactly one `song` plus its
  `name`, `categoryId`, and optional `imageFile` to the existing `/product/upload`
  route. Authentication, audio content validation and the API/GridFS flow are unchanged.
- Progress measures bytes sent, not server work. Each row shows sent/total bytes,
  a smoothed recent transfer speed and an estimated remaining transfer time.
  Speed and ETA disappear when progress samples are more than 2.5 seconds old.
  The aggregate bar is weighted by bytes rather than averaging track percentages;
  failed or uncertain requests are not automatically counted as 100% transferred.
- After transmission, the row stays in a finishing phase for at least five seconds
  measured from `xhr.upload.onload`. Success requires both this minimum interval
  and an explicit successful server response. A slower server is awaited without
  another five-second delay; errors and timeouts are displayed immediately.
  This client-side grace period does not guarantee or measure server processing.
  Elapsed time includes processing and the grace period. The total timer excludes
  paused time. The two active queue slots remain occupied during finishing.
- Pause stops new requests and lets in-flight requests finish. Resume sends only
  pending rows. A failed row can be retried explicitly, without repeating successes.
- Network errors, timeouts and ambiguous server responses are unconfirmed, not
  automatically retried. Check Library before uploading the same song again.
- Authentication failures and HTTP 429 pause new requests.
- The in-memory queue continues during same-document SPA navigation and is restored
  when returning to Upload. A full reload/closing the page does not retain files;
  the browser is asked to warn while uploads or pending rows remain.

## Verification

Use an isolated upload fixture, without writing songs to the production database
or calling ImgBB. Check real byte-weighted progress, speed/ETA expiry, a fast server
response, no response after five seconds, a response slower than five seconds,
immediate error/timeout handling, concurrency, SPA remount and mobile layouts.
For a manual transfer test on localhost, enable an upload bandwidth limit in the
browser's Network throttling settings; there is no application bandwidth cap.

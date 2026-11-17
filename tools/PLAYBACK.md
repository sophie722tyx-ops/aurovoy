# Preparing web playback versions

Run `node tools/prepare-playback.mjs --job path/to/job.json` from the repository. A job contains `inputFile`, `mediaId`, `workId`, `sourceObjectKey` and the exact uploaded `sourceSize`. Set `FFMPEG_PATH` and `FFPROBE_PATH` when the executables are not on PATH. `--out`, `--preset`, `--ffmpeg` and `--ffprobe` are optional overrides.

The offline encoder leaves the source untouched and writes into `.wrangler/playback/prepared/<mediaId>/<version>/`. It creates full-duration 480p/720p/1080p H.264/AAC versions, limited to the original dimensions, with approximately four-second independently decodable segments. Each rendition uses one MPEG-TS file and a byte-range playlist. These are still independently requested HLS segments, while requiring fewer object uploads.

The encoder validates duration, byte coverage, per-segment size, video dimensions, key frames and audio presence before writing `catalog-entry.json`. Publish all files listed by that descriptor under its immutable R2 `prefix`, then add the descriptor to `playback-catalog.json` and deploy. Never activate a descriptor before its files are completely uploaded. Keep the private bucket and current-work publication checks in the Worker; a published playback version must not bypass a later unpublish, deletion or source replacement.

The source SHA-256 and encoding recipe determine the version. Interrupted jobs can be rerun. Completed output is reused only for the same source and recipe; a different recipe writes a new immutable prefix. The descriptor is not a background queue: new admin uploads continue using their original MP4 until an offline job prepares and publishes their playback version.

For batches, keep encoding concurrency bounded (four jobs with two encoder/filter threads each on a 24-logical-core machine). Passing `--preset fast` spends more processing time per rendition than the default `veryfast`. Before activating a new recipe, check the first video visually as well as running `node --test prepare-playback.test.mjs`.

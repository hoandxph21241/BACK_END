const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const { createWriteStream } = require("fs");
const { pipeline } = require("stream/promises");
const { MP3 } = require("../../../model/db_song");
const GridFS = require("../../../utils/GridFS");
const generate = require("../../../utils/audioWaveform");
const pending = new Map();
const failure = (status, message) => Object.assign(new Error(message), { status });
async function build(id) {
  const song = await MP3.findById(id).select("fileId isDeleted isPublic +waveform").lean();
  if (!song || song.isDeleted || song.isPublic === false) throw failure(404, "Không tìm thấy bài hát.");
  if (song.waveform?.version === 1 && song.waveform.peaks?.length === 480 && song.waveform.duration > 0) return song.waveform;
  const file = song.fileId && await GridFS.findFile(song.fileId);
  if (!file) throw failure(404, "Không tìm thấy audio để tạo waveform.");
  if (file.length > 25 * 1024 * 1024) throw failure(413, "Audio vượt giới hạn xử lý waveform 25 MB.");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mediahz-waveform-"));
  try {
    const input = path.join(directory, "audio");
    await pipeline(GridFS.openDownloadStream(song.fileId), createWriteStream(input));
    const waveform = await generate(input);
    // Bind the cached peaks to the same audio file, even if metadata changes concurrently.
    await MP3.updateOne({ _id: id, fileId: song.fileId }, { $set: { waveform } });
    return waveform;
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
exports.get = function (id) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return Promise.reject(failure(400, "ID bài hát không hợp lệ."));
  id = id.toLowerCase();
  if (!pending.has(id)) {
    if (pending.size >= 8) return Promise.reject(failure(503, "Máy chủ đang bận. Vui lòng thử lại sau."));
    const task = build(id).finally(() => pending.delete(id));
    pending.set(id, task);
  }
  return pending.get(id);
};

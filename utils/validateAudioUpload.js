const path = require("path");

module.exports = async function validateAudioUpload(file) {
  const { fileTypeFromFile } = await import("file-type");
  let detected;
  try {
    detected = await fileTypeFromFile(file.path);
  } catch (error) {
    // Short/truncated headers are invalid uploads, not internal server errors.
//     if (error.name !== "EndOfStreamError") throw error;
    if (error.constructor?.name !== "EndOfStreamError") throw error;
  }
  const extension = path.extname(file.originalname).toLowerCase();
  const formats = {
    ".mp3": { types: ["mp3"], mime: "audio/mpeg" },
    ".m4a": { types: ["m4a", "mp4"], mime: "audio/mp4" },
    ".wav": { types: ["wav"], mime: "audio/wav" },
    ".flac": { types: ["flac"], mime: "audio/flac" },
  };
  const format = formats[extension];
  if (!format || !detected || !format.types.includes(detected.ext)) {
    const error = new Error("Nội dung file không khớp định dạng audio MP3/M4A/WAV/FLAC. File có thể là trang HTML được lưu nhầm đuôi hoặc đã hỏng. Vui lòng chọn file audio gốc.");
    error.code = "INVALID_AUDIO_FILE";
    throw error;
  }
  // Persist the detected format, not the browser-supplied MIME type.
  file.mimetype = format.mime;
};

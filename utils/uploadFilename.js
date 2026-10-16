const { TextDecoder } = require("util");

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

module.exports = function uploadFilename(name) {
  // Multipart headers may expose UTF-8 filename bytes as Latin-1 characters.
  // Decode only valid UTF-8 bytes; already-correct Unicode must stay unchanged.
  if (typeof name !== "string" || /[^\u0000-\u00ff]/u.test(name)) return name;
  try {
    return utf8.decode(Buffer.from(name, "latin1"));
  } catch {
    return name;
  }
};

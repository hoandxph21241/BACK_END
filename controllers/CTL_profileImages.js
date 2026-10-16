// Previous: const GridFS = require("../utils/GridFS");
const { findProfileImage } = require("../utils/profileImages");
const { pipeline } = require("stream");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

exports.getProfileImage = async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    // Previous: const file = await GridFS.findFile(req.params.id);
    const located = await findProfileImage(req.params.id);
    const file = located?.file;
    if (!file || file.metadata?.purpose !== "profile-image" ||
        !ALLOWED_TYPES.has(file.contentType)) return res.sendStatus(404);

    res.set({
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    });
    // Previous: const source = GridFS.openDownloadStream(file._id);
    const source = located.storage.openDownloadStream(file._id);
    res.once("close", () => source.destroy());
    pipeline(source, res, (error) => {
      if (error && !res.destroyed) res.destroy();
    });
  } catch (error) {
    next(error);
  }
};
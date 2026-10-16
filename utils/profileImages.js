const { randomUUID } = require("crypto");
// Previous: const GridFS = require("./GridFS");
const GridFS = require("./UserGridFS");
const LegacyGridFS = require("./GridFS");
const IMAGE_PREFIX = "/users/profile-images/";
function imageExtension(file) {
  const data = file.buffer;
  if (!Buffer.isBuffer(data) || !data.length || data.length > 5 * 1024 * 1024) throw new Error("Ảnh không hợp lệ hoặc lớn hơn 5 MB.");
  if (file.mimetype === "image/png" && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (file.mimetype === "image/jpeg" && data[0] === 255 && data[1] === 216 && data[2] === 255) return "jpg";
  if (file.mimetype === "image/webp" && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new Error("Nội dung ảnh không đúng định dạng JPG, PNG hoặc WebP.");
}
async function cleanup(fileIds) {
  await Promise.all(fileIds.map(async (id) => {
    try {
      await GridFS.deleteFile(id);
    } catch (error) {
      console.error("Profile image GridFS cleanup failed:", String(id));
    }
  }));
}

async function saveProfileImages(files = {}, ownerId) {
  const entries = [["avatar", "imageAccount"], ["banner", "bannerImage"]]
    .filter(([field]) => files[field]?.[0])
    .map(([field, property]) => ({
      file: files[field][0], property, extension: imageExtension(files[field][0]),
    }));
  if (entries.length && !ownerId) throw new Error("Missing profile image owner.");
  const fileIds = [];
  const changes = {};
  try {
    for (const entry of entries) {
      const id = await GridFS.uploadBuffer(
        entry.file.buffer, `${randomUUID()}.${entry.extension}`, {
          contentType: entry.file.mimetype,
          metadata: { purpose: "profile-image", ownerId: String(ownerId), field: entry.property },
        },
      );
      fileIds.push(id);
      changes[entry.property] = `${IMAGE_PREFIX}${id}`;
    }
    return { fileIds, changes };
  } catch (error) {
    await cleanup(fileIds);
    throw error;
  }
}

// Compatibility reads only: new uploads always use the user bucket.
async function findProfileImage(id) {
  let storage = GridFS;
  let file = await storage.findFile(id);
  if (!file) {
    storage = LegacyGridFS;
    file = await storage.findFile(id);
  }
  if (file?.metadata?.purpose !== "profile-image") return null;
  return { file, storage };
}

async function cleanupReplacedImages(previous, changes) {
  for (const property of ["imageAccount", "bannerImage"]) {
    const url = previous[property];
    if (!changes[property] || typeof url !== "string" || !url.startsWith(IMAGE_PREFIX)) continue;
    const id = url.slice(IMAGE_PREFIX.length);
    if (!/^[a-f0-9]{24}$/i.test(id)) continue;
    try {
      // Previous lookup/deletion used the shared songs bucket:
      // const file = await GridFS.findFile(id);
      // if (file?.metadata?.purpose === "profile-image" &&
      //     file.metadata.ownerId === String(previous._id)) await cleanup([id]);
      const located = await findProfileImage(id);
      if (located && located.file.metadata.ownerId === String(previous._id)) {
        await located.storage.deleteFile(id);
      }
    } catch (error) {
      console.error("Cannot clean replaced profile image:", id);
    }
  }
}

// Previous: module.exports = { saveProfileImages, cleanup, cleanupReplacedImages };
module.exports = { saveProfileImages, cleanup, cleanupReplacedImages, findProfileImage };

// Previous local-file storage retained for reference (disabled).
// const fs = require("fs/promises");
// const path = require("path");
// const { randomUUID } = require("crypto");
// const directory = path.join(__dirname, "../public/uploads/profiles");
// function imageExtension(file) {
//   const data = file.buffer;
//   if (!Buffer.isBuffer(data) || !data.length || data.length > 5 * 1024 * 1024) throw new Error("Ảnh không hợp lệ hoặc lớn hơn 5 MB.");
//   if (file.mimetype === "image/png" && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
//   if (file.mimetype === "image/jpeg" && data[0] === 255 && data[1] === 216 && data[2] === 255) return "jpg";
//   if (file.mimetype === "image/webp" && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
//   throw new Error("Nội dung ảnh không đúng định dạng JPG, PNG hoặc WebP.");
// }
// async function cleanup(paths) {
//   await Promise.all(paths.map(file => fs.unlink(file).catch(() => {})));
// }
// async function saveProfileImages(files = {}) {
//   const entries = [["avatar", "imageAccount"], ["banner", "bannerImage"]]
//     .filter(([field]) => files[field]?.[0])
//     .map(([field, property]) => ({ file: files[field][0], property, extension: imageExtension(files[field][0]) }));
//   const paths = [];
//   const changes = {};
//   try {
//     if (entries.length) await fs.mkdir(directory, { recursive: true });
//     for (const entry of entries) {
//       const filename = `${randomUUID()}.${entry.extension}`;
//       const target = path.join(directory, filename);
//       await fs.writeFile(target, entry.file.buffer, { flag: "wx" });
//       paths.push(target);
//       changes[entry.property] = `/uploads/profiles/${filename}`;
//     }
//     return { paths, changes };
//   } catch (error) {
//     await cleanup(paths);
//     throw error;
//   }
// }
// module.exports = { saveProfileImages, cleanup };

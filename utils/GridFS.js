const db = require("../model/db");
const mongoose = db.mongoose;
const { ObjectId, GridFSBucket } = mongoose.mongo;
const fs = require("fs");
const BUCKET_NAME = "songs";

let bucket = null;

/**
 * Lấy GridFS bucket từ kết nối Mongoose hiện tại.
 */
function getBucket() {
  const connection = mongoose.connection;

  if (connection.readyState !== 1 || !connection.db) {
    throw new Error("MongoDB connection is not ready.");
  }

  if (!bucket) {
    bucket = new GridFSBucket(connection.db, {
      bucketName: BUCKET_NAME,
      chunkSizeBytes: 255 * 1024,
    });
  }

  return bucket;
}

/**
 * Upload Buffer vào GridFS.
 * Trả về ObjectId của file đã lưu.
 *
 * Lưu ý: đây là bước chuyển tiếp tương thích với
 * middleware memoryStorage() hiện tại.
 */
function uploadBuffer(buffer, filename, options = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError("A non-empty file Buffer is required.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      contentType: options.contentType || "audio/mpeg",
      metadata: options.metadata || {},
    });

    uploadStream.once("error", reject);

    uploadStream.once("finish", () => {
      resolve(uploadStream.id);
    });

    uploadStream.end(buffer);
  });
}

/**
 * Tạo luồng đọc file từ GridFS.
 */
function openDownloadStream(fileId) {
  if (!ObjectId.isValid(fileId)) {
    throw new TypeError("Invalid GridFS file ID.");
  }

  return getBucket().openDownloadStream(new ObjectId(fileId));
}

/**
 * Tìm metadata file trong GridFS.
 */
async function findFile(fileId) {
  if (!ObjectId.isValid(fileId)) {
    return null;
  }

  const files = await getBucket()
    .find({ _id: new ObjectId(fileId) })
    .limit(1)
    .toArray();

  return files[0] || null;
}

/**
 * Xóa file khỏi GridFS.
 */
async function deleteFile(fileId) {
  if (!ObjectId.isValid(fileId)) {
    return false;
  }

  await getBucket().delete(new ObjectId(fileId));
  return true;
}


function uploadFilePath(filePath, filename, options = {}) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();

    const source = fs.createReadStream(filePath);

    const destination = bucket.openUploadStream(filename, {
      contentType: options.contentType || "audio/mpeg",
      metadata: options.metadata || {},
    });

    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;

      source.destroy();

      destination.destroy(error);

      reject(error);
    };

    source.once("error", fail);
    destination.once("error", fail);

    destination.once("finish", () => {
      if (settled) return;
      settled = true;
      resolve(destination.id);
    });

    source.pipe(destination);
  });
}

module.exports = {
  BUCKET_NAME,
  uploadBuffer,
  openDownloadStream,
  findFile,
  deleteFile,
  uploadFilePath,
};

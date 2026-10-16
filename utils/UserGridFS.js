const { mongoose } = require("../model/db");
const { ObjectId, GridFSBucket } = mongoose.mongo;
const BUCKET_NAME = "user";
let bucket;
let database;

function getBucket() {
  const connection = mongoose.connection;
  if (connection.readyState !== 1 || !connection.db) {
    throw new Error("MongoDB connection is not ready.");
  }
  if (!bucket || database !== connection.db) {
    database = connection.db;
    bucket = new GridFSBucket(database, { bucketName: BUCKET_NAME });
  }
  return bucket;
}

function uploadBuffer(buffer, filename, options = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new TypeError("A non-empty image Buffer is required.");
  }
  return new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(filename, {
      contentType: options.contentType,
      metadata: options.metadata || {},
    });
    stream.once("error", reject);
    stream.once("finish", () => resolve(stream.id));
    stream.end(buffer);
  });
}

async function findFile(id) {
  if (!ObjectId.isValid(id)) return null;
  const files = await getBucket().find({ _id: new ObjectId(id) }).limit(1).toArray();
  return files[0] || null;
}

function openDownloadStream(id) {
  if (!ObjectId.isValid(id)) throw new TypeError("Invalid profile image ID.");
  return getBucket().openDownloadStream(new ObjectId(id));
}

async function deleteFile(id) {
  if (!ObjectId.isValid(id)) return false;
  await getBucket().delete(new ObjectId(id));
  return true;
}

module.exports = { BUCKET_NAME, uploadBuffer, findFile, openDownloadStream, deleteFile };
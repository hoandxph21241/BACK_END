const fs = require('node:fs/promises');
const path = require('node:path');
const { MongoClient } = require('mongodb');
const { validProfileSlug, songPath } = require('../utils/permalink');

async function backfill(db, { apply = false, service, backupRoot = path.resolve(__dirname, '../../backups') } = {}) {
  const users = await db.collection('User').find({}, {
    projection: { _id: 1, userID: 1, fullName: 1, userName: 1, profileTag: 1, profileSlug: 1 },
  }).sort({ _id: 1 }).toArray();
  const songs = await db.collection('MP3').find({}, {
    projection: { _id: 1, userID: 1, name: 1, profileSlug: 1, slug: 1 },
  }).sort({ _id: 1 }).toArray();
  const result = { mode: apply ? 'apply' : 'dry-run',
    users: users.filter(user => !validProfileSlug(user.profileSlug)).length,
    songs: songs.filter(song => !songPath(song)).length };
  if (!apply || (!result.users && !result.songs)) return result;
  if (!service) throw new Error('An explicit permalink service is required to apply changes.');
  await fs.mkdir(backupRoot, { recursive: true });
  const backup = path.join(backupRoot, `permalinks-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  // No credentials, email addresses or binary audio are included in this snapshot.
  await fs.writeFile(backup, JSON.stringify({ database: db.databaseName, createdAt: new Date(),
    users: users.map(({ _id, profileSlug }) => ({ _id, profileSlug })),
    songs: songs.map(({ _id, userID, profileSlug, slug }) => ({ _id, userID, profileSlug, slug })),
  }, null, 2), { flag: 'wx' });
  result.backup = backup;
  await service.ensureIndexes();
  for (const user of users) await service.ensureUserProfileSlug(user);
  for (const song of songs) await service.ensureSongPermalink(song);
  return result;
}

async function main() {
  if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/backfill-song-permalinks.cjs [--apply]');
  const apply = process.argv.includes('--apply');
  // Same database as model/db.js. Dry-run does not load Mongoose or create indexes.
  const client = new MongoClient('mongodb://127.0.0.1/Song_Database', { serverSelectionTimeoutMS: 5000 });
  let mongoose;
  try {
    await client.connect();
    const service = apply ? require('../utils/permalinkService') : undefined;
    if (apply) mongoose = require('mongoose');
    console.log(JSON.stringify(await backfill(client.db(), { apply, service }), null, 2));
  } finally {
    await client.close();
    if (mongoose) await mongoose.disconnect();
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { backfill };

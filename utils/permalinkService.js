const crypto = require('node:crypto');
const { PROFILE_SLUG_MAX, SONG_SLUG_MAX, slugify, validProfileSlug, songPath } = require('./permalink');

function createPermalinkService({ UserModel, MP3 }) {
  let indexes;
  function ensureIndexes() {
    if (!indexes) indexes = (async () => {
      await UserModel.collection.createIndex({ profileSlug: 1 }, {
        name: 'profile_slug_unique', unique: true,
        partialFilterExpression: { profileSlug: { $type: 'string' } },
      });
      await MP3.collection.createIndex({ profileSlug: 1, slug: 1 }, {
        name: 'song_permalink_unique', unique: true,
        partialFilterExpression: { profileSlug: { $type: 'string' }, slug: { $type: 'string' } },
      });
    })().catch(error => { indexes = null; throw error; });
    return indexes;
  }

  async function allocate(base, maxLength, indexName, write) {
    await ensureIndexes();
    for (let attempt = 0; attempt < 120; attempt++) {
      const suffix = attempt === 0 ? '' : attempt < 100 ? `-${attempt + 1}` : `-${crypto.randomBytes(4).toString('hex')}`;
      const candidate = base.slice(0, maxLength - suffix.length).replace(/-+$/, '') + suffix;
      try {
        const result = await write(candidate);
        if (result) return result;
      } catch (error) {
        const slugConflict = error.code === 11000 &&
          (error.message?.includes(indexName) || (indexName === 'profile_slug_unique'
            ? error.keyPattern?.profileSlug && !error.keyPattern?.slug : error.keyPattern?.slug));
        if (!slugConflict) throw error;
      }
    }
    throw new Error('Unable to allocate a unique public permalink. Please retry.');
  }

  function profileBase(user) {
    const base = slugify(user.fullName || user.userName || user.profileTag, 'artist', PROFILE_SLUG_MAX);
    return validProfileSlug(base) ? base : `${base.slice(0, PROFILE_SLUG_MAX - 7)}-artist`;
  }

  async function createUser(data, write = value => UserModel.create(value)) {
    return allocate(profileBase(data), PROFILE_SLUG_MAX, 'profile_slug_unique', async profileSlug => {
      // Do not reuse a deleted account's namespace while its tracks still exist.
      if (await MP3.exists({ profileSlug })) return null;
      return write({ ...data, profileSlug });
    });
  }

  async function ensureUserProfileSlug(user) {
    if (!user || validProfileSlug(user.profileSlug)) return user;
    return allocate(profileBase(user), PROFILE_SLUG_MAX, 'profile_slug_unique', async profileSlug => {
      if (await MP3.exists({ profileSlug })) return null;
      const updated = await UserModel.findOneAndUpdate({ _id: user._id,
        profileSlug: user.profileSlug === undefined ? { $exists: false } : user.profileSlug,
      }, { $set: { profileSlug } }, { new: true, runValidators: true }).lean();
      if (updated) return updated;
      const current = await UserModel.findById(user._id).lean();
      if (!current) throw new Error('Account no longer exists.');
      return validProfileSlug(current.profileSlug) ? current : null;
    });
  }

  async function ownerSlug(userID) {
    if (!userID) return 'mediahz';
    const alternatives = [{ userID: String(userID) }];
    if (/^[a-f0-9]{24}$/i.test(String(userID))) alternatives.push({ _id: userID });
    const user = await UserModel.findOne({ $or: alternatives })
      .select('_id userID fullName userName profileTag profileSlug').lean();
    return user ? (await ensureUserProfileSlug(user)).profileSlug : 'mediahz';
  }

  async function createSong(data, write = value => MP3.create(value)) {
    const profileSlug = await ownerSlug(data.userID);
    return allocate(slugify(data.name), SONG_SLUG_MAX, 'song_permalink_unique',
      slug => write({ ...data, profileSlug, slug }));
  }

  async function ensureSongPermalink(song) {
    if (!song || songPath(song)) return song;
    const profileSlug = await ownerSlug(song.userID);
    return allocate(slugify(song.name), SONG_SLUG_MAX, 'song_permalink_unique', async slug => {
      const filter = { _id: song._id };
      for (const key of ['profileSlug', 'slug']) {
        filter[key] = song[key] === undefined ? { $exists: false } : song[key];
      }
      // Metadata-only CAS keeps audio, ownership and concurrent edits untouched.
      const updated = await MP3.findOneAndUpdate(filter, { $set: { profileSlug, slug } },
        { new: true, runValidators: true, timestamps: false }).select('profileSlug slug').lean();
      const current = updated || await MP3.findById(song._id).select('profileSlug slug').lean();
      if (!current) throw new Error('Track no longer exists.');
      return songPath(current) ? { ...(song.toObject ? song.toObject() : song),
        profileSlug: current.profileSlug, slug: current.slug } : null;
    });
  }

  return { ensureIndexes, createUser, ensureUserProfileSlug, createSong, ensureSongPermalink };
}

module.exports = { ...createPermalinkService(require('../model/db_song')), createPermalinkService };

const History = require('../model/UserListeningHistory');
const UserRepository = require('../../user/repository/UserRepository');
const { MP3 } = require('../../../model/db_song');

exports.record = async (identifier, songId, acceptedAt = new Date()) => {
  if (!identifier || !/^[a-f0-9]{24}$/i.test(String(songId))) return;
  const owner = await UserRepository.findByIdentifier(String(identifier)).select('_id').lean();
  if (!owner || !await MP3.exists({ _id: songId, isPublic: { $ne: false }, isDeleted: { $ne: true } })) return;
  await History.init();
  const entry = { songId: new MP3.base.Types.ObjectId(songId), lastPlayedAt: new Date(acceptedAt) };
  const entries = { $ifNull: ['$entries', []] };
  const partition = comparison => ({ $filter: { input: entries, as: 'e', cond: { $and: [
    { $ne: ['$$e.songId', entry.songId] }, { [comparison]: ['$$e.lastPlayedAt', entry.lastPlayedAt] },
  ] } } });
  const newerCopy = { $filter: { input: entries, as: 'e', cond: { $and: [
    { $eq: ['$$e.songId', entry.songId] }, { $gte: ['$$e.lastPlayedAt', entry.lastPlayedAt] },
  ] } } };
  // Previous: always prepend using retry arrival time. Insert by the original listen time instead.
  const update = [{ $set: { owner: owner._id, entries: { $cond: [
    { $gt: [{ $size: newerCopy }, 0] }, entries,
    { $slice: [{ $concatArrays: [partition('$gt'), { $literal: [entry] }, partition('$lte')] }, 100] },
  ] } } }];
  try { await History.updateOne({ owner: owner._id }, update, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; await History.updateOne({ owner: owner._id }, update); }
};
exports.recent = async owner => owner ? (await History.findOne({ owner }).select('entries').lean())?.entries || [] : [];

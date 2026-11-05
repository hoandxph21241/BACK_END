const { UserModel, MP3, PlayHistoryModel } = require('../../../model/db_song');
const History = require('../../home/model/UserListeningHistory');
const Follow = require('../../user/model/UserFollow');
const Preferences = require('./AccountPreferencesService');
const LIMIT = 10000;
exports.export = async owner => {
  const user = await UserModel.findById(owner).select('_id userID nameAccount gmail fullName userName firstName lastName city country bio profileTag profileSlug imageAccount bannerImage links').lean();
  const aliases=[String(user._id),user.userID].filter(Boolean);
  const [recent,legacy,likes,uploads,following,preferences]=await Promise.all([
    History.findOne({owner}).select('entries -_id').lean(),
    PlayHistoryModel.find({userID:{$in:aliases}}).select('songID songName playedAt -_id').sort({playedAt:-1}).limit(LIMIT+1).lean(),
    MP3.find({likedBy:{$in:aliases},isDeleted:{$ne:true},$or:[{isPublic:{$ne:false}},{userID:{$in:aliases}}]}).select('_id name artist profileSlug slug').limit(LIMIT+1).lean(),
    MP3.find({userID:{$in:aliases}}).select('_id name artist profileSlug slug createdAt uploadDate isPublic isDeleted').limit(LIMIT+1).lean(),
    Follow.find({follower:owner}).select('followee createdAt -_id').limit(LIMIT+1).lean(),
    Preferences.get(String(owner)),
  ]);
  return {viewerId:String(owner),exportedAt:new Date().toISOString(),profile:user,preferences,
    history:recent?.entries||[],legacyHistory:legacy.slice(0,LIMIT),likes:likes.slice(0,LIMIT),uploads:uploads.slice(0,LIMIT),following:following.slice(0,LIMIT),
    limits:{maxItemsPerSection:LIMIT,truncated:{legacyHistory:legacy.length>LIMIT,likes:likes.length>LIMIT,uploads:uploads.length>LIMIT,following:following.length>LIMIT}},
    notes:['The transient playback queue is not stored as an account playlist. Audio files, credentials and private message contents are excluded.'],
  };
};
exports.clearHistory = async owner => {
  const user=await UserModel.findById(owner).select('userID').lean();
  await Promise.all([
    History.updateOne({owner},{$set:{entries:[]}}),
    PlayHistoryModel.deleteMany({userID:{$in:[String(owner),user.userID].filter(Boolean)}}),
  ]);
  return {viewerId:String(owner),cleared:true};
};

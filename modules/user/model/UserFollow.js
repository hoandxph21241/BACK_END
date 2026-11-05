const { mongoose } = require('../../../model/db');

const schema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  followee: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'UserFollow' });
schema.index({ follower: 1, followee: 1 }, { unique: true });
schema.index({ followee: 1 });

module.exports = mongoose.models.UserFollow || mongoose.model('UserFollow', schema);

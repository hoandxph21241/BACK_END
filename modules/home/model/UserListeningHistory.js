const { mongoose } = require('../../../model/db');
const entry = new mongoose.Schema({ songId: { type: mongoose.Schema.Types.ObjectId, ref: 'MP3', required: true },
  lastPlayedAt: { type: Date, required: true } }, { _id: false });
const schema = new mongoose.Schema({ owner: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  entries: { type: [entry], default: [] } }, { collection: 'UserListeningHistory' });
schema.index({ owner: 1 }, { unique: true });
module.exports = mongoose.models.UserListeningHistory || mongoose.model('UserListeningHistory', schema);

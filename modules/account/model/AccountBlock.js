const { mongoose } = require('../../../model/db');

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'AccountBlock' });
schema.index({ owner: 1, target: 1 }, { unique: true });
schema.index({ target: 1, owner: 1 });

module.exports = mongoose.models.AccountBlock || mongoose.model('AccountBlock', schema);

const { mongoose } = require("../../../model/db");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  challengeId: String,
  hash: String,
  email: String,
  authVersion: Number,
  credentialHash: String,
  expiresAt: Date,
  sentAt: Date,
  windowStartedAt: Date,
  sendCount: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  ready: { type: Boolean, default: false },
  consumed: { type: Boolean, default: false },
  deleteAt: Date,
}, { collection: "passwordChallenges" });
schema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.models.PasswordChallenge || mongoose.model("PasswordChallenge", schema);

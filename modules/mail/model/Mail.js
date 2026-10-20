const { mongoose } = require("../../../model/db");
const schema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "UserModel", default: null },
  kind: { type: String, enum: ["message", "complaint", "request"], required: true },
  subject: { type: String, required: true, maxlength: 140 },
  body: { type: String, required: true, maxlength: 5000 },
  clientId: { type: String, required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Mail", default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserModel" }],
}, { collection: "Mail", timestamps: true });
schema.index({ recipient: 1, createdAt: -1 });
schema.index({ sender: 1, createdAt: -1 });
schema.index({ kind: 1, recipient: 1, createdAt: -1 });
schema.index({ sender: 1, clientId: 1 }, { unique: true });
module.exports = mongoose.models.Mail || mongoose.model("Mail", schema);

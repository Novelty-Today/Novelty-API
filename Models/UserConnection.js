const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userConnectionSchema = new Schema({
  inviter: { type: String, required: false },
  user: { type: String, required: true, unique: true },
  children: [{ type: String, required: false }],
  creationTime: { type: String, required: true },
});

const UserConnection = mongoose.model("UserConnection", userConnectionSchema);

module.exports = UserConnection;

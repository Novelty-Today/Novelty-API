const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  extraData: { type: Object, required: true },
  status: {
    type: String,
    required: true,
    enum: ["notSent", "sent", "recieved", "seen"],
  },
  sendTime: { type: Number, required: false, default: 0 },
  isGrouped: { type: Boolean, required: false, default: false },
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

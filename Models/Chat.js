const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatShema = new Schema({
  uuid: { type: String, required: true, unique: true },
  chatMembers: [
    {
      email: { type: String, required: true },
      username: { type: String, required: false },
      lastMessageSeen: { type: Boolean, required: true, default: true },
      isRemoved: { type: Boolean, required: false },
    },
  ],
  messages: [
    {
      type: {
        type: String,
        enum: [
          "message",
          "joinRequests",
          "invitationFromHost",
          "privateRequestPayment",
          "suggestedDate",
          "suggestedLocation",
          "moveToGroupChat",
          "zoomMeetingStarted",
        ],
        default: "message",
        required: false,
      },
      sender: { type: String, required: true },
      username: { type: String, required: false },
      message: { type: String, required: false },
      time: { type: String, required: true },
      media: { type: String, required: false },
      miniMedia: { type: String, required: false },
      voice: { type: String, required: false },
      edited: { type: Boolean, default: false },
      isDeleted: { type: Boolean, default: false },
      email: { type: String, required: false },
      invitationMedia: { type: String, required: false },
      // reply
      replyTo: {
        messageId: { type: String, required: false },
        sender: { type: String, required: false },
        message: { type: String, required: false },
        miniMedia: { type: String, required: false },
      },
      // for joinRequests
      eventId: { type: String, required: false },
      dateIdentifier: { type: String, required: false },
      // for suggestedDate and suggest location
      choices: [
        {
          locationObject: {
            name: { type: String, required: false },
            address: { type: String, required: false },
            location: { type: Object, required: false },
          },
          dateTime: { type: String, required: false },
          likedBy: [{ type: String, required: true }],
        },
      ],
      decidedDate: { type: String, required: false },
      decidedLocation: { type: String, required: false },
      suggestionCanceled: { type: Boolean, default: false },
    },
  ],
  type: {
    type: String,
    required: true,
    enum: ["private", "group"],
    default: "private",
  },
  eventId: { type: String, required: false },
  dateIdentifier: { type: String, required: false },
  eventName: { type: String, required: false },
  status: {
    type: String,
    required: true,
    enum: ["active", "disabled"],
    default: "active",
  },
});

const Chat = mongoose.model("Chat", chatShema);

module.exports = Chat;

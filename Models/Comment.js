const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentsSchema = new Schema({
  eventId: { type: String, required: false },
  comments: [
    {
      uuid: { type: String, required: true },
      email: { type: String, required: true },
      comment: { type: String, required: true },
      time: { type: String, required: true },
      replies: [
        {
          email: { type: String, required: true },
          comment: { type: String, required: true },
          time: { type: String, required: true },
        },
      ],
    },
  ],
});

const Comment = mongoose.model("Comment", commentsSchema);

module.exports = Comment;

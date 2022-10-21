const mongoose = require("mongoose");
const Comment = mongoose.model("Comment");
const { v4: uuidv4 } = require("uuid");

const addComment = (eventId, comment, user, time, uuid) => {
  return Comment.findOne({ eventId: eventId }).then((commentsObj) => {
    if (commentsObj) {
      let newComment = { email: user.email, comment: comment, time: time };
      if (uuid) {
        return Comment.findOneAndUpdate(
          { eventId: eventId, "comments.uuid": uuid },
          { $addToSet: { "comments.$.replies": newComment } }
        ).then(() => {
          return null;
        });
      } else {
        newComment.replies = [];
        newComment.uuid = uuidv4();

        return Comment.findOneAndUpdate(
          { eventId: eventId },
          { $addToSet: { comments: newComment } }
        )
          .then(() => {
            return newComment.uuid;
          })
          .catch((error) => {
            console.log("Error feafra ", error);
          });
      }
    } else {
      const commentObj = {
        email: user.email,
        comment: comment,
        time: time,
        replies: [],
        uuid: uuidv4(),
      };
      const newCommentObj = new Comment({
        eventId: eventId,
        comments: [commentObj],
      });

      return Comment.insertMany([newCommentObj])
        .then(() => {
          return commentObj.uuid;
        })
        .catch((error) => {
          console.log("Error aaffa ", error);
        });
    }
  });
};

module.exports = {
  addComment,
};

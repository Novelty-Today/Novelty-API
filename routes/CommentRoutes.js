const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Comment = mongoose.model("Comment");
const User = mongoose.model("User");
const { requireAuth } = require("../middlewares/requireAuth");

router.post("/getAllComments", requireAuth, (req, res) => {
  let usersList = [];
  let usersDict = {};
  let commentsListObj = { eventId: req.body.eventId, comments: [] };

  Comment.findOne({
    eventId: req.body.eventId,
  })
    .then((result) => {
      if (result) {
        commentsListObj = result;
      }

      commentsListObj.comments.forEach((comment) => {
        if (!usersList.includes(comment.email)) {
          usersList.push(comment.email);
          usersDict[comment.email] = { email: comment.email };
        }
        comment.replies.forEach((reply) => {
          if (!usersList.includes(reply.email)) {
            usersList.push(reply.email);
            usersDict[reply.email] = { email: reply.email };
          }
        });
      });

      return Promise.all(
        usersList.map((email) => {
          return User.findOne({ email: email }).then((user) => {
            usersDict[email] = {
              email: email,
              username: user.username,
              picture: user.microMedia,
            };
          });
        })
      );
    })
    .then(() => {
      let fullCommentsList = [];

      commentsListObj.comments.forEach((commentObj) => {
        let fullCommentObj = {
          author: usersDict[commentObj.email],
          comment: commentObj.comment,
          time: commentObj.time,
          uuid: commentObj.uuid,
          replies: [],
        };

        commentObj.replies.forEach((reply) => {
          fullCommentObj.replies.push({
            author: usersDict[reply.email],
            comment: reply.comment,
            time: reply.time,
          });
        });

        fullCommentsList.unshift(fullCommentObj);
      });

      res.send({ eventId: req.body.eventId, comments: fullCommentsList });
    })
    .catch((error) => {
      console.log("Error aeircaoprcarm83rc5+5+655", error);
      res.send({ eventId: req.body.eventId, comments: [] });
    });
});

module.exports = router;

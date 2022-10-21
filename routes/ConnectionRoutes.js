const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Friendship = mongoose.model("Friendship");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const ObjectId = require("mongodb").ObjectId;
const { requireAuth } = require("../middlewares/requireAuth");
const {
  openQuestionKeyToQuestionMap,
  closedQuestionFeedbackKeyToTextMap,
} = require("../DataLists/friendshipQuestions");

router.post("/getReview", requireAuth, (req, res) => {
  let connection = req.body.connection;
  let friendship;
  let friendIndex;
  let otherUser;

  Promise.all([
    Friendship.findOne({
      friends: {
        $all: [req.user.email, connection.email],
      },
    }),
    User.findOne({ email: connection.email }),
  ])
    .then(([friendshipData, userData]) => {
      friendship = friendshipData?.toObject();
      otherUser = userData.username ? userData.username : userData.email;

      friendIndex = friendship?.friends.findIndex(
        (user) => user != req.user.email
      );

      // Adding EventNames and questionTexts to Questions
      return Promise.all([
        ...friendship?.questionnaire[friendIndex].openQuestions.map(
          (question, index) => {
            return Event.findOne({ _id: ObjectId(question.eventId) }).then(
              (event) => {
                question.eventName = event?.name ? event.name : "Deleted";
                question.media = event?.miniMediaArray[0];
                question.question = openQuestionKeyToQuestionMap(
                  question.questionKey,
                  "questionText",
                  { username: otherUser }
                );
              }
            );
          }
        ),
        ...friendship?.questionnaire[friendIndex].closedQuestions.map(
          (question, index) => {
            question.question = closedQuestionFeedbackKeyToTextMap(
              question.questionKey,
              { answer: question.answer, friendName: otherUser }
            );
            return Promise.resolve();
          }
        ),
      ]);
    })
    .then((promiseArray) => {
      console.log(friendship);
      res.send({ friendship });
    })
    .catch((error) => console.log("1sdadv", error));
});

router.post("/getAllFeedbacks", requireAuth, (req, res) => {
  let friendship;
  let friendIndex;

  let finalData = { connection: {}, questionsAndAnswers: [] };

  return Promise.all([
    Friendship.findOne({
      friends: {
        $all: [req.user.email, req.body.email],
      },
    }),
    User.findOne({ email: req.body.email }),
  ])
    .then(([friendshipData, reviewerUser]) => {
      friendship = friendshipData?.toObject();

      finalData.connection = {
        email: reviewerUser.email,
        username: reviewerUser.username,
        media: reviewerUser.media,
        microMedia: reviewerUser.microMedia,
      };

      friendIndex = friendship?.friends.findIndex(
        (user) => user != req.user.email
      );

      friendship?.questionnaire[friendIndex].closedQuestions.forEach(
        (question) => {
          finalData.questionsAndAnswers.push({
            closedQuestion: closedQuestionFeedbackKeyToTextMap(
              question.questionKey,
              { answer: question.answer, friendName: reviewerUser.username }
            ),
            openQuestions: [],
            eventId: question.eventId,
            dateIdentifier: question.dateIdentifier,
            answerTime: question.answerTime,
          });
        }
      );

      finalData.questionsAndAnswers.forEach((questionObj) => {
        friendship?.questionnaire[friendIndex].openQuestions.forEach(
          (openQuestion) => {
            if (
              openQuestion.eventId == questionObj.eventId &&
              openQuestion.dateIdentifier == questionObj.dateIdentifier
            ) {
              questionObj.openQuestions.push({
                question: openQuestionKeyToQuestionMap(
                  openQuestion.questionKey,
                  "questionText",
                  { username: reviewerUser.username }
                ),
                answer: openQuestion.answer,
              });
            }
          }
        );
      });

      // Adding EventNames and questionTexts to Questions
      return Promise.all([
        ...finalData.questionsAndAnswers.map((questionObj, index) => {
          return Event.findOne({ _id: questionObj.eventId })
            .then((event) => {
              questionObj.eventName = event?.name ? event.name : "Deleted";
              questionObj.media = event?.miniMediaArray[0];
            })
            .catch((error) => {
              console.log("Error aifuayf7a ", error);
              questionObj.eventName = "Deleted";
              questionObj.media = null;
            });
        }),
      ]);
    })
    .then(() => {
      res.send(finalData);
    })
    .catch((error) => console.log("1sdadv", error));
});

module.exports = router;

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Friendship = mongoose.model("Friendship");
const Event = mongoose.model("Event");
const { v4: uuidv4 } = require("uuid");
const {
  getUserFriendshipInfo,
  getEmailListToReview,
  getFriendshipsNew,
} = require("../functions/friendshipFunctions");
const { requireAuth } = require("../middlewares/requireAuth");
const {
  createNotificationFeedback,
} = require("../functions/createNotificationFunctions");

router.post("/addFriendshipAnswer", requireAuth, (req, res) => {
  const email = req.body.email;
  const question = {
    questionKey: req.body.questionKey,
    answer: req.body.answer,
    answerTime: new Date().toUTCString(),
    eventId: req.body.eventId,
    dateIdentifier: req.body.dateIdentifier,
    questionNotificationTime: req.body.questionNotificationTime,
  };

  Friendship.findOne({ friends: { $all: [req.user.email, email] } })
    .then((friendship) => {
      if (friendship) {
        return Friendship.updateOne(
          {
            uuid: friendship.uuid,
            "questionnaire.email": req.user.email,
          },
          {
            $addToSet: {
              "questionnaire.$.closedQuestions": question,
            },
          }
        );
      } else {
        const newFriendship = Friendship({
          uuid: uuidv4(),
          friends: [req.user.email, email],
          questionnaire: [
            {
              email: req.user.email,
              closedQuestions: [question],
            },
            { email: email },
          ],
        });
        return newFriendship.save();
      }
    })
    .then(() => {
      return createNotificationFeedback(
        req.body.eventId,
        req.body.dateIdentifier,
        req.user,
        email
      );
    })
    .then(() => {
      res.send({ status: "success" });
    })
    .catch((error) => {
      console.log("error in /addFriendshipAnswer sfsgsgsg:: ", error);
      res.send({ status: "failed" });
    });
});

router.post("/addFriendshipOpenQuestionAnswers", requireAuth, (req, res) => {
  let openQuestionsList = [];
  const receiver = req.body.receiver;

  req.body.openQuestions.forEach((question) => {
    openQuestionsList.push({
      questionKey: question.questionKey,
      questionNotificationTime: req.body.questionNotificationTime,
      answer: question.answer,
      answerTime: new Date().toUTCString(),
      eventId: req.body.eventId,
      dateIdentifier: req.body.dateIdentifier,
    });
  });

  Friendship.findOne({ friends: { $all: [req.user.email, receiver] } })
    .then((friendship) => {
      if (friendship) {
        return Friendship.updateOne(
          {
            uuid: friendship.uuid,
            "questionnaire.email": req.user.email,
          },
          {
            $addToSet: {
              "questionnaire.$.openQuestions": { $each: openQuestionsList },
            },
          }
        );
      } else {
        const newFriendship = Friendship({
          uuid: uuidv4(),
          friends: [req.user.email, receiver],
          questionnaire: [
            {
              email: req.user.email,
              openQuestions: openQuestionsList,
            },
            { email: receiver },
          ],
        });
        return newFriendship.save();
      }
    })
    .then(() => {
      res.send({ status: "success" });
    })
    .catch((error) => {
      console.log("error in /addFriendshipAnswer adf7Xsafu8 : ", error);
      res.send({ status: "failed" });
    });
});

router.post("/getGuestFriendshipStatuses", requireAuth, (req, res) => {
  let eventData;

  Event.findById(req.body.eventId)
    .then((event) => {
      eventData = event;
      // gets email list of host, cohost and people who are accepted for that date
      const emailListToReview = getEmailListToReview(
        event,
        req.body.dateIdentifier,
        req.user.email
      );

      // gets friendship statuses between user who called route and people to review
      return Promise.all(
        emailListToReview.map((email) => {
          return getUserFriendshipInfo(
            req.user.email,
            email,
            req.body.eventId,
            req.body.dateIdentifier
          );
        })
      );
    })
    .then((guestFriendships) => {
      let pendingReviews = [];

      // if there is no question to ask to user we don't send it in response
      guestFriendships.forEach((element) => {
        if (element.question) {
          pendingReviews.push(element);
        }
      });

      return res.send({
        status: "success",
        pendingReviews,
        miniMedia: eventData ? eventData.miniMediaArray[0] : null,
      });
    })
    .catch((error) => {
      console.log("Error uihiudataff ", error);
      return res.send({ status: "fail", pendingReviews: [] });
    });
});

router.get("/getFriendsNew/:email", requireAuth, (req, res) => {
  let email = req.params.email;

  getFriendshipsNew(email)
    .then((result) => {
      let [friends, status] = result;
      if (status == "success") {
        res.send({
          status: "success",
          friends: friends,
        });
      } else {
        throw new Error("last block error dkdkdjnsj");
      }
    })
    .catch((error) => {
      console.log("erffmckfnvslv", error);
      res.send({ status: "failed" });
    });
});

module.exports = router;

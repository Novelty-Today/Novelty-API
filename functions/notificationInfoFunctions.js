const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const Friendship = mongoose.model("Friendship");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const {
  mongoFindOne,
  mongoFind,
  mongoFindOneSpecificField,
} = require("./mongodbDriver");
const { buildFoundEvent, buildMiniEvent } = require("../functions/buildEvent");
const {
  checkIfUserIsReviewed,
  getClosedQuestionFeedback,
  getOpenedQuestionFeedback,
} = require("./friendshipFunctions");
const { getGuest, getGuestsDataFromEvent } = require("./guestGetterFunctions");

const handleFeedbackAboutYouNotification = (req, res) => {
  return Promise.all([
    User.findOne({ email: req.body.reviewer }),
    Friendship.findOne({
      friends: { $all: [req.body.reviewer, req.user.email] },
    }),
    Event.findById(req.body.eventId),
  ])
    .then(([reviewer, friendship, event]) => {
      // event does not exist
      if (!event) {
        res.send({ status: "fail", message: "Event was deleted." });
      }
      // event exists, getting friendship data
      else {
        // check if this user is already reviewed
        const myQuestionsIndex =
          friendship.questionnaire[0].email == req.user.email ? 0 : 1;
        let isReviewed = checkIfUserIsReviewed(
          friendship.questionnaire[myQuestionsIndex].closedQuestions,
          req.body.eventId,
          req.body.dateIdentifier
        );

        // if reviewed get data to show review from user
        if (isReviewed) {
          const reviewerIndex =
            friendship.questionnaire[0].email == req.user.email ? 1 : 0;

          res.send({
            status: "success",
            isReviewed: true,
            closedQuestionAnswer: getClosedQuestionFeedback(
              friendship,
              reviewerIndex,
              req.body.eventId,
              req.body.dateIdentifier,
              reviewer
            ),
            openQuestionsList: getOpenedQuestionFeedback(
              friendship,
              reviewerIndex,
              req.body.eventId,
              req.body.dateIdentifier,
              reviewer
            ),
            eventName: event.name,
            reviewer: {
              email: reviewer.email,
              username: reviewer.username,
              media: reviewer.media,
              microMedia: reviewer.microMedia,
              friendshipStatus: friendship.friendshipStatus(),
              friendshipPercentage: friendship.friendshipStatus("percentage"),
            },
          });
        }
        // user is not yet reviewed we show alert to review user
        else {
          res.send({
            status: "success",
            isReviewed: false,
            reviewer: reviewer.username ? reviewer.username : reviewer.email,
          });
        }
      }
    })
    .catch((error) => {
      console.log("Error afiayf ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
};

const handleGeneralNotificationWithEvent = (req, res) => {
  let event;
  mongoFindOne("events", { _id: ObjectId(req.body.eventId) })
    .then((eventData) => {
      event = eventData;

      if (event) {
        return Promise.all([
          mongoFindOne("users", { email: event.organiser }),
          mongoFind("favorites", { eventId: event._id + "" }),
        ]);
      }
    })
    .then(([organiser, favoritesArray]) => {
      if (event) {
        const info = buildFoundEvent(
          event,
          req.body.dateIdentifier,
          organiser,
          req.user,
          favoritesArray
        );
        res.send({ message: "success", info: info });
      } else {
        res.send({ message: "Event was deleted by organiser." });
      }
    })
    .catch((error) => {
      console.log("Error fadhiuy ", error);
      res.send({ message: "Something went wrong. Please try again." });
    });
};

const handleGeneralNotification = (req, res) => {
  return Event.findById(req.body.eventId)
    .then((event) => {
      if (event) {
        return User.findOne({ email: event.organiser }).then((user) => {
          res.send({
            message: "success",
            info: {
              username: user.username,
              eventName: event.name,
              isOld: event.isOld,
            },
          });
        });
      } else {
        res.send({ message: "Event was canceled by organiser." });
      }
    })
    .catch((error) => {
      console.log("Error jiB*(^&%% ", error);
      res.send({ message: "Something went wrong. Please try again." });
    });
};

const handlePrivateEventGuestRequestAnswer = (req, res) => {
  return Promise.all([
    mongoFindOne("orders", {
      eventId: req.body.eventId,
      dateIdentifier: req.body.dateIdentifier,
      email: req.user.email,
    }),
    mongoFindOneSpecificField("events", { _id: ObjectId(req.body.eventId) }),
  ])
    .then(([order, event]) => {
      const dateObject = getDateObjectWithIdentifier(
        event.dateObjects,
        req.body.dateIdentifier
      );
      res.send({
        status: "success",
        hasOrder: order ? true : false,
        dateObject,
      });
    })
    .catch((error) => {
      console.log("Error jiB*(^&%% ", error);
      res.send({ message: "Something went wrong. Please try again." });
    });
};

const handleGeneralNotificationMiniEvent = (req, res) => {
  mongoFindOne("events", { _id: ObjectId(req.body.eventId) })
    .then((eventData) => {
      const event = buildMiniEvent(eventData);
      res.send({
        status: "success",
        event: event,
      });
    })
    .catch((error) => {
      console.log("Error gdytgda6yf ", error);
      res.send({ message: "Something went wrong. Please try again." });
    });
};

const handleConfirmationNotification = (req, res, guestEmail) => {
  mongoFindOne("events", { _id: ObjectId(req.body.eventId) })
    .then((eventData) => {
      const guestData = getGuestsDataFromEvent(
        eventData,
        req.body.dateIdentifier
      );
      const event = buildMiniEvent(eventData, {
        guestCount: guestData?.guestCount,
      });
      const guest = getGuest(eventData, guestEmail, req.body.dateIdentifier);

      res.send({
        status: "success",
        guest,
        event,
      });
    })
    .catch((error) => {
      console.log("Error gdagiudat6y ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
};

module.exports = {
  handleFeedbackAboutYouNotification,
  handleGeneralNotification,
  handleGeneralNotificationWithEvent,
  handlePrivateEventGuestRequestAnswer,
  handleGeneralNotificationMiniEvent,
  handleConfirmationNotification,
};

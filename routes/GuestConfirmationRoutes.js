const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const { requireAuth } = require("../middlewares/requireAuth");
const {
  getGuestId,
  getGuestsCount,
} = require("../functions/guestGetterFunctions");
const {
  removeGuestFromEvent,
  guestConfirmationErrorHandling,
  handleGuestAttendanceConfirmation,
} = require("../functions/guestConfirmationFunctions");
const { createOrder } = require("../functions/orders");
const { mongoFindOne } = require("../functions/mongodbDriver");
const { htmlPage } = require("../miniHTMLpages/htmlPagePaths");

// for handling notification from app
router.post("/confirmActivityAttendance", requireAuth, (req, res) => {
  Event.findById(req.body.eventId)
    .then((event) => {
      return handleGuestAttendanceConfirmation(
        res,
        req.user,
        event,
        req.body.dateIdentifier,
        req.body.confirmed,
        false
      );
    })
    .catch((error) => {
      console.log("Error aoufy87^%$& ", error);

      res.send({
        status: "fail",
        message: error?.message ?? "Something went wrong. Please try again.",
      });
    });
});

// for handling link from mail
router.get("/attendanceConfirmation/:email/:notificationId", (req, res) => {
  let user;
  let notification;

  User.findOne({ email: req.params.email })
    .then((userData) => {
      user = userData;
      notification = user.notifications.find(
        (item) => item._id == req.params.notificationId
      );

      return Event.findById(notification.extraData.eventId);
    })
    .then((event) => {
      return handleGuestAttendanceConfirmation(
        res,
        user,
        event,
        notification.extraData.dateIdentifier,
        true,
        true
      );
    })
    .catch((error) => {
      console.log("Error aougsgsfy87^%$& ", error);

      res.sendFile(htmlPage.somethingWentWrong);
    });
});

router.post("/decidePlaceToWaitlist", requireAuth, (req, res) => {
  let event;
  Event.findById(req.body.eventId)
    .then((eventData) => {
      event = eventData;

      let guestId = getGuestId(event, req.body.email, req.body.dateIdentifier);

      if (guestId) {
        if (req.body.confirmed === true) {
          return Event.findOneAndUpdate(
            { eventId: ObjectId(req.body.eventId), "guests._id": guestId },
            { $set: { "guests.$.priorityQueue": req.body.confirmed } }
          );
        } else if (req.body.confirmed === false) {
          return mongoFindOne("users", { email: req.body.email }).then(
            (user) => {
              return removeGuestFromEvent(event, req.body.dateIdentifier, user);
            }
          );
        }
      } else {
        throw new Error("guest");
      }
    })
    .then(() => {
      res.send({
        status: "success",
        message: req.body.confirmed
          ? "The guest was placed to priority queue."
          : "The guest was removed from the wailist.",
      });
    })
    .catch((error) => {
      console.log("Error aoufy87^%$& ", error);

      if (error?.message == "guest") {
        res.send({
          status: "fail",
          message: "You can no longer accept to waitlist.",
        });
      } else {
        res.send({
          status: "fail",
          message: "Something went wrong. Please try again.",
        });
      }
    });
});

router.post("/finalWaitlistConfirmation", requireAuth, (req, res) => {
  let event;
  let added = false;
  let idAndStatus;

  Event.findById(req.body.eventId)
    .then((eventData) => {
      event = eventData;
      idAndStatus = guestConfirmationErrorHandling(
        event,
        req.user.email,
        req.body.dateIdentifier
      );

      // we can create order and become accepted user
      if (
        req.body.confirmed === true &&
        getGuestsCount(event, req.body.dateIdentifier) < event.capacity
      ) {
        added = true;
        return Promise.all([
          createOrder(req.user, req.body.eventId, req.body.dateIdentifier, 1),
          Event.findOneAndUpdate(
            {
              eventId: ObjectId(req.body.eventId),
              "guests._id": idAndStatus.guestId,
            },
            { $set: { "guests.$.status": "accepted" } }
          ),
        ]);
      }
      // capacity reached
      else if (
        req.body.confirmed === true &&
        getGuestsCount(event, req.body.dateIdentifier) >= event.capacity
      ) {
        throw new Error("Event is already full.");
      }
      // removing from guests
      else {
        return removeGuestFromEvent(event, req.body.dateIdentifier, req.user);
      }
    })
    .then(() => {
      res.send({ status: "success", added });
    })
    .catch((error) => {
      console.log("Error aoufy87^%$& ", error);

      res.send({
        status: "fail",
        message: error?.message ?? "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

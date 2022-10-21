const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const { requireAuth } = require("../middlewares/requireAuth");
const { finishActivity } = require("../functions/event");
const {
  handleDynamicLinkToken,
} = require("../functions/InvitationDynamicLinkHandler");
const { getGuest } = require("../functions/guestGetterFunctions");
const {
  createNotificationActivityInvitation,
  createNotificationRemovedFromGuests,
} = require("../functions/createNotificationFunctions");
const {
  removeGuestFromEvent,
} = require("../functions/guestConfirmationFunctions");
const { sendChatUpdateSignal } = require("../sockets/chatSockets");

router.post("/removeAcceptedUser", requireAuth, (req, res) => {
  return Promise.all([
    Event.findById(req.body.eventId),
    User.findOne({ email: req.body.email }),
  ])
    .then(([event, user]) => {
      if (!event || event.organiser != req.user.email) {
        return res.send({
          status: "fail",
          message: "You can not delete this guest.",
        });
      } else {
        return removeGuestFromEvent(
          event,
          req.body.dateIdentifier,
          user,
          "rejected"
        ).then(() => {
          createNotificationRemovedFromGuests(
            event,
            req.body.dateIdentifier,
            req.body.email,
            req.user
          );
          res.send({ status: "success" });
        });
      }
    })
    .catch((error) => {
      console.log("Error i98t67fgkvu5 ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/finishActivity", requireAuth, (req, res) => {
  Event.findOne({ _id: req.body.eventId })
    .then((eventData) => {
      if (!eventData) {
        return res.send({
          status: "fail",
          message: "No event.",
        });
      } else if (eventData?.organiser != req.user?.email) {
        return res.send({
          status: "fail",
          message: "You are not host of this event.",
        });
      } else if (
        eventData.finishedDateIdentifiers.includes(
          req.body.dateObject.dateIdentifier
        ) ||
        eventData?.isOld
      ) {
        return res.send({
          status: "fail",
          message: "Event is already finished.",
        });
      } else {
        let setData = {};
        if (
          eventData.dateObjects.length ==
          eventData.finishedDateIdentifiers.length + 1
        ) {
          setData = { isOld: true, displayOnHomeScreen: false };
        }
        finishActivity(
          req.body.eventId,
          req.body.dateObject.dateIdentifier,
          setData
        )
          .then(() => {
            return res.send({
              status: "success",
              message: "Event finished successfully.",
            });
          })
          .catch((error) => {
            console.log("Error iuafhya8fya7fa65 ", error);
            return res.send({
              status: "fail",
              message: "Could not finish event. Please try again.",
            });
          });
      }
    })
    .catch((error) => {
      console.log("vjnf", error);
      res.send({
        status: "fail",
        message: "Some Error.",
      });
    });
});

router.post("/activateToken", requireAuth, (req, res) => {
  handleDynamicLinkToken(req.body.token, req.user)
    .then((data) => {
      res.send(data);
    })
    .catch(() => {
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/inviteUserToActivity", requireAuth, (req, res) => {
  // req body => eventId, dateIdentifier, email, invitedAs (coHost or guest)
  let eventData;
  let isInvited = false;

  Event.findOne({ _id: req.body.eventId })
    .then((event) => {
      eventData = event;
      isInvited = getGuest(event, req.body.email, req.body.dateIdentifier);

      if (!isInvited) {
        let guestObj = {
          email: req.body.email,
          coHost: req.body.invitedAs == "coHost",
          addedBy:
            eventData.organiser == req.user.email ? "organiser" : "coHost",
          time: new Date().toUTCString(),
        };

        if (req.body.invitedAs == "guest") {
          guestObj.dateIdentifier = req.body.dateIdentifier;
        }

        return Event.findOneAndUpdate(
          { _id: req.body.eventId },
          {
            $push: { guests: guestObj },
          }
        );
      }
    })
    .then(() => {
      if (isInvited) {
        res.send({
          status: "fail",
          message: "User has been already invited.",
        });
      } else {
        createNotificationActivityInvitation(
          eventData,
          req.body.dateIdentifier,
          req.body.invitedAs,
          req.body.email,
          null,
          req.user
        );

        res.send({
          status: "success",
          message: "User has been invited.",
        });
      }
    })
    .catch((error) => {
      console.log("Error aijgfa$^$ ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/cancelActivityInvitation", requireAuth, (req, res) => {
  let guest;

  Event.findOne({ _id: req.body.eventId })
    .then((event) => {
      eventData = event;

      guest = getGuest(event, req.body.email, req.body.dateIdentifier);

      if (guest.status == "waitlisted") {
        return Event.findOneAndUpdate(
          { _id: req.body.eventId },
          { $pull: { guests: { _id: guest._id } } }
        );
      }
    })
    .then(() => {
      if (guest.status == "waitlisted") {
        sendChatUpdateSignal([req.user.email, req.body.email], {
          eventId: req.body.eventId,
          dateIdentifier: req.body.dateIdentifier,
        });

        res.send({
          status: "success",
          message: "Invitation has been cancelled.",
        });
      } else {
        res.send({
          status: "fail",
          message: "Invitation has already been answered.",
        });
      }
    })
    .catch((error) => {
      console.log("Error aijgfa$^$ ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

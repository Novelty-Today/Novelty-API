const express = require("express");
const router = express.Router();
const ObjectId = require("mongodb").ObjectId;
const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const Chat = mongoose.model("Chat");
const { requireAuth } = require("../middlewares/requireAuth");
const { updateRequestInChat } = require("../functions/organiser");
const {
  getGuestsUpdated,
  getGuestStatus,
  getGuest,
  getGuestsAndOrganisers,
} = require("../functions/guestGetterFunctions");
const { notifyHostAboutGuestRequest } = require("../functions/guestFunctions");
const {
  handleNewGuestAnswer,
  getResponseMessage,
} = require("../functions/newGuestFunctions");
const { modifyMyEventWithSocket } = require("../sockets/EventSockets");
const { getDateObjectWithIdentifier } = require("../functions/dateComparisons");
const {
  mongoFindOneSpecificField,
  mongoFindOne,
} = require("../functions/mongodbDriver");
const { leaveEventHandler } = require("../functions/leaveEventFunctions");

router.post("/joinRequestForPrivateEvent", requireAuth, (req, res) => {
  let event;
  let requestIsAlreadySent = false;

  Event.findById(req.body.eventId)
    .then((eventData) => {
      event = eventData;
      if (eventData) {
        const guest = getGuest(event, req.user.email, req.body.dateIdentifier);

        if (!guest) {
          return Event.findOneAndUpdate(
            { _id: req.body.eventId },
            {
              $push: {
                guests: {
                  email: req.user.email,
                  dateIdentifier: req.body.dateIdentifier,
                  time: new Date().toUTCString(),
                },
              },
            },
            {
              new: true,
            }
          );
        } else {
          requestIsAlreadySent = true;
        }
      }
    })
    .then(() => {
      if (event && !requestIsAlreadySent) {
        return Promise.all([
          notifyHostAboutGuestRequest(
            event,
            req.body.eventId,
            req.body.dateIdentifier,
            req.user
          ),
          modifyMyEventWithSocket(
            req.body.eventId,
            getDateObjectWithIdentifier(
              event.dateObjects,
              req.body.dateIdentifier
            )
          ),
        ]);
      }
    })
    .then(() => {
      if (!event) {
        res.send({
          status: "fail",
          message: "Event was deleted by organiser.",
        });
      } else if (requestIsAlreadySent) {
        res.send({
          message: "Request is already sent.",
          status: "fail",
        });
      } else {
        res.send({ status: "success" });
      }
    })
    .catch((error) => {
      console.log("Error afjkeofaefialfa3838339", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/cancelPrivateRequest", requireAuth, (req, res) => {
  let guestObj = null;
  Event.findOne({ _id: req.body.eventId })
    .then((event) => {
      event.guests.forEach((guest) => {
        if (
          guest.email == req.user.email &&
          guest.dateIdentifier == req.body.dateIdentifier &&
          guest.status == "waitlisted"
        ) {
          guestObj = guest;
        }
      });

      if (guestObj?.status == "waitlisted" || !guestObj) {
        return Promise.all([
          Event.findOneAndUpdate(
            { _id: req.body.eventId },
            {
              $pull: {
                guests: {
                  email: req.user.email,
                  dateIdentifier: req.body.dateIdentifier,
                },
              },
            }
          ),
          updateRequestInChat(req.user.email, event.organiser, req.body),
        ]);
      }
    })
    .then(([event, updateRequest]) => {
      if (guestObj?.status == "waitlisted" || !guestObj) {
        modifyMyEventWithSocket(
          req.body.eventId,
          getDateObjectWithIdentifier(
            event.dateObjects,
            req.body.dateIdentifier
          )
        );

        res.send({
          status: "success",
          message: `Request has been cancelled.`,
        });
      } else if (guestObj?.status == "rejected") {
        res.send({
          status: "success",
          message: `Request is already cancelled.`,
        });
      } else {
        throw new Error();
      }
    })
    .catch((error) => {
      console.log("Error 65rd^R ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.get("/getGuests/:eventId/:dateIdentifier", requireAuth, (req, res) => {
  if (
    req.params.eventId &&
    req.params.dateIdentifier &&
    req.params.eventId != "undefined"
  ) {
    return mongoFindOneSpecificField("events", {
      _id: ObjectId(req.params.eventId),
    })
      .then((event) => {
        if (!event)
          throw new Error("Could not find Event. May be Event was deleted");

        isHost = event?.organiser == req.user.email;

        return getGuestsUpdated(event, req.params.dateIdentifier, isHost);
      })
      .then((guestData) => {
        res.send({
          status: "success",
          accepted: guestData.accepted,
          waitlist: guestData.waitlist,
          eventId: req.params.eventId,
          dateIdentifier: req.params.dateIdentifier,
        });
      })
      .catch((error) => {
        console.log("Error afljafaicaada", error);
        res.send({ status: "fail" });
      });
  } else {
    res.send({ status: "fail" });
  }
});

router.post("/handleNewGuestAnswer", requireAuth, async (req, res) => {
  try {
    // REQUIRED PARAMS: eventId, dateIdentifier, status
    // OPTIONAL PARAMS FOR INVITATION: hostEmail
    // OPTIONAL PARAMS FOR REQUEST: guestEmail

    let requesterUserObj;
    let hostUserObj; // can be also cohost

    const searchUserEmail = req.body.guestEmail
      ? req.body.guestEmail
      : req.body.hostEmail;

    const [event, searchUserData, chat] = await Promise.all([
      mongoFindOne("events", { _id: ObjectId(req.body?.eventId) }),
      mongoFindOne("users", { email: searchUserEmail }),
      mongoFindOne("chats", {
        "chatMembers.email": { $all: [searchUserEmail, req.user.email] },
        type: "private",
      }),
    ]);

    // Caution: in if below there should not be deteIdentifier because co-hosts does not have => results in bug
    if (req.user.email == event.organiser) {
      hostUserObj = req.user;
      requesterUserObj = searchUserData;
    } else {
      hostUserObj = searchUserData;
      requesterUserObj = req.user;
    }

    const guest = getGuest(event, requesterUserObj?.email, req.body.dateIdentifier);

    // event deleted
    if (!event) {
      res.send({ status: "fail", message: "Event is deleted" });
    }
    // user is not host and can not accept request
    else if (
      event &&
      guest?.addedBy == "user" &&
      event.organiser != req.user.email
    ) {
      res.send({
        status: "fail",
        message: "You are not a host of this event.",
      });
    }
    // user is not guest and can not answer invitation
    else if (
      event &&
      guest?.addedBy != "user" &&
      guest.email != req.user.email
    ) {
      res.send({
        status: "fail",
        message: "You are not a guest of this event.",
      });
    }
    // invitation / request can be answered.
    else {
      await handleNewGuestAnswer(
        event,
        req.body.dateIdentifier,
        chat,
        req.body.status,
        hostUserObj,
        requesterUserObj
      );
      const message = getResponseMessage(
        event,
        req.body.dateIdentifier,
        requesterUserObj,
        req.body.status
      );

      res.send({ status: "success", message: message });
    }
  } catch (error) {
    console.log("Error faic436^^cod 3ac", error);
    if (error.message) error = error.message;
    res.send({ status: "fail", message: error });
  }
});

router.post("/leaveEvent", requireAuth, (req, res) => {
  // REQUIRED PARAMS: eventId, dateObject

  mongoFindOne("events", { _id: ObjectId(req.body?.eventId) })
    .then((event) => {
      const status = getGuestStatus(
        event,
        req.user.email,
        req.body.dateObject.dateIdentifier,
        true
      );

      // accepted guest
      if (status == "accepted") {
        return leaveEventHandler(
          event,
          req.body.dateObject.dateIdentifier,
          req.user
        ).then(() => {
          res.send({ status: "success", message: "You left event." });
        });
      }
      // already rejected or not found in guests
      else if (status == "rejected" || status == false) {
        res.send({
          status: "success",
          message: "You are not a participant of this event.",
        });
      }
      //
      else {
        res.send({
          status: "fail",
          message: "Something went wrong. Please try again.",
        });
      }
    })
    .catch((error) => {
      console.log("Error gdauygfad8ty7ad", error);
      res.send({
        status: "fail",
        message:
          errorerror.message ?? "Something went wrong. Please try again.",
      });
    });
});

router.get("/getUserStatusOnEvent/:eventId", requireAuth, (req, res) => {
  mongoFindOneSpecificField("events", { _id: ObjectId(req.params.eventId) })
    .then((event) => {
      let data = {
        dateIdentifiersRequested: [],
        dateIdentifiersInvited: [],
      };
      event.guests.forEach((guest) => {
        if (guest.email == req.user.email) {
          // if coHost we mark user as invited on all dates because user can not request to become coHost
          if (guest.coHost) {
            event.dateObjects.forEach((dateObject) => {
              data.dateIdentifiersInvited.push(dateObject.dateIdentifier);
            });
          }
          //@ if added by user it means user requested to join
          else if (!guest.coHost && guest.addedBy == "user") {
            data.dateIdentifiersRequested.push(guest.dateIdentifier);
          }
          // user is invited as guest
          else {
            data.dateIdentifiersInvited.push(guest.dateIdentifier);
          }
        }
      });
      res.send({ status: "success", data: data });
    })
    .catch((error) => {
      console.log("Error afjaghiu67  ", error);
      res.send({ status: "fail" });
    });
});

router.get(
  "/getGuestInfo/:eventId/:dateIdentifier/:email",
  requireAuth,
  (req, res) => {
    mongoFindOneSpecificField("events", { _id: ObjectId(req.params.eventId) })
      .then((event) => {
        const guest = getGuest(
          event,
          req.params.email,
          req.params.dateIdentifier
        );

        res.send({ status: "success", guest: guest });
      })
      .catch((error) => {
        console.log("Error afjaghiu67  ", error);
        res.send({ status: "fail", guest: null });
      });
  }
);

module.exports = router;

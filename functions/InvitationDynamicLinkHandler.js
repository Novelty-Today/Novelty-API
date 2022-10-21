const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const ObjectId = require("mongodb").ObjectId;
const { MY_SECRET_KEY } = require("../constants");
const jwt = require("jsonwebtoken");
const {
  sendUpdateMyEventsInSocket,
  sendNewUpcomingsInSocket,
} = require("../sockets/EventSockets");
const { getEventDataWithLinks } = require("./buildEvent");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const {
  createNotificationInvitationAnswered,
} = require("./createNotificationFunctions");
const { sendChatUpdateSignal } = require("../sockets/chatSockets");
const { mongoFindOne } = require("./mongodbDriver");
const { getGuest, getGuestWithPhone } = require("./guestGetterFunctions");

const handleDynamicLinkToken = (token, user) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, MY_SECRET_KEY, (error, payload) => {
      if (error) {
        console.log("handleDynamicLinkTokenForCoHost Error", error);
        return null;
      }

      const { type, eventId, dateIdentifier, email, phone } = payload;

      if (type == "addCoHost" || type == "addGuest") {
        handleActivityInvitationToken(
          user,
          type,
          eventId,
          dateIdentifier,
          email,
          phone
        ).then((data) => {
          resolve(data);
        });
      } else {
        resolve({
          status: "fail",
          message: "Invalid token.",
        });
      }
    });
  });
};

const handleActivityInvitationToken = (
  user,
  type,
  eventId,
  dateIdentifier,
  email,
  phone
) => {
  let filter = { _id: eventId };
  if (phone) {
    filter["guests.phone"] = phone;
  } else {
    filter["guests.email"] = email;
  }

  return mongoFindOne("events", { _id: ObjectId(eventId) })
    .then((event) => {
      // event does not exist
      if (!event) {
        return {
          status: "fail",
          type: type,
          message: "Event no longer exists.",
        };
      }

      let guest = email
        ? getGuest(event, email, dateIdentifier)
        : getGuestWithPhone(event, phone, dateIdentifier);
      let isValidInvitedGuest = getIsValidInvitedGuest(user, email, phone);

      // Case 1: We successfully add a user to accepted guests
      if (guest.status == "waitlisted" && isValidInvitedGuest) {
        return Event.findOneAndUpdate(
          filter,
          {
            $set: {
              "guests.$.status": "accepted",
              "guests.$.email": user.email,
            },
          },
          { new: true }
        ).then((eventData) => {
          sendInvitationAnswered(eventData, dateIdentifier, user, type);

          return getEventDataWithLinks(
            eventId,
            dateIdentifier ? dateIdentifier : "Closest date",
            user.email
          ).then((eventObject) => {
            return {
              status: "success",
              type: type,
              message: `You have become a ${
                type == "addCoHost" ? "cohost" : "guest"
              } of the event ${event.name}`,
              eventId: eventId,
              isOld: eventObject.isOld,
              event: eventObject,
            };
          });
        });
      } // Case 2: Either guest is already accepted or rejected. Or, not a valid guest.
      else {
        return getEventDataWithLinks(
          eventId,
          dateIdentifier ? dateIdentifier : "Closest date",
          user.email
        ).then((eventObject) => {
          let message = "";

          if (isValidInvitedGuest) {
            message =
              guest.status == "accepted"
                ? `You are already a ${guest?.coHost ? "co-host" : "guest"}.`
                : "You already declined invitation or it was cancelled by the host.";
          } else {
            message =
              "The link you are using is associated with another account.";
          }

          return {
            status:
              guest.status == "accepted" && isValidInvitedGuest
                ? "success"
                : "fail",
            type: type,
            message: message,
            eventId: eventId,
            isOld: eventObject.isOld,
            event: eventObject,
          };
        });
      }
    })
    .catch((error) => {
      console.log("Error jashf8a767567 ", error);
      return {
        status: "fail",
        type: type,
        message: "We could not add you on event. please try again.",
      };
    });
};

const getIsValidInvitedGuest = (user, email, phone) => {
  // returns true if invited user with link is same as one who opened the app with link
  return user.email == email || !email;
};

const sendInvitationAnswered = (event, dateIdentifier, user, type) => {
  // send notification
  createNotificationInvitationAnswered(
    event,
    dateIdentifier,
    event.organiser,
    user
  );

  if (type == "addCoHost") {
    sendUpdateMyEventsInSocket(user, event._id + "", null, true);
  } else {
    sendNewUpcomingsInSocket(
      user,
      event._id + "",
      getDateObjectWithIdentifier(event.dateObjects, dateIdentifier),
      true
    );
  }

  sendChatUpdateSignal([user.email, event.organiser], {
    eventId: event._id + "",
    dateIdentifier: dateIdentifier,
  });
};

module.exports = { handleDynamicLinkToken };

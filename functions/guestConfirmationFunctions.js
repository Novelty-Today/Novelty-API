const { htmlPage } = require("../miniHTMLpages/htmlPagePaths");
const { sendChatUpdateSignal } = require("../sockets/ChatSockets");
const ObjectId = require("mongodb").ObjectId;
const {
  sendNewUpcomingsInSocket,
  modifyMyEventWithSocket,
  removeChatFromChatList,
  sendUpdateMyEventsInSocket,
} = require("../sockets/EventSockets");
const {
  createNotificationPriorityWaitlist,
} = require("./createNotificationFunctions");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const {
  getGuestId,
  getGuestStatus,
  getGuest,
} = require("./guestGetterFunctions");
const { mongoFindOneAndUpdate, mongoUpdateOne } = require("./mongodbDriver");
const { createOrder } = require("./orders");

const removeGuestFromEvent = (
  event,
  dateIdentifier,
  guestUserObj,
  moveTo = null // 'rejected', 'waitlisted'
) => {
  let promiseArray = [];
  const guest = getGuest(event, guestUserObj.email, dateIdentifier);

  if (moveTo == "rejected" || moveTo == "waitlisted") {
    promiseArray.push(
      mongoUpdateOne(
        "events",
        {
          _id: ObjectId(event._id + ""),
          "guests._id": ObjectId(guest._id + ""),
        },
        {
          $set: {
            "guests.$": {
              ...guest,
              status: moveTo,
              wasPreviouslyAccepted: true,
            },
          },
        }
      )
    );
  } else {
    promiseArray.push(
      mongoUpdateOne(
        "events",
        { _id: ObjectId(event._id + "") },
        {
          $pull: {
            guests: { _id: ObjectId(guest._id + "") },
          },
        }
      )
    );
  }

  promiseArray.push(
    mongoFindOneAndUpdate(
      "chats",
      {
        eventId: event._id + "",
        dateIdentifier: dateIdentifier,
        "chatMembers.email": guestUserObj.email,
      },
      { $set: { "chatMembers.$.isRemoved": true } }
    )
  );

  promiseArray.push(
    mongoFindOneAndUpdate(
      "orders",
      {
        eventId: event._id + "",
        dateIdentifier: dateIdentifier,
        email: guestUserObj.email,
      },
      { $set: { tickets: { status: "cancelled" } } }
    )
  );

  return Promise.all(promiseArray)
    .then(([eventData, chat, order]) => {
      const dateObject = getDateObjectWithIdentifier(
        event.dateObjects,
        dateIdentifier
      );

      // update event in frontend with sockets
      modifyMyEventWithSocket(event._id + "", dateObject);

      // if user is cohost update my events tab
      if (guest.coHost) {
        event.dateObjects.forEach((dateObj) => {
          sendUpdateMyEventsInSocket(
            guestUserObj,
            event._id + "",
            dateObj,
            false
          );
        });
      }
      // if user is guest update upcomings
      else {
        sendNewUpcomingsInSocket(
          guestUserObj,
          event._id + "",
          dateObject,
          false
        );
      }

      // sends signal to update chat message components if chat is opened
      // example: if user has opened chat app will get live update for payment button so user can not click pay when host already removed guest
      sendChatUpdateSignal([guestUserObj.email], {
        eventId: event._id + "",
        dateIdentifier: dateIdentifier,
      });

      // sends signal to removed guest to remove group chat
      if (chat) removeChatFromChatList([guestUserObj.email], chat.uuid);
    })
    .catch((error) => console.log("fmkvjfg3", error));
};

const guestConfirmationErrorHandling = (event, email, dateIdentifier) => {
  if (!event) {
    throw new Error(
      "Could not find event. It was probably deleted by organiser."
    );
  }
  const guestId = getGuestId(event, email, dateIdentifier);
  const status = getGuestStatus(event, email, dateIdentifier, true);

  if (!guestId || status == "rejected") {
    throw new Error("You are no longer a participant of this event.");
  }

  return { guestId, status };
};

const handleGuestAttendanceConfirmation = (
  res,
  user,
  event,
  dateIdentifier,
  confirmed,
  respondWithHtml = false
) => {
  const guest = getGuest(event, user.email, dateIdentifier);

  // no longer in guest list or already
  if (guest?.status == "rejected" || !guest?.status) {
    if (respondWithHtml) {
      res.sendFile(htmlPage.noLongerGuest);
    } else {
      res.send({
        status: "fail",
        message: "You are no longer participant of this event.",
      });
    }
  }
  // still guest but already confirmed
  else if (guest?.status != "rejected" && guest.confirmedWantsToGo) {
    if (respondWithHtml) {
      res.sendFile(htmlPage.activityAttendanceConfirmed);
    } else {
      res.send({
        status: "success",
        message:
          guest?.status == "waitlisted"
            ? "You have already confirmed your event request."
            : "You already confirmed your attendance.",
      });
    }
  }
  // still guest and not confirmed
  else if (guest?.status != "rejected" && !guest.confirmedWantsToGo) {
    return handleAttentanceConfirmationStatusChange(
      user,
      event,
      dateIdentifier,
      guest,
      confirmed
    ).then(() => {
      if (respondWithHtml) {
        res.sendFile(htmlPage.activityAttendanceConfirmed);
      } else {
        let message = "";

        if (confirmed && guest?.status == "waitlisted") {
          message = "You have confirmed your event request.";
        } else if (confirmed && guest?.status != "waitlisted") {
          message = "You confirmed your attendance.";
        } else if (!confirmed && guest?.status == "waitlisted") {
          message = "You have cancelled your event request.";
        } else if (!confirmed && guest?.status != "waitlisted") {
          message = "You have been removed from the event.";
        }

        res.send({
          status: "success",
          message: message,
        });
      }
    });
  }
  //
  else {
    if (respondWithHtml) {
      res.sendFile(htmlPage.somethingWentWrong);
    } else {
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    }
  }
};

const handleAttentanceConfirmationStatusChange = (
  user,
  event,
  dateIdentifier,
  guest,
  confirmed
) => {
  return Promise.resolve()
    .then(() => {
      // if confirmed confirmedWantsToGo changes to true
      if (confirmed) {
        return mongoUpdateOne(
          "events",
          {
            _id: ObjectId(event._id + ""),
            "guests._id": ObjectId(guest._id),
          },
          { $set: { "guests.$.confirmedWantsToGo": true } }
        );
      }
      // if not confirmed guest is removed
      else {
        return removeGuestFromEvent(event, dateIdentifier, user);
      }
    })
    .then(() => {
      // notify host if user confirmed attendance
      if (confirmed === true && guest?.status == "waitlisted") {
        return createNotificationPriorityWaitlist(
          event,
          getDateObjectWithIdentifier(event.dateObjects, dateIdentifier),
          user
        );
      }
      // create order if user is accepted confirmed attendance and event is free
      else if (
        confirmed === true &&
        guest?.status == "accepted" &&
        event.price == 0 // ensuring that front does not send events with positive price
      ) {
        return createOrder(user, event._id + "", dateIdentifier, 1);
      }
    });
};

module.exports = {
  removeGuestFromEvent,
  guestConfirmationErrorHandling,
  handleGuestAttendanceConfirmation,
};

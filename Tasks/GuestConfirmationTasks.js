const mongoose = require("mongoose");
const User = mongoose.model("User");
const { mongoFindSpecificField } = require("../functions/mongodbDriver");
const {
  removeGuestFromEvent,
} = require("../functions/guestConfirmationFunctions");
const {
  createNotificationActivityAttendanceConfirmation,
  createNotificationEventRemainder,
} = require("../functions/createNotificationFunctions");
const { checkNotificationExsits } = require("../functions/notifications");
const { getGuestsCount } = require("../functions/guestGetterFunctions");
const { getGuestEmails } = require("../functions/guestGetterFunctions");
const { sendEventRemainderEmails } = require("../services/sendAllEmailTypes");
const { eventAttendanceControlTimes } = require("../constants");

const runTime = 60 * 1000; // function runs every 60000 ms / 1 min

const createGuestConfirmationAndWaitlistTasks = () => {
  mongoFindSpecificField("events", { isOld: false }).then((events) => {
    try {
      events.forEach((event) => {
        getValidDateObjects(
          event,
          [
            eventAttendanceControlTimes.notifyGuestBeforeFirst,
            eventAttendanceControlTimes.notifyGuestBeforeSecond,
            eventAttendanceControlTimes.reminderBeforeGuestsRemoval,
            eventAttendanceControlTimes.unconfirmedGuestsRemoval,
            eventAttendanceControlTimes.addingWaitlistedPeople,
          ],
          [
            eventAttendanceControlTimes.firstRemainder,
            eventAttendanceControlTimes.secondRemainder,
          ],
          runTime
        ).forEach((dateObject) => {
          // Here we have events with dates which are ready for notifications to be sent
          if (
            dateObject.notifyTime ==
              eventAttendanceControlTimes.notifyGuestBeforeFirst ||
            dateObject.notifyTime ==
              eventAttendanceControlTimes.notifyGuestBeforeSecond
          ) {
            // two reminders to confirm that either gurst is attending or wants to go to
            handleConfirmationNotificationSending(event, dateObject);
          }
          // attendance reminder before removing guests
          else if (
            dateObject.notifyTime ==
            eventAttendanceControlTimes.reminderBeforeGuestsRemoval
          ) {
            // Deletion of the user from event and sending notification
            handleReminderBeforeRemovingGuest(event, dateObject);
          }
          // guest removal
          else if (
            dateObject.notifyTime ==
            eventAttendanceControlTimes.unconfirmedGuestsRemoval
          ) {
            // Deletion of the user from event and sending notification
            handleUserMoveToWaitlistNotification(event, dateObject);
          } else if (
            dateObject.notifyTime ==
            eventAttendanceControlTimes.addingWaitlistedPeople
          ) {
            handleWaitlistReadyToGoNotifications(event, dateObject);
          } else if (
            dateObject.notifyTime == eventAttendanceControlTimes.firstRemainder
          ) {
            handleFirstRemainder(event, dateObject);
          } else if (
            dateObject.notifyTime == eventAttendanceControlTimes.secondRemainder
          ) {
            handleSecondRemainder(event, dateObject);
          }
        });
      });
    } catch (error) {
      console.log("fmkrk", error);
    }
  });
};

const handleFirstRemainder = (event, dateObject) => {
  const emails = getGuestEmails(event, dateObject.dateIndentifier, true);

  return Promise.all([
    sendEventRemainderEmails(emails, event),
    createNotificationEventRemainder(
      emails,
      event,
      dateObject.dateIndentifier,
      `6 hours left until ${event.name}`
    ),
  ]).catch((error) => {
    console.log("Error adgiuaytf6a7t ", error);
  });
};

const handleSecondRemainder = (event, dateObject) => {
  const emails = getGuestEmails(event, dateObject.dateIndentifier, true);
  const text = `1 hour left until ${event.name}`;

  createNotificationEventRemainder(
    emails,
    event,
    dateObject.dateIndentifier,
    text
  ).catch((error) => {
    console.log("Error gdaugy6a87 ", error);
  });
};

const handleConfirmationNotificationSending = (event, dateObject) => {
  try {
    let alreadySent = [];
    event.guests.forEach((guest) => {
      if (
        !alreadySent.includes(guest.email) &&
        !guest.confirmedWantsToGo &&
        (guest.dateIdentifier == dateObject.dateIdentifier || guest.coHost)
      ) {
        alreadySent.push(guest.email);

        let messageType =
          guest.status == "accepted"
            ? "participationConfirmation"
            : "likeToGoToActivity";

        console.log("... ", event?.name, guest?.email, messageType);

        createNotificationActivityAttendanceConfirmation(
          messageType,
          event,
          dateObject,
          confirmationNotificationText(event, guest, dateObject.notifyTime),
          guest.email
        );
      }
    });
  } catch (error) {
    console.log("Error aiugt6ft76 ", error);
  }
};

const handleReminderBeforeRemovingGuest = (event, dateObject) => {
  try {
    let alreadySent = [];

    event.guests.forEach((guest) => {
      if (
        !alreadySent.includes(guest.email) &&
        !guest.confirmedWantsToGo &&
        (guest.dateIdentifier == dateObject.dateIdentifier || guest.coHost) &&
        guest.status == "accepted"
      ) {
        alreadySent.push(guest.email);

        createNotificationActivityAttendanceConfirmation(
          "participationConfirmation",
          event,
          dateObject,
          confirmationNotificationText(event, guest, dateObject.notifyTime),
          guest.email
        );
      }
    });
  } catch (error) {
    console.log("Error aiugt6ft76 ", error);
  }
};

const handleUserMoveToWaitlistNotification = (event, dateObject) => {
  try {
    event.guests.forEach((guest) => {
      if (
        !guest.confirmedWantsToGo &&
        guest.status == "accepted" &&
        guest.dateIdentifier == dateObject.dateIdentifier
      ) {
        User.findOne({ email: guest.email })
          .then((user) => {
            const partificationNotification = checkNotificationExsits(
              user,
              "participationConfirmation",
              event._id + "",
              dateObject.dateIdentifier
            );
            const likeToGoNotification = checkNotificationExsits(
              user,
              "likeToGoToActivity",
              event._id + "",
              dateObject.dateIdentifier
            );

            if (partificationNotification || likeToGoNotification) {
              removeGuestFromEvent(
                event,
                dateObject.dateIdentifier,
                user,
                "waitlisted"
              );

              createNotificationActivityAttendanceConfirmation(
                "autoDeletedFromGuests",
                event,
                dateObject,
                autoDeletionNotificationText(event),
                user.email
              );
            }
          })
          .catch((error) => {
            console.log("Error afiautfat ", error);
          });
      }
    });
  } catch (error) {
    console.log("Error ogys8g7tsgysg ", error);
  }
};

const handleWaitlistReadyToGoNotifications = (event, dateObject) => {
  try {
    if (getGuestsCount(event, dateObject.dateIdentifier) < event.capacity) {
      event.guests.forEach((guest) => {
        if (
          guest.status == "waitlisted" &&
          (guest.confirmedWantsToGo || guest.wasPreviouslyAccepted) &&
          (guest.dateIdentifier == dateObject.dateIdentifier || guest.coHost)
        ) {
          createNotificationActivityAttendanceConfirmation(
            "waitlistReadyToGo",
            event,
            dateObject,
            waitlistReadyToGoNotificationText(event),
            guest.email
          );
        }
      });
    }
  } catch (error) {
    console.log("Error gagagt4wtw ", error);
  }
};

const getValidDateObjects = (
  event,
  notifyArray = [],
  remainderArray = [],
  runTime
) => {
  try {
    const validDateObjects = [];

    event?.dateObjects?.forEach((dateObject) => {
      if (
        dateObject.onlyHas == "dateTime" &&
        new Date(dateObject.dateString).getTime() -
          new Date(event.uploadTime).getTime() >
          eventAttendanceControlTimes.notifyGuestBeforeSecond
      ) {
        notifyArray.forEach((notifyTime) => {
          if (isValidTime(dateObject, notifyTime, runTime)) {
            dateObject.notifyTime = notifyTime;
            validDateObjects.push(dateObject);
          }
        });
      }

      remainderArray.forEach((notifyTime) => {
        if (isValidTime(dateObject, notifyTime, runTime)) {
          dateObject.notifyTime = notifyTime;
          validDateObjects.push(dateObject);
        }
      });
    });

    return validDateObjects;
  } catch (error) {
    console.log("cmvfjr", error);
    return [];
  }
};

const isValidTime = (dateObject, notifyTime, runTime) => {
  let timeLeft =
    new Date(dateObject.dateString).getTime() - new Date().getTime();
  return timeLeft < notifyTime && timeLeft > notifyTime - runTime;
};

const confirmationNotificationText = (event, guest, notifyTime) => {
  if (event?.price > 0 && guest?.status == "accepted") {
    return notifyTime == eventAttendanceControlTimes.notifyGuestBeforeFirst
      ? "Event: Payment pending"
      : `Pay within the next ${parseInt(
          (notifyTime - eventAttendanceControlTimes.unconfirmedGuestsRemoval) /
            (60 * 60 * 1000)
        )} hours or your spot will be given to a user on the waitlist!`;
  } else {
    return guest?.status == "accepted"
      ? "Confirmation of participation in the event"
      : guest?.addedBy == "user"
      ? "Do you confirm you would like to go to event?"
      : "You have been invited to event and host is waiting for your answer. Would you like to go?";
  }
};

const autoDeletionNotificationText = (event) => {
  return event?.price > 0
    ? "You did not pay within the time limit, so you were placed to the waitlist."
    : "You were placed to the waitlist, since you did not confirm your participation.";
};

const waitlistReadyToGoNotificationText = (event) => {
  return event?.price > 0
    ? "The place in the event has become free, Pay to participate."
    : "Are you ready to go? A spot was freed on the event.";
};

module.exports = { createGuestConfirmationAndWaitlistTasks };

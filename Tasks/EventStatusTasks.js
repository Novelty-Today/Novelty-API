const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const { isDateObjectOld } = require("../functions/dateComparisons");
const { mongoUpdateOne } = require("../functions/mongodbDriver");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const { finishActivity } = require("../functions/event");
const {
  sendUpdateMyEventsInSocket,
  sendNewPastActivities,
} = require("../sockets/EventSockets");
const { noveltyTokenConfigs } = require("../constants");

const checkEventDateTimes = () => {
  Event.find(
    { isOld: false },
    {
      dateObjects: 1,
      finishedDateIdentifiers: 1,
      organiser: 1,
      isOld: 1,
      displayOnHomeScreen: 1,
      name: 1,
    }
  )
    .then((events) => {
      events.forEach((event) => {
        let displayOnHomeScreen = false;
        let isOld = true;

        event?.dateObjects?.forEach((dateObject) => {
          // Once event date is passed, immediately we:
          if (checkIfEventPassedTime(dateObject))
            moveEventToPasts(event.organiser, event._id + "", dateObject);
          // through sockets we move events from my events to pasts
          else displayOnHomeScreen = true;

          // if 24 hours passed after event
          if (
            checkIfEventPassedTime(
              dateObject,
              noveltyTokenConfigs.eventAutoFinishTime
            ) &&
            !event.finishedDateIdentifiers.includes(dateObject?.dateIdentifier)
          ) {
            finishActivity(
              event._id + "",
              dateObject?.dateIdentifier,
              {},
              true
            ).catch((error) => console.log("Error aufy788t8 ", error));
          } else if (
            !checkIfEventPassedTime(
              dateObject,
              noveltyTokenConfigs.eventAutoFinishTime
            )
          ) {
            isOld = false;
          }
        });

        if (
          event.isOld != isOld ||
          event.displayOnHomeScreen != displayOnHomeScreen
        ) {
          mongoUpdateOne(
            "events",
            { _id: ObjectId(event._id) },
            { $set: { isOld, displayOnHomeScreen } }
          ).catch((error) => console.log("Error sauihga8tg76 ", error));
        }
      });
    })
    .catch((error) => {
      console.log("Error eiafuytb6 ", error);
    });
};

const moveEventToPasts = (organiser, eventId, dateObject) => {
  User.findOne({ email: organiser })
    .then((user) => {
      sendUpdateMyEventsInSocket(user, eventId, dateObject, false);
      sendNewPastActivities(user, eventId, dateObject, true);
    })
    .catch((error) => {
      console.log("Error fian76tf58 ", error);
    });
};

const checkIfEventPassedTime = (dateObject, offset = 0) => {
  const utcNow = new Date().getTime();

  return (
    (dateObject?.onlyHas == "date" && isDateObjectOld(dateObject, offset)) ||
    (dateObject?.onlyHas == "dateTime" &&
      new Date(dateObject?.dateString).getTime() + offset < utcNow)
  );
};

module.exports = { checkEventDateTimes };

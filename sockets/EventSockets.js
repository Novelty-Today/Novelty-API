const ObjectId = require("mongodb").ObjectId;
const { getEventDataWithLinks } = require("../functions/buildEvent");
const { getGuestsAndOrganisers } = require("../functions/guestGetterFunctions");
const { mongoFindOne } = require("../functions/mongodbDriver");
const {
  socketEvents,
  isUserOnline,
  sendSocketEventToUsers,
} = require("./SocketFunctions");

const sendUpdateMyEventsInSocket = async (
  user,
  eventId,
  dateObject = null,
  shouldAdd = true
) => {
  try {
    if (await isUserOnline(user)) {
      if (shouldAdd) {
        const event = await mongoFindOne("events", { _id: ObjectId(eventId) });

        const events = await Promise.all(
          event.dateObjects.map((dateObj) =>
            getEventDataWithLinks(eventId, dateObj?.dateIdentifier, user.email)
          )
        );

        sendSocketEventToUsers([user], socketEvents.updateMyEvents, {
          action: "add",
          events,
        });
      } else {
        sendSocketEventToUsers([user], socketEvents.updateMyEvents, {
          action: "remove",
          eventId,
          dateObject: dateObject,
        });
      }
    }
  } catch (error) {
    console.log("Error fnvjr", error);
  }
};

const modifyMyEventWithSocket = async (eventId, dateObject = null) => {
  try {
    const event = await mongoFindOne("events", { _id: ObjectId(eventId) });
    const recievers = getGuestsAndOrganisers(event).organisers;

    recievers.forEach(async (email) => {
      try {
        const user = await mongoFindOne("users", { email: email });

        if (await isUserOnline(user)) {
          if (dateObject) {
            const buildEvent = await getEventDataWithLinks(
              eventId,
              dateObject?.dateIdentifier,
              user.email
            );

            sendSocketEventToUsers([user], socketEvents.replaceMyEvents, {
              event: buildEvent,
            });
          } else {
            event.dateObjects.forEach(async (dateObj) => {
              const buildEvent = await getEventDataWithLinks(
                eventId,
                dateObj?.dateIdentifier,
                user.email
              );

              sendSocketEventToUsers([user], socketEvents.replaceMyEvents, {
                event: buildEvent,
              });
            });
          }
        }
      } catch (error) {
        console.log("Error diaugtad6fta6 ", error);
      }
    });
  } catch (error) {
    console.log("Error adigatd76 ", error);
  }
};

const sendNewUpcomingsInSocket = async (
  user,
  eventId,
  dateObject,
  shouldAdd
) => {
  try {
    if (await isUserOnline(user)) {
      if (shouldAdd) {
        const event = await getEventDataWithLinks(
          eventId,
          dateObject?.dateIdentifier,
          user.email
        );
        sendSocketEventToUsers([user], socketEvents.updateUpcomings, {
          action: "add",
          event,
        });
      } else {
        sendSocketEventToUsers([user], socketEvents.updateUpcomings, {
          action: "remove",
          eventId,
          dateObject,
        });
      }
    }
  } catch (error) {
    console.log("error b52b5b656 ", error);
  }
};

const sendNewPastActivities = async (
  user,
  eventId,
  dateObject,
  shouldAdd = true
) => {
  try {
    if (await isUserOnline(user)) {
      if (shouldAdd) {
        const event = await getEventDataWithLinks(
          eventId,
          dateObject?.dateIdentifier,
          user.email,
          true
        );
        sendSocketEventToUsers([user], socketEvents.updatePastEvents, {
          action: "add",
          event,
        });
      } else {
        sendSocketEventToUsers([user], socketEvents.updatePastEvents, {
          action: "remove",
          eventId,
          dateObject: dateObject,
        });
      }
    }
  } catch (error) {
    console.log("error v42vy22ci2 ", error);
  }
};

const removeChatFromChatList = (list, uuid) => {
  list?.forEach?.(async (email) => {
    try {
      const user = await mongoFindOne("users", { email });
      if (await isUserOnline(user)) {
        sendSocketEventToUsers([user], socketEvents.removeChatFromChatlist, {
          uuid,
        });
      }
    } catch (error) {
      console.log("error gdaugyda ", error);
    }
  });
};

const updateFutureActivityWithSocket = async (eventId) => {
  try {
    const event = await mongoFindOne("events", { _id: ObjectId(eventId) });

    event.dateObjects.forEach((dateObject) => {
      const guestsAndOrganisers = getGuestsAndOrganisers(event);

      replaceFunction(
        guestsAndOrganisers.organisers,
        socketEvents.replaceMyEvents,
        eventId,
        dateObject
      );
      replaceFunction(
        guestsAndOrganisers.guests,
        socketEvents.replaceUpcomings,
        eventId,
        dateObject
      );
    });
  } catch (error) {
    console.log("Error faghi ", error);
  }
};

const moveFinishedActivity = async (eventId, dateObject) => {
  try {
    const event = await mongoFindOne("events", { _id: ObjectId(eventId) });
    const guestsAndOrganisers = getGuestsAndOrganisers(event);

    removeFunction(
      guestsAndOrganisers.organisers,
      socketEvents.updateMyEvents,
      eventId,
      dateObject
    );
    removeFunction(
      guestsAndOrganisers.guests,
      socketEvents.updateUpcomings,
      eventId,
      dateObject
    );

    addToPastsFunction(
      guestsAndOrganisers.organisers,
      socketEvents.updatePastEvents,
      eventId,
      dateObject
    );
    addToPastsFunction(
      guestsAndOrganisers.guests,
      socketEvents.updateAttended,
      eventId,
      dateObject
    );
  } catch (error) {
    console.log("Error gdagaga ", error);
  }
};

const removeFunction = (list, socketEvent, eventId, dateObject) => {
  list?.forEach?.(async (email) => {
    try {
      const user = await mongoFindOne("users", { email });
      if (await isUserOnline(user)) {
        sendSocketEventToUsers([user], socketEvent, {
          action: "remove",
          eventId,
          dateObject: dateObject,
        });
      }
    } catch (error) {
      console.log("Error aigyatfa67 ", error);
    }
  });
};

const addToPastsFunction = (list, socketEvent, eventId, dateObject) => {
  list?.forEach?.(async (email) => {
    try {
      const user = await mongoFindOne("users", { email });

      if (await isUserOnline(user)) {
        const event = await getEventDataWithLinks(
          eventId,
          dateObject?.dateIdentifier,
          user.email,
          true
        );
        sendSocketEventToUsers([user], socketEvent, {
          action: "add",
          event,
        });
      }
    } catch (error) {
      console.log("Error gd8gatd76at ", error);
    }
  });
};

const replaceFunction = (list, socketEvent, eventId, dateObject) => {
  list?.forEach?.(async (email) => {
    try {
      const user = await mongoFindOne("users", { email: email });
      if (await isUserOnline(user)) {
        const event = await getEventDataWithLinks(
          eventId,
          dateObject?.dateIdentifier,
          user.email
        );
        sendSocketEventToUsers([user], socketEvent, { event });
      }
    } catch (error) {
      console.log("Error gdaigta68fa ", error);
    }
  });
};

const modifyUpcomingEventWithSocket = async (eventId, dateObject = null) => {
  try {
    const event = await mongoFindOne("events", { _id: ObjectId(eventId) });
    let recievers = [];
    event.guests.forEach((guest) => {
      if (
        guest.status == "accepted" &&
        (guest.dateIdentifier == dateObject?.dateIdentifier || !dateObject)
      ) {
        recievers.push(guest.email);
      }
    });

    recievers.forEach(async (email) => {
      const user = await mongoFindOne("users", { email: email });

      if (await isUserOnline(user)) {
        if (dateObject) {
          const event = await getEventDataWithLinks(
            eventId,
            dateObject?.dateIdentifier,
            user.email
          );
          sendSocketEventToUsers([user], socketEvents.replaceUpcomings, {
            event,
          });
        } else {
          event.dateObjects.forEach(async (dateObj) => {
            const event = await getEventDataWithLinks(
              eventId,
              dateObj?.dateIdentifier,
              user.email
            );

            sendSocketEventToUsers([user], socketEvents.replaceUpcomings, {
              event,
            });
          });
        }
      }
    });
  } catch (error) {
    console.log("Error gdaga6g8dagad7 ", error);
  }
};

const sendNewFavoriteInSocket = async (user, eventId, shouldAdd) => {
  try {
    if (await isUserOnline(user)) {
      const event = await getEventDataWithLinks(
        eventId,
        "Closest date",
        user.email
      );

      sendSocketEventToUsers([user], socketEvents.updateFavorites, {
        action: shouldAdd ? "add" : "remove",
        event,
      });
    }
  } catch (error) {
    console.log("error v52b452b56 ", error);
  }
};

module.exports = {
  removeChatFromChatList,
  sendNewFavoriteInSocket,
  sendUpdateMyEventsInSocket,
  sendNewUpcomingsInSocket,
  sendNewPastActivities,
  modifyMyEventWithSocket,
  modifyUpcomingEventWithSocket,
  moveFinishedActivity,
  updateFutureActivityWithSocket,
};

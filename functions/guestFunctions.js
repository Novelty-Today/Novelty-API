const mongoose = require("mongoose");
const User = mongoose.model("User");
const { getEventDataWithLinks } = require("./buildEvent");
const {
  createNotificationActivityRequest,
} = require("./createNotificationFunctions");
const {
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const notifyHostAboutGuestRequest = (event, eventId, dateIdentifier, user) => {
  try {
    let builtEvent;
    getEventDataWithLinks(eventId, dateIdentifier, event.organiser)
      .then((builtEventData) => {
        builtEvent = builtEventData;
        return User.findOne({ email: event.organiser });
      })
      .then((organiserUserObj) => {
        sendSocketEventToUsers(
          [organiserUserObj],
          socketEvents.replaceMyEvents,
          { event: builtEvent }
        );
      })
      .catch((error) => {
        console.log("Error adat65 ", error);
      });

    return createNotificationActivityRequest(event, dateIdentifier, user);
  } catch (error) {
    console.log("Error aidftb85 ", error);
  }
};

module.exports = { notifyHostAboutGuestRequest };

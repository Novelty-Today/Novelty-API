const {
  createNotificationLeftEvent,
} = require("./createNotificationFunctions");
const { removeGuestFromEvent } = require("./guestConfirmationFunctions");

const leaveEventHandler = (event, dateIdentifier, user) => {
  return removeGuestFromEvent(event, dateIdentifier, user).then(() => {
    return createNotificationLeftEvent(
      event,
      dateIdentifier,
      user.email,
      user.username
    );
  });
};

module.exports = { leaveEventHandler };

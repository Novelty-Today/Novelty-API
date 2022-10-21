const { newMessageHandler } = require("../../sockets/MessageSockets");

const sendSuggestion = (
  user,
  chatUuid,
  messageUuid,
  eventId,
  dateIdentifier,
  type,
  suggestedItems
) => {
  let choices = [];

  // if it is location suggestions we build location objects
  if (type == "suggestedLocation") {
    choices = suggestedItems.map((item) => {
      return {
        locationObject: {
          name: item.name,
          address: item.address,
          location: item.location,
        },
        likedBy: [],
      };
    });
  }
  // if it is dates suggestion we add date utc strings
  else {
    choices = suggestedItems.map((item) => {
      return {
        dateTime: new Date(item).toUTCString(),
        likedBy: [],
      };
    });
  }

  const suggestedObject = {
    type: type,
    sender: user.email,
    time: new Date().toUTCString(),
    choices: choices,
    eventId,
    dateIdentifier,
    username: user.username,
  };

  return newMessageHandler(
    user,
    chatUuid,
    messageUuid,
    "",
    null,
    null,
    suggestedObject,
    null
  );
};

module.exports = { sendSuggestion };

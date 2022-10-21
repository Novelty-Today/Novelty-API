const { mongoFindOne } = require("../mongodbDriver");
const {
  sendSocketEventToRoom,
  socketEvents,
} = require("../../sockets/SocketFunctions");

const findUpdatedSuggestionAndSendToUsers = (
  chatData,
  messageId,
  dateObject = null,
  location = null
) => {
  let suggestedData = chatData.messages.find((ele) => ele._id == messageId);

  mongoFindOne("users", { email: suggestedData.sender }).then(
    (suggestedByUser) => {
      suggestedData.username = suggestedByUser.username;

      sendSocketEventToRoom(chatData.uuid, socketEvents.updateSuggestions, {
        chatUuid: chatData.uuid,
        suggestedData: suggestedData,
        dateObject,
        location,
      });
    }
  );
};

module.exports = { findUpdatedSuggestionAndSendToUsers };

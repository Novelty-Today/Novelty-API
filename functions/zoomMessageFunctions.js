const mongoose = require("mongoose");
const {
  sendSocketEventToRoom,
  socketEvents,
} = require("../sockets/SocketFunctions");
const Chat = mongoose.model("Chat");
const Event = mongoose.model("Event");
const { getGuestsIdList } = require("./guestGetterFunctions");

const deleteOldZoomStartedMessages = (uuid, eventId, dateIdentifier) => {
  let deleteMessageIdList = [];
  let guestIdList = [];
  return Promise.all([
    Chat.findOne({ uuid: uuid }),
    Event.findOne({ _id: eventId }),
  ])
    .then(([chat, event]) => {
      if (chat && event) {
        deleteMessageIdList = getDeleteMessageIdList(
          chat,
          eventId,
          dateIdentifier
        );

        guestIdList = getGuestsIdList(event, dateIdentifier);

        return Promise.all([
          Chat.findOneAndUpdate(
            { uuid: uuid },
            { $pull: { messages: { _id: { $in: deleteMessageIdList } } } }
          ),
          Event.findOneAndUpdate(
            { _id: eventId, "guests._id": { $in: guestIdList } },
            {
              $set: { "guests.$[].joinedZoomMeeting": false },
            }
          ),
        ]);
      }
    })
    .then(() => {
      sendSocketEventToRoom(uuid, socketEvents.deleteChatMessages, {
        uuid,
        deleteMessageIdList,
      });
    })
    .catch((error) => {
      console.log("Error afaib7 ", error);
    });
};

const getDeleteMessageIdList = (chat, eventId, dateIdentifier) => {
  let deleteMessageIdList = [];
  let ignoredFirstOne = false;
  for (var i = chat?.messages?.length - 1; i >= 0; i--) {
    if (
      chat.messages[i]?.type == "zoomMeetingStarted" &&
      chat.messages[i]?.eventId == eventId &&
      chat.messages[i]?.dateIdentifier == dateIdentifier
    ) {
      if (ignoredFirstOne) {
        deleteMessageIdList.push(chat.messages[i]?._id);
      } else {
        ignoredFirstOne = true;
      }
    }

    // if we parse 500 messages that will be enough so people wont see old duplicates
    if (i < chat.messages?.length - 500) i = -1;
  }
  return deleteMessageIdList;
};

module.exports = { deleteOldZoomStartedMessages };

const ObjectId = require("mongodb").ObjectId;
const { mongoFindOne } = require("../mongodbDriver");
const { getEventDataWithLinks } = require("../buildEvent");
const { giveTokenText } = require("./noveltyTokenHelperFunctions");
const {
  sendSocketEventToUsers,
  socketEvents,
} = require("../../sockets/SocketFunctions");

const showLostTokensInFrontend = (eventId, user, tokenAmount, action) => {
  mongoFindOne("events", { _id: ObjectId(eventId) }).then((event) => {
    sendSocketEventToUsers([user], socketEvents.showPopup, {
      type: "lostCoins",
      params: {
        event,
        tokenAmount,
        text: giveTokenText(action),
      },
    });
  });
};

const showVerifyEventPopupInFrontend = (
  eventId,
  dateIdentifier,
  user,
  stakeRequired
) => {
  return getEventDataWithLinks(eventId, dateIdentifier, user.email, true).then(
    (event) => {
      sendSocketEventToUsers([user], socketEvents.showPopup, {
        type: "verifyEvent",
        params: { event, stakeAmount: stakeRequired },
      });
    }
  );
};

module.exports = {
  showLostTokensInFrontend,
  showVerifyEventPopupInFrontend,
};

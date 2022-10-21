const ObjectId = require("mongodb").ObjectId;
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { mongoFindOne } = require("./mongodbDriver");
const { sendChatUpdateSignal } = require("../sockets/ChatSockets");
const { newMessageHandler } = require("../sockets/MessageSockets");

const updateRequestInChat = (requester, organiser, reqBody) => {
  return mongoFindOne("chats", {
    "chatMembers.email": { $all: [requester, organiser] },
    type: "private",
  })
    .then((chat) => {
      // adding a payment form in chat if event is not free
      findEventAndAddPaymentPendingMessage(
        requester,
        chat.uuid,
        reqBody.eventId,
        reqBody.dateIdentifier,
        reqBody.status
      );

      sendChatUpdateSignal([organiser, requester], {
        eventId: reqBody.eventId,
        dateIdentifier: reqBody.dateIdentifier,
      });
    })
    .catch((error) => {
      console.log("Error okjadifha87tf8a ", error);
    });
};

const findEventAndAddPaymentPendingMessage = (
  email,
  chatUuid,
  eventId,
  dateIdentifier,
  status
) => {
  if (status == "accepted") {
    mongoFindOne("events", { _id: ObjectId(eventId) })
      .then((event) => {
        if (event.price > 0) {
          return addPaymentPendingMessage(
            event,
            dateIdentifier,
            chatUuid,
            email
          );
        }
      })
      .catch((error) => {
        console.log("Error adjahiu ", error);
      });
  }
};

const addPaymentPendingMessage = (event, dateIdentifier, chatUuid, email) => {
  message = {
    type: "privateRequestPayment",
    sender: event.organiser,
    eventId: event._id,
    dateIdentifier: dateIdentifier,
    organiser: event.organiser,
    price: event.price,
    time: new Date().toUTCString(),
  };

  return User.findOne({ email: event?.organiser })
    .then((user) => {
      return newMessageHandler(
        user,
        chatUuid,
        null,
        "",
        null,
        null,
        message,
        null
      );
    })
    .catch((error) => console.log(error));
};

module.exports = {
  updateRequestInChat,
  addPaymentPendingMessage,
};

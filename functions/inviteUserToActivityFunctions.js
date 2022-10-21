const {
  createNotificationActivityInvitation,
} = require("./createNotificationFunctions");
const { createPrivateChat } = require("./ChatCreationFunctions");
const { newMessageHandler } = require("../sockets/MessageSockets");
const { mongoFindOne, mongoFindOneSpecificField } = require("./mongodbDriver");

const inviteUserToActivity = (guests, event, hostData) => {
  let result = Promise.resolve();

  guests?.forEach((guest) => {
    result = result.then(() => {
      return mongoFindOne("users", { email: guest.email, phone: guest.phone })
        .then((guestUserObj) => {
          return Promise.all([
            // update in chat
            sendInvitationInChat(
              event,
              guest.dateIdentifier,
              guestUserObj,
              hostData
            ), // send notification and email/sms
            createNotificationActivityInvitation(
              event,
              guest.dateIdentifier,
              guest.coHost ? "coHost" : "guest",
              guestUserObj.email,
              guestUserObj.phone,
              hostData
            ),
          ]);
        })
        .catch((error) => {
          console.log("Error diay667 ", error, guest);
        });
    });
  });
};

const sendInvitationInChat = (
  event,
  dateIdentifier,
  guestUserObj,
  hostData
) => {
  const extraData = {
    type: "invitationFromHost",
    eventId: event?._id + "",
    dateIdentifier,
    invitationMedia: event?.miniMediaArray?.[0],
  };

  return mongoFindOneSpecificField(
    "chats",
    {
      "chatMembers.email": { $all: [guestUserObj.email, hostData.email] },
      type: "private",
    },
    { uuid: 1 }
  )
    .then((chat) => {
      if (chat) {
        return chat;
      } else {
        return createPrivateChat([
          { email: guestUserObj.email, username: guestUserObj.username },
          { email: hostData.email, username: hostData.username },
        ]);
      }
    })
    .then((chat) => {
      return newMessageHandler(
        hostData,
        chat.uuid,
        null,
        "",
        null,
        null,
        extraData
      );
    })
    .catch((error) => console.log("dvn hfvjf", error));
};

module.exports = { inviteUserToActivity };

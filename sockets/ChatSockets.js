const ObjectId = require("mongodb").ObjectId;
const {
  createRemainderPushNotificationTask,
} = require("../Tasks/remainderPushNotificationTasks");
const {
  mongoFindSpecificField,
  mongoFindOne,
  mongoFindOneAndUpdate,
} = require("../functions/mongodbDriver");
const { getGuestEmails } = require("../functions/guestGetterFunctions");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
  addUserToSocketRoom,
} = require("./SocketFunctions");

const sendPushIfNotOnline = async (sender, uuid) => {
  try {
    const chat = await mongoFindOne("chats", { uuid });

    chat.chatMembers.forEach(async (member) => {
      if (member.email != sender.email && !member.isRemoved) {
        const user = await mongoFindOne("users", { email: member.email });

        if (chat && user && !(await isUserOnline(user))) {
          await createRemainderPushNotificationTask(
            "newMessagePushNotification",
            uuid,
            user.email
          );
        }
      }
    });
  } catch (error) {
    console.log("Error adgidat76fda ", error);
  }
};

const askSocketToJoin = (emails = [], uuid) => {
  return Promise.all(
    emails.map(async (email) => {
      const user = await mongoFindOne("users", { email: email });
      if (await isUserOnline(user)) {
        addUserToSocketRoom(user, uuid);
      }
    })
  );
};

const getAllChatUuidList = (email) => {
  return mongoFindSpecificField(
    "chats",
    { "chatMembers.email": email },
    { uuid: 1, chatMembers: 1 }
  )
    .then((result) => {
      let uuidList = [];
      result.forEach((chat) => {
        uuidList.push(chat.uuid);
      });

      return uuidList;
    })
    .catch((error) => {
      console.log("Error aljfiaidfamcrwra5644", error);
      return [];
    });
};

const pendingUserAccepted = async (email) => {
  try {
    const user = await mongoFindOne("users", { email: email });
    if (await isUserOnline(user)) {
      sendSocketEventToUsers([user], socketEvents.addedToCommunity);
    }
  } catch (error) {
    console.log("Error kfjaifuao ", error);
  }
};

const sendChatUpdateSignal = (emails = [], data) => {
  emails?.forEach?.(async (email) => {
    try {
      const user = await mongoFindOne("users", { email: email });

      if (await isUserOnline(user)) {
        sendSocketEventToUsers([user], socketEvents.updateChatSignal, data);
      }
    } catch (error) {
      console.log("error ewv5g ", error);
    }
  });
};

const joinZoomMeeting = (email, eventId, dateIdentifier) => {
  return mongoFindOneAndUpdate(
    "events",
    {
      _id: ObjectId(eventId),
      "guests.dateIdentifier": dateIdentifier,
      "guests.email": email,
    },
    { $set: { "guests.$.joinedZoomMeeting": true } }
  )
    .then((event) => {
      if (event) {
        const emails = getGuestEmails(event, dateIdentifier, true);
        sendChatUpdateSignal(emails, { eventId, dateIdentifier });
      }
    })
    .catch((error) => {
      console.log("Error afiuatb865 ", error);
    });
};

module.exports = {
  sendPushIfNotOnline,
  getAllChatUuidList,
  askSocketToJoin,
  pendingUserAccepted,
  sendChatUpdateSignal,
  joinZoomMeeting,
};

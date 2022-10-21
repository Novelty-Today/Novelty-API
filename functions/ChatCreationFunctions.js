const mongoose = require("mongoose");
const Chat = mongoose.model("Chat");
const { v4: uuidv4 } = require("uuid");
const { mongoUpdateMany, mongoFindOneAndUpdate } = require("./mongodbDriver");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const { getEventMembers } = require("./event");
const { askSocketToJoin } = require("../sockets/ChatSockets");
const { userImageUrlWithEmail } = require("./mediaProccessing");

const createPrivateChat = (chatMembers, messages = []) => {
  const chat = new Chat({
    uuid: uuidv4(),
    chatMembers: chatMembers,
    messages: messages,
    type: "private",
  });

  let chatMembersEmails = chatMembers.map((member) => member.email);

  return Promise.all([
    askSocketToJoin(chatMembersEmails, chat.uuid),
    Chat.insertMany([chat]),
  ]).then(([joined, chats]) => {
    return chats[0];
  });
};

const buildPrivateChatData = (chat, user, lastMessageSeen) => {
  const chatObject = {
    uuid: chat.uuid,
    email: user.email,
    username: user.username,
    accountStatus: user.accountStatus,
    picture: user.miniMedia,
    lastMessageSeen: lastMessageSeen,
    messages: chat?.messages ? chat.messages?.slice(-20)?.reverse() : [],
    noMoreMessages: chat.messages.length < 21 ? true : false,
    type: "private",
  };
  return chatObject;
};

const createGroupChat = (event, dateIdentifier) => {
  return getEventMembers(event, dateIdentifier)
    .then((chatMembers) => {
      const chat = new Chat({
        uuid: uuidv4(),
        chatMembers: chatMembers,
        eventId: event._id + "",
        dateIdentifier: dateIdentifier,
        eventName: event.name,
        type: "group",
      });

      let chatMembersEmails = chatMembers.map((member) => member.email);

      return Promise.all([
        askSocketToJoin(chatMembersEmails, chat.uuid),
        Chat.insertMany([chat]),
      ]);
    })

    .then(([join, chats]) => {
      return chats[0];
    });
};

const buildGroupChatData = (chat, event, lastMessageSeen) => {
  const members = getChatMembersUpdated(event, chat);

  const chatObject = {
    uuid: chat.uuid,
    name: event ? event.name : "",
    eventId: chat.eventId,
    dateObject: getDateObjectWithIdentifier(
      event.dateObjects,
      chat.dateIdentifier
    ),
    eventStatus: event ? "active" : "deleted",
    dateIdentifier: chat.dateIdentifier,
    picture: event ? event.miniMediaArray[0] : null,
    lastMessageSeen: lastMessageSeen,
    type: "group",
    eventStatus: event ? "active" : "cancelled",
    location: event?.location,
    messages: chat.messages ? chat.messages?.slice(-20)?.reverse() : [],
    noMoreMessages: chat.messages && chat.messages.length < 21 ? true : false,
    organiser: event?.organiser,
    chatMembers: members.chatMembers,
    currentChatMembers: members.currentChatMembers,
  };
  return chatObject;
};

const getChatMembersUpdated = (event, chat) => {
  try {
    let chatMembers = []; // for final data
    let currentChatMembers = []; // for final data

    chat?.chatMembers?.map((member) => {
      const obj = {
        email: member.email,
        username: member.username,
        microMedia: userImageUrlWithEmail(member.email),
        isRemoved: member.isRemoved,
        isHost: event.organiser == member.email,
      };

      chatMembers.push(obj);
      if (!member.isRemoved) {
        currentChatMembers.push(obj);
      }
    });

    return { chatMembers, currentChatMembers };
  } catch (error) {
    console.log("3nrf843", error);
    return { chatMembers: [], currentChatMembers: [] };
  }
};

const updateUserStatusInChat = (req, chat) => {
  return askSocketToJoin([req.user.email], chat.uuid).then(() => {
    let found = chat.chatMembers.find(
      (member) => member.email == req.user.email
    );
    if (found) {
      return Chat.findOneAndUpdate(
        { uuid: chat.uuid, "chatMembers.email": req.user.email },
        { $set: { "chatMembers.$.isRemoved": false } }
      );
    } else if (!found) {
      return Chat.findOneAndUpdate(
        { uuid: chat.uuid },
        {
          $addToSet: {
            chatMembers: {
              email: req.user.email,
              username: req.user.username,
            },
          },
        }
      );
    }
  });
};

const updateEventNameInGroupChat = (
  eventId,
  dateIdentifier,
  eventName = "",
  oldEventName = ""
) => {
  if (oldEventName != eventName) {
    return mongoFindOneAndUpdate(
      "chats",
      { type: "group", eventId: eventId, dateIdentifier: dateIdentifier },
      { $set: { eventName: eventName } }
    );
  } else {
    return Promise.resolve();
  }
};

const updateUsernameInChats = (email, username = "", oldUsername = "") => {
  if (oldUsername != username) {
    return mongoUpdateMany(
      "chats",
      { "chatMembers.email": email },
      { $set: { "chatMembers.$.username": username } }
    );
  } else {
    return Promise.resolve();
  }
};

module.exports = {
  createGroupChat,
  buildGroupChatData,
  createPrivateChat,
  buildPrivateChatData,
  updateUserStatusInChat,
  updateEventNameInGroupChat,
  updateUsernameInChats,
};

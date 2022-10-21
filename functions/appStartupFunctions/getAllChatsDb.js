const { mongoAggregate } = require("../mongodbDriver");
const {
  buildPrivateChatData,
  buildGroupChatData,
} = require("../../functions/ChatCreationFunctions");
const {
  getMessageTimesForFilter,
  sortByLastMessage,
} = require("../chatFilters");

const getAllChatsDb = (email, offset = 0, limit = 10) => {
  return mongoAggregate("chats", [
    checkChatStatus, // checks for active chats
    checkMessagesLength, // checks for message length
    checkIfNotRemovedFromChat(email), // checks if user has not been removed from chat
    getObjectIdFromChat, // gets event objectId from chat
    addEventToChat, // add event to chat
    filterChatsByEvents(email), // filter if chat events still exist
    getMessageTimesForFilter, // gets last message time objects
    sortByLastMessage, // sort by last message time
    offsetForChats(offset),
    limitForChats(limit),
    addMembers, // adds chat member user objects
  ])
    .then((chats) => {
      let finalChats = [];

      chats.forEach((chat) => {
        if (chat.type == "private") {
          let otherUser =
            chat.users[0].email == email ? chat.users[1] : chat.users[0];

          if (!otherUser) {
            otherUser = {
              ...(chat.chatMembers[0].email == email
                ? chat.chatMembers[1]
                : chat.chatMembers[0]),
              accountStatus: "deleted",
            };
          }
          finalChats.push(
            buildPrivateChatData(
              chat,
              otherUser,
              getLastMessageSeen(chat, email)
            )
          );
        }
        //
        else if (chat.type == "group") {
          finalChats.push(
            buildGroupChatData(
              chat,
              chat.events[0],
              getLastMessageSeen(chat, email)
            )
          );
        }
      });

      return finalChats;
    })
    .catch((error) => {
      console.log(error);
      return [];
    });
};

// checks for active chats
const checkChatStatus = {
  $match: { status: "active" },
};

// checks for message length
const checkMessagesLength = {
  $match: { "messages.0": { $exists: true } },
};

// checks if user has not been removed from chat
const checkIfNotRemovedFromChat = (email) => {
  return {
    $match: {
      chatMembers: {
        $elemMatch: { email: email, isRemoved: { $ne: true } },
      },
    },
  };
};

// gets event objectId from chat
const getObjectIdFromChat = {
  $addFields: {
    convertedId: {
      $convert: { input: "$eventId", to: "objectId", onError: "", onNull: "" },
    },
  },
};

// add event to chat
const addEventToChat = {
  $lookup: {
    from: "events",
    localField: "convertedId",
    foreignField: "_id",
    as: "events",
  },
};

// filter if chat events still exist
const filterChatsByEvents = (email) => {
  return {
    $match: {
      $or: [
        { type: "private" },
        {
          $and: [
            { type: "group" },
            {
              events: {
                $exists: true,
                $ne: [],
              },
            },
          ],
        },
      ],
    },
  };
};

const offsetForChats = (offset) => {
  return { $skip: offset };
};

const limitForChats = (limit) => {
  return { $limit: parseInt(limit) };
};

// adds chat member user objects
const addMembers = {
  $lookup: {
    from: "users",
    localField: "chatMembers.email",
    foreignField: "email",
    as: "users",
  },
};

const getLastMessageSeen = (chat, email) => {
  let lastMessageSeen;
  chat.chatMembers.forEach((element) => {
    if (element.email == email) {
      lastMessageSeen = element.lastMessageSeen;
    }
  });

  return lastMessageSeen;
};

module.exports = { getAllChatsDb, getLastMessageSeen };

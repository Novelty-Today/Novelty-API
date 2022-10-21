const { mongoFind, mongoAggregate } = require("../functions/mongodbDriver");
const { buildMiniEvent } = require("../functions/buildEvent");
const { buildEventFilterCommunities } = require("../functions/filterFunctions");
const { getRegex } = require("../functions/generalFunctions");
const {
  getLastMessageSeen,
} = require("../functions/appStartupFunctions/getAllChatsDb");
const {
  filterMatched,
  matchWithSearchString,
  addMemberAndId,
  addFirstChatMember,
  getValidUserChats,
  getMessageTimesForFilter,
  sortByLastMessage,
} = require("../functions/chatFilters");
const {
  userImageUrlWithEmail,
  eventImageUrlWithId,
} = require("../functions/mediaProccessing");
const { emitToClient, socketEvents } = require("./SocketFunctions");

const generateRandomIndex = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

// sends data in groups of 6 or 3. in groups of 3 one of them will be shown as large
// sample: [{data:[1,2,3,4,5,6]}, {data:[7,8,9], largeIndex: 7},{data:[10,11,12,13,14,15]}]
const discoverEvents = (user, skip = 0, clientSocket) => {
  const sendingNumber = 30;
  let filter = buildEventFilterCommunities(user);
  filter.organiser = { $ne: user.email };
  filter["guests.email"] = { $ne: user.email };

  mongoFind("events", filter, sendingNumber, skip, true)
    .then((events) => {
      if (events.length > 0) {
        let discoverEvents = [];
        let temp = [];
        let groupLength = Math.random() > 0.85 ? 6 : 3;

        events.forEach((element, index) => {
          if (temp.length < groupLength || events.length - 1 == index) {
            temp.push(buildMiniEvent(element));
          }
          if (temp.length == groupLength) {
            discoverEvents.push({
              data: [...temp],
              largeIndex: generateRandomIndex(0, 2),
              largeIndexSide: Math.random() > 0.5 ? "left" : "right",
            });
            temp = [];
            groupLength = Math.random() > 0.5 ? 6 : 3;
          }
        });

        emitToClient(clientSocket, socketEvents.discoverEvents, {
          discoverEvents,
          skip: skip + events.length,
        });
      }
    })
    .catch((error) => {
      console.log("Error ^V&B ", error);
    });
};

const searchEventsAndUsers = (
  user,
  searchString,
  clientSocket,
  searchUniqueId
) => {
  try {
    const filters = getFilters(user, searchString);

    // find data
    return Promise.all([
      mongoFind("users", filters?.userFinalFilter ?? {}, 10, 0),
      mongoFind("events", filters?.eventFinalFilter ?? {}, 10, 0),
    ])
      .then(([users, events]) => {
        let searchResults = [];
        // building final data
        events.forEach((event) => {
          searchResults.push(buildMiniEvent(event, { type: "event" }));
        });
        users.forEach((user) => {
          searchResults.push(buildSearchedUser(user));
        });

        // send data
        emitToClient(clientSocket, socketEvents.search, {
          searchResults,
          searchString,
          searchUniqueId,
        });
      })
      .catch((error) => {
        console.log("Error bajuyfrt ", error);
      });
  } catch (error) {
    console.log("Error adofiha ", error);
  }
};

const searchCommunityUsers = (
  user,
  searchString,
  searchUniqueId,
  offset = 0,
  limit = 10,
  callback
) => {
  try {
    const filters = getFilters(user, searchString);

    mongoAggregate("users", [
      { $match: filters?.userFinalFilter ?? {} },
      { $match: { email: { $ne: user.email } } },
      { $sort: { _id: 1 } },
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) },
    ])
      .then((users) => {
        let searchResults = [];

        users?.forEach((user) => {
          searchResults.push(buildSearchedUser(user));
        });

        const result = {
          searchResults,
          searchString,
          searchUniqueId,
          offset,
          limit,
        };
        // send data
        callback(result);

        return result;
      })
      .catch((error) => {
        console.log("Error iadtgdayfaduyfa ", error);
      });
  } catch (error) {
    console.log("Error gadiutgda68tgfadaf ", error);
  }
};

const buildSearchedUser = (user) => {
  return {
    type: "user",
    email: user.email,
    username: user.username,
    media: user.miniMedia,
    miniMedia: user.microMedia,
  };
};

const getFilters = (user, searchString) => {
  try {
    let eventFinalFilter = { name: getRegex(searchString) };
    let userFinalFilter = { username: getRegex(searchString) };

    if (user?.role != "admin") {
      const eventFilter = buildEventFilterCommunities(user);
      eventFinalFilter = {
        ...eventFilter,
        name: getRegex(searchString),
      };

      const userEmailFilter = { $in: [] };
      eventFilter.forCommunities["$in"].forEach((element) => {
        userEmailFilter["$in"].push(new RegExp(element));
      });

      userFinalFilter = {
        username: getRegex(searchString),
        $or: [
          { email: userEmailFilter },
          { ancestorComunities: userEmailFilter },
        ],
      };
    }

    return { eventFinalFilter, userFinalFilter };
  } catch (error) {
    console.log("Error agioady87y ", error);
    return { eventFinalFilter: {}, userFinalFilter: {} };
  }
};

const searchChats = (user, searchString, clientSocket, searchUniqueId) => {
  mongoAggregate("chats", [
    getValidUserChats(user),
    addFirstChatMember,
    addMemberAndId(user),
    matchWithSearchString(searchString),
    filterMatched,
    getMessageTimesForFilter,
    sortByLastMessage,
  ])
    .then((result) => {
      let searchResults = [];

      result.forEach((chat) => {
        if (chat.type == "group") {
          searchResults.push({
            isPreview: true,
            uuid: chat.uuid,
            name: chat?.eventName,
            picture: eventImageUrlWithId(chat.eventId),
            messages: [chat.messages[chat.messages.length - 1]],
            lastMessageSeen: getLastMessageSeen(chat, user.email),
            type: chat.type,
            eventId: chat.eventId,
            dateIdentifier: chat.dateIdentifier,
          });
        }
        //
        else {
          searchResults.push({
            isPreview: true,
            uuid: chat.uuid,
            username: chat?.member.username,
            picture: userImageUrlWithEmail(chat?.member.email),
            messages: [chat.messages[chat.messages.length - 1]],
            lastMessageSeen: getLastMessageSeen(chat, user.email),
            type: chat.type,
            email: chat?.member.email,
          });
        }
      });

      // sending data
      emitToClient(clientSocket, socketEvents.searchChats, {
        searchResults,
        searchUniqueId,
      });
    })
    .catch((error) => {
      console.log("Error adigua76fat ", error);
    });
};

module.exports = {
  searchEventsAndUsers,
  discoverEvents,
  searchChats,
  searchCommunityUsers,
};

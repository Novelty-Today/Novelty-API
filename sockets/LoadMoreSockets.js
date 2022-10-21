const { tokenValidation } = require("./ValidationSockets");
const {
  getAllChatsDb,
} = require("../functions/appStartupFunctions/getAllChatsDb");
const {
  getAllEventsInvitedDb,
} = require("../functions/appStartupFunctions/getAllEventsInvitedDb");
const {
  getAllMyEventsDb,
} = require("../functions/appStartupFunctions/getAllMyEventsDb");
const {
  getAllMyFavoritesDb,
} = require("../functions/appStartupFunctions/getAllMyFavoritesDb");
const { emitToClient, socketEvents } = require("./SocketFunctions");

const loadMoreScreenDataHandler = (
  clientSocket,
  token,
  type,
  offset,
  limit
) => {
  tokenValidation(token)
    .then((user) => {
      return getData(user, type, offset, getLimit(limit));
    })
    .then((data) => {
      emitToClient(clientSocket, socketEvents.loadMoreScreenData, {
        status: "success",
        data,
        type,
        offset,
        limit,
      });
    })
    .catch((error) => {
      console.log("Error gdigyatfadtyad ", error);

      emitToClient(clientSocket, socketEvents.loadMoreScreenData, {
        status: "fail",
        data: [],
        type,
        offset,
        limit,
      });
    });
};

const getData = (user, type, offset, limit) => {
  if (type == "notifications") {
    return user.notifications.reverse().slice(offset, offset + limit);
  }
  //
  else if (type == "chats") {
    return getAllChatsDb(user.email, offset, limit);
  }
  //
  else if (type == "myEvents") {
    return getAllMyEventsDb(user, "upcoming", offset, limit, limit).then(
      (data) => {
        return data.upcomingProvidingEventsList;
      }
    );
  }
  //
  else if (type == "myPastEvents") {
    return getAllMyEventsDb(user, "past", offset, limit, limit).then((data) => {
      return data.historyProvidingEventsList;
    });
  }
  //
  else if (type == "upcoming") {
    return getAllEventsInvitedDb(user, "upcoming", offset, limit, limit).then(
      (data) => {
        return data.activitiesToAttend;
      }
    );
  }

  //
  else if (type == "pastInvites") {
    return getAllEventsInvitedDb(user, "past", offset, limit, limit).then(
      (data) => {
        return data.attendedActivities;
      }
    );
  }
  //
  else if (type == "liked") {
    return getAllMyFavoritesDb(user, offset, limit);
  }
};

const getLimit = (limit) => {
  let parsedLimit = parseInt(limit);

  return parsedLimit != NaN &&
    parsedLimit != null &&
    parsedLimit != undefined &&
    parsedLimit > 0
    ? parsedLimit
    : 10;
};

module.exports = {
  loadMoreScreenDataHandler,
};

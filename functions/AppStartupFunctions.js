const { getInterests } = require("./generalFunctions");
const { getMostUsedTags } = require("./eventTagFunctions");
const { getAllChatsDb } = require("./appStartupFunctions/getAllChatsDb");
const { getAllMyEventsDb } = require("./appStartupFunctions/getAllMyEventsDb");
const {
  getAllMyFavoritesDb,
} = require("./appStartupFunctions/getAllMyFavoritesDb");
const {
  getAllEventsInvitedDb,
} = require("./appStartupFunctions/getAllEventsInvitedDb");
const { getAccountInfo } = require("./appStartupFunctions/getAccountInfo");
const {
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const getAllDataForApp = (user, query = null) => {
  const version = query?.version;
  const notificationsLimit = getLimit(version, query?.notificationsLimit);
  const chatsLimit = getLimit(version, query?.chatsLimit);
  const myEventsLimit = getLimit(version, query?.myEventsLimit);
  const myPastEventsLimit = getLimit(version, query?.myPastEventsLimit);
  const upcomingLimit = getLimit(version, query?.upcomingLimit);
  const pastInvitesLimit = getLimit(version, query?.pastInvitesLimit);
  const favoritesLimit = getLimit(version, query?.favoritesLimit);

  if (version == "1.0.1" || version == "1.0.2") {
    let data = {
      upcomingProvidingEventsList: [], //getMyEvents
      historyProvidingEventsList: [], //getMyEvents
      attendedActivities: [], //getUpcomingActivities(user, true) past
      activitiesToAttend: [], //getUpcomingActivities(user, false) upcoming
      favorites: [], //getFavorites
      notifications: getNotifications(user, notificationsLimit), //getNotifications
      chatsList: [], // all chats sorted
      interests: [], //getInterests
      mostUsedTags: [],
    };

    Promise.all([
      getAllMyEventsDb(user, "All", 0, myEventsLimit, myPastEventsLimit), // my activities: future and past
      getAllEventsInvitedDb(user, "All", 0, upcomingLimit, pastInvitesLimit), // attended activities and activities to attend
      getAllMyFavoritesDb(user, 0, favoritesLimit),
      getAllChatsDb(user.email, 0, chatsLimit),
      getAccountInfo(user),
      getMostUsedTags(user),
      getInterests(),
    ])
      .then(
        ([
          myEvents,
          invitedEvents,
          favorites,
          chatsList,
          userInfo,
          mostUsedTags,
          interests,
        ]) => {
          data.upcomingProvidingEventsList =
            myEvents.upcomingProvidingEventsList || []; //getMyEvents
          data.historyProvidingEventsList =
            myEvents.historyProvidingEventsList || []; //getMyEvents
          data.attendedActivities = invitedEvents.attendedActivities || []; //getUpcomingActivities(user, true) past
          data.activitiesToAttend = invitedEvents.activitiesToAttend || []; //getUpcomingActivities(user, false) upcoming
          data.favorites = favorites || []; //getFavorites
          data.chatsList = chatsList;
          data.mostUsedTags = mostUsedTags;
          data.interests = interests;

          sendSocketEventToUsers([user], socketEvents.getData, {
            type: "getAllData",
            data,
            userInfo,
          });
        }
      )
      .catch((error) => console.log("Error de4fr5w", error.message));
  }
};

const getNotifications = (user, notificationsLimit) => {
  // seenNotifications and newNotifications can be removed later
  try {
    return notificationsLimit
      ? user.notifications.reverse().slice(0, notificationsLimit)
      : user.notifications.reverse();
  } catch (error) {
    console.log("Error alicar3iarc9r;a98..484", error);
    return [];
  }
};

const getLimit = (version, limit) => {
  let parsedLimit = parseInt(limit);
  if (version == "1.0.2") {
    return parsedLimit != NaN &&
      parsedLimit != null &&
      parsedLimit != undefined &&
      parsedLimit > 0
      ? parsedLimit
      : 10;
  } else {
    return 100000;
  }
};

module.exports = { getAllDataForApp };

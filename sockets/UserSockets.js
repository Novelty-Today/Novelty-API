const {
  mongoFind,
  mongoFindOne,
  mongoFindOneAndUpdate,
  mongoFindSpecificField,
} = require("../functions/mongodbDriver");
const { buildEventsHosted } = require("../functions/buildEvent");
const { getUserInviters } = require("../functions/userConnectionFunctions");
const mongoose = require("mongoose");
const { getMainScreenEvents } = require("../functions/getEventsForMainScreen");
const { emitToClient, socketEvents } = require("./SocketFunctions");
const User = mongoose.model("User");

const getProfileDataAndEventsHosted = (email = "", recieverEmail = "") => {
  return Promise.all([
    mongoFindOne("users", { email }),
    getUserInviters(email),
    mongoFindSpecificField("events", {
      organiser: email,
      isOld: false,
      displayOnHomeScreen: true,
      privacy: { $ne: "private-event-invitation" },
    }),
    mongoFind("favorites", {
      email: recieverEmail,
    }),
  ])
    .then(([user, inviter, events, favoritesArray]) => {
      if (user) {
        const userData = {
          picture: user?.media,
          miniPicture: user?.miniMedia,
          microPicture: user?.microMedia,
          mediaArray: user?.mediaArray,
          username: user?.username,
          email: user.email,
          location: user?.location,
          description: user?.description,
          interests: user?.interests,
          organiserInterests: user?.interests,
          inviteAncestors: inviter,
          socialIntegrations: user?.socialIntegrations,
          isPendingUser: user?.role == "pendingUser",
        };
        const eventsHosted = buildEventsHosted(events, user, favoritesArray);
        return {
          userData,
          eventsHosted,
        };
      } else {
        return {
          eventsIndexInDb: 0,
          canLoadMoreEvents: true,
          userData: {},
          eventsHosted: [],
        };
      }
    })
    .catch((error) => {
      console.log("Error iu*^&%^ ", error);
      return {
        eventsIndexInDb: 0,
        canLoadMoreEvents: true,
        userData: {},
        eventsHosted: [],
      };
    });
};

const updateCalendarAccessInfo = (user, enabledCalendarPermissions) => {
  User.findOneAndUpdate(
    { email: user.email },
    { $set: { enabledCalendarPermissions: enabledCalendarPermissions } }
  ).catch((error) => {
    console.log("Error ajfahyt86 ", error);
  });
};

const updateTagsFilter = (
  email,
  selectedTags,
  clientSocket,
  updateUniqueId
) => {
  mongoFindOneAndUpdate(
    "users",
    { email: email },
    { $set: { currentEventNumber: 0 } },
    { returnDocument: "after" }
  )
    .then((updatedUser) => {
      if (updatedUser) {
        return getMainScreenEvents(updatedUser, selectedTags);
      }
    })
    .then((data) => {
      emitToClient(clientSocket, socketEvents.reloadMainScreenEvents, {
        data,
        updateUniqueId,
      });
    })
    .catch((error) => {
      console.log("Error ajfahyt86 ", error);
    });
};

module.exports = {
  getProfileDataAndEventsHosted,
  updateCalendarAccessInfo,
  updateTagsFilter,
};

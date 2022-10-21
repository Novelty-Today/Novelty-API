const { mongoFindOne, mongoFind } = require("./mongodbDriver");
const ObjectId = require("mongodb").ObjectId;
const {
  findClosestDateObject,
  compareTwoDateObjects,
  isDateObjectOld,
} = require("./dateComparisons");
const { getGuestsDataFromEvent } = require("./guestGetterFunctions");
const { getCanWriteFeedback } = require("./verificationFlowCheckers");

const buildFoundEvent = (
  event,
  dateIdentifier,
  userEmail,
  organiser,
  favoritesArray = [],
  canWriteFeedback = false
) => {
  try {
    // 1) dates
    let dateObjectFinal;
    if (dateIdentifier == "Closest date") {
      dateObjectFinal = findClosestDateObject(event.dateObjects);
    } else if (dateIdentifier != "Closest date") {
      event?.dateObjects?.forEach((obj) => {
        if (obj.dateIdentifier == dateIdentifier) {
          dateObjectFinal = obj;
        }
      });
    }

    // 2) guests
    let guestData = getGuestsDataFromEvent(
      event,
      dateObjectFinal.dateIdentifier
    );

    // 3) favorites
    let liked = isLiked(favoritesArray, userEmail);
    let numberOfLikes = favoritesArray?.length;

    const eventObject = {
      eventId: event._id + "",
      name: event.name,
      description: event.description,
      dateObject: dateObjectFinal,
      dateObjects: event.dateObjects,
      finishedDateIdentifiers: event.finishedDateIdentifiers,
      location: event.location,
      coordinates: {
        longitude: event.geometry ? event.geometry.coordinates[0] : 360,
        latitude: event.geometry ? event.geometry.coordinates[1] : 360,
      },
      privacy: event.privacy,
      price: event.price,
      status: "active",
      capacity: event.capacity,
      liked,
      numberOfLikes,
      rating: event.rating,
      organiser: {
        email: organiser.email,
        username: organiser.username,
        picture: organiser.miniMedia,
        microPicture: organiser.microMedia,
      },
      guestList: guestData.guestList,
      guestCount: guestData.guestCount,
      mediaArray: event.mediaArray,
      miniMediaArray: event.miniMediaArray,
      zoomMeeting: event.zoomMeeting,
      googleMeet: event.googleMeet,
      showOnlineMeetingToPublic: event.showOnlineMeetingToPublic,
      uploadTime: event.uploadTime,
      lastModified: event.lastModified,
      isOld: event.isOld,
      canWriteFeedback: canWriteFeedback,
      clubAffiliations: event.clubAffiliations,
    };

    return eventObject;
  } catch (error) {
    console.log(
      "Error fvfg5  ",
      error,
      event?._id,
      event?.name,
      dateIdentifier
    );
  }
};

const getEventDataWithLinks = (
  eventId,
  dateIdentifier = "Closest date",
  userEmail,
  checkCanWriteFeedback = false
) => {
  return new Promise((resolve, reject) => {
    let event;
    let favoritesArray;
    let organiser;
    Promise.all([
      mongoFindOne("events", { _id: ObjectId(eventId) }),
      mongoFind("favorites", {
        eventId,
      }),
    ])
      .then(([eventData, favoritesArrayData]) => {
        if (!eventData) {
          throw new Error("Event does not exist");
        }
        event = eventData;
        favoritesArray = favoritesArrayData;
        return mongoFindOne("users", { email: event.organiser });
      })
      .then((organiserData) => {
        organiser = organiserData;
        if (checkCanWriteFeedback) {
          return getCanWriteFeedback(eventId, dateIdentifier, userEmail);
        }
      })
      .then((canWriteFeedback) => {
        let eventObject = buildFoundEvent(
          event,
          dateIdentifier,
          userEmail,
          organiser,
          favoritesArray,
          canWriteFeedback?.canWrite
        );
        resolve(eventObject);
      })
      .catch((error) => {
        console.log("error iaefaf89a ", error);
        reject(error.message);
      });
  });
};

const buildEventsHosted = (events, organiser, favoritesArray) => {
  let builtEvents = [];

  events?.forEach((event) => {
    event?.dateObjects?.forEach((dateObject) => {
      if (
        !event?.finishedDateIdentifiers?.includes(dateObject?.dateIdentifier) &&
        !isDateObjectOld(dateObject)
      ) {
        builtEvents.push(
          buildFoundEvent(
            event,
            dateObject?.dateIdentifier,
            organiser?.email,
            organiser,
            favoritesArray
          )
        );
      }
    });
  });

  builtEvents = builtEvents?.sort((a, b) => {
    return compareTwoDateObjects(a?.dateObject, b?.dateObject);
  });

  return builtEvents;
};

const findOrganiserAndBuilEvent = (
  event,
  dateIdentifier,
  userEmail,
  favoritesArray,
  checkCanWriteFeedback = false
) => {
  let organiser;
  return mongoFindOne("users", { email: event.organiser })
    .then((organiserData) => {
      organiser = organiserData;

      if (checkCanWriteFeedback) {
        return getCanWriteFeedback(event._id, dateIdentifier, userEmail);
      }
    })
    .then((canWriteFeedback) => {
      return buildFoundEvent(
        event,
        dateIdentifier,
        userEmail,
        organiser,
        favoritesArray,
        canWriteFeedback?.canWrite
      );
    });
};

const buildMiniEvent = (event, extraParams = {}) => {
  let eventObject = {
    eventId: event._id,
    name: event.name,
    dateObject: findClosestDateObject(event.dateObjects),
    location: event.location,
    media: event.mediaArray[0],
    miniMedia: event.miniMediaArray[0],
    ...extraParams,
  };

  return eventObject;
};

const isLiked = (favoritesArray = [], email) => {
  try {
    let liked = favoritesArray?.find((element) => element.email == email);
    if (liked) return true;
    else return false;
  } catch (error) {
    console.log("Error at76tf ", error);
    return false;
  }
};

module.exports = {
  getEventDataWithLinks,
  buildFoundEvent,
  buildEventsHosted,
  buildMiniEvent,
  findOrganiserAndBuilEvent,
};

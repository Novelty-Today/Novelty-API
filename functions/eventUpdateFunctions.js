const {
  modifyMyEventWithSocket,
  modifyUpcomingEventWithSocket,
} = require("../sockets/EventSockets");
const ObjectId = require("mongodb").ObjectId;
const { updateTimeTagsFunction } = require("../Tasks/TagTasks");
const { getCoords } = require("./event");
const { getGuestEmails } = require("./guestGetterFunctions");
const { createDateUpdateAlertTask } = require("../Tasks/EventUpdateTasks");
const {
  getDateObjectWithIdentifier,
  compareTwoDateObjects,
} = require("./dateComparisons");
const {
  multipleMediaProcessing,
} = require("./multipleMediaProcessing/multipleMediaProcessing");
const { googleCloudMediaBuckets } = require("../constants");
const { mongoFindOneAndUpdate } = require("./mongodbDriver");

const handleEventMediaUpdate = (
  event,
  mediaFilenamesArray = [],
  mediaArrayToDelete = []
) => {
  try {
    let filenamesToDelete = [];

    mediaArrayToDelete?.forEach((element) => {
      const temp = element.split("/");
      filenamesToDelete.push(temp[temp.length - 1]);
    });

    return Promise.resolve()
      .then(() => {
        if (mediaFilenamesArray && mediaFilenamesArray.length > 0) {
          return multipleMediaProcessing(
            mediaFilenamesArray,
            googleCloudMediaBuckets.eventMediaBucket
          );
        } else {
          return [[], []];
        }
      })
      .then((filenamesArray) => {
        let mediaArray = [
          ...event.mediaArray.filter(
            (item) => !mediaArrayToDelete.includes(item)
          ),
          ...filenamesArray[0],
        ];
        let miniMediaArray = [
          ...event.miniMediaArray.filter(
            (item, index) =>
              !mediaArrayToDelete.includes(event.mediaArray[index])
          ),
          ...filenamesArray[1],
        ];

        return {
          mediaArray: mediaArray,
          miniMediaArray: miniMediaArray,
        };
      })
      .catch((error) => {
        console.log("Error asiuetws45watf76rt675 ", error);
        return {
          mediaArray: [],
          miniMediaArray: [],
        };
      });
  } catch (error) {
    console.log("Error asiuatf76rt675 ", error);
    return {
      mediaArray: [],
      miniMediaArray: [],
    };
  }
};

const getCoordinatesToUpdate = (location) => {
  if (location) {
    return getCoords(location)
      .then((coords) => {
        if (coords) {
          return (geometry = {
            coordinates: [coords.longitude, coords.latitude],
            type: "Point",
          });
        } else {
          return null;
        }
      })
      .catch((error) => {
        console.log("Error adagt76yt76 ", error);
        return null;
      });
  } else {
    return Promise.resolve(null);
  }
};

const updateDateInEvent = (
  eventId,
  dateIdentifier,
  dateString = new Date().toUTCString(),
  onlyHas = "dateTime",
  partOfDay = "morning",
  shouldUpdate = true,
  includeHost = true
) => {
  if (shouldUpdate) {
    return mongoFindOneAndUpdate(
      "events",
      {
        _id: ObjectId(eventId),
        "dateObjects.dateIdentifier": dateIdentifier,
      },
      {
        $set: {
          "dateObjects.$.dateString":
            onlyHas == "none" ? "Flexible" : new Date(dateString).toUTCString(),
          "dateObjects.$.onlyHas": onlyHas,
          "dateObjects.$.partOfDay": partOfDay,
        },
      },
      { returnDocument: "after" }
    ).then((event) => {
      let dateObject;

      event.dateObjects.forEach((element) => {
        if (element.dateIdentifier == dateIdentifier) {
          dateObject = element;
        }
      });

      const emails = getGuestEmails(event, dateIdentifier, includeHost);

      emails.forEach((email) => {
        createDateUpdateAlertTask(email, event._id + "", dateIdentifier);
      });

      modifyMyEventWithSocket(eventId, dateObject);
      modifyUpcomingEventWithSocket(eventId, dateObject);

      updateTimeTagsFunction(eventId);

      return dateObject;
    });
  } else {
    return Promise.resolve(null);
  }
};

const updateLocationInEvent = (eventId, location, lng, lat) => {
  return mongoFindOneAndUpdate(
    "events",
    { _id: ObjectId(eventId) },
    {
      $set: {
        location: location,
        geometry: {
          coordinates: [lng, lat],
          type: "Point",
        },
      },
    }
  ).then(() => {
    modifyMyEventWithSocket(eventId);
    modifyUpcomingEventWithSocket(eventId);
  });
};

const isDateUpdating = (event, dateIdentifier, dateObject) => {
  const existingDateObj = getDateObjectWithIdentifier(
    event.dateObjects,
    dateIdentifier
  );

  return (
    dateIdentifier &&
    dateObject &&
    compareTwoDateObjects(existingDateObj, dateObject) != 0
  );
};

module.exports = {
  handleEventMediaUpdate,
  getCoordinatesToUpdate,
  updateDateInEvent,
  updateLocationInEvent,
  isDateUpdating,
};

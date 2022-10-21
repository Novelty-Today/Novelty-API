const { mongoAggregate } = require("../mongodbDriver");
const { buildFoundEvent } = require("../buildEvent");
const { addDateObjectForFiltering } = require("./getAppDataGeneralFunctions");
const { getCanWriteFeedback } = require("../verificationFlowCheckers");

// getType => All(on app start we need both lists), upcoming(gets only future events), past(gets only old events)
const getAllEventsInvitedDb = (
  user,
  getType = "All",
  offset = 0,
  limit = 10,
  pastsLimit = 10
) => {
  const start = new Date().getTime();

  return Promise.all([
    buildEventsToAttend(getType, user, offset, limit ?? 10), // gets events user is guest that are not old yet
    buildAttendedEvents(getType, user, offset, pastsLimit ?? 10), // gets events user is guest that are old
  ])
    .then(([activitiesToAttend, attendedActivities]) => {
      return {
        status: "success",
        attendedActivities: attendedActivities,
        activitiesToAttend: activitiesToAttend,
      };
    })
    .catch((error) => {
      console.log("Error gadiygatg87", error);
      return {
        status: "fail",
        attendedActivities: [],
        activitiesToAttend: [],
      };
    });
};

// gets sorted and spliced data from server with favorites list and organiser. returns only future events
const buildEventsToAttend = (getType, user, offset, limit) => {
  let attendedActivities = [];

  if (getType == "All" || getType == "upcoming") {
    return getEventsToAttend(user, offset, limit).then((events) => {
      events.forEach((event) => {
        attendedActivities.push(
          buildFoundEvent(
            event,
            event.dateObject.dateIdentifier,
            user.email,
            event.organisers[0],
            event.favorites
          )
        );
      });
      return attendedActivities;
    });
  } else {
    return Promise.resolve([]);
  }
};

// gets sorted and spliced data from server with favorites list and organiser. returns only past events
const buildAttendedEvents = (getType, user, offset, pastsLimit) => {
  let activitiesToAttend = [];

  if (getType == "All" || getType == "past") {
    return getAttendedEvents(user, offset, pastsLimit).then((events) => {
      // return events;
      events.forEach((event) => {
        // user is organiser and we dont want to get user object anymore

        activitiesToAttend.push(
          getCanWriteFeedback(
            event._id + "",
            event.dateObject.dateIdentifier,
            user.email
          ).then((canWriteFeedback) => {
            return buildFoundEvent(
              event,
              event.dateObject.dateIdentifier,
              user.email,
              event.organisers[0],
              event.favorites,
              canWriteFeedback?.canWrite
            );
          })
        );
      });

      return Promise.all(activitiesToAttend);
    });
  } else {
    return Promise.resolve([]);
  }
};

const getEventsToAttend = (user, offset, limit) => {
  return mongoAggregate("events", [
    { $match: { isOld: false } }, // filter events which are not old
    matchGuests(user.email), // filters where user is guest
    addFields, //creates guest and dateObject list which is duplicate of guests and dateObjects for now.
    { $unwind: "$dateObject" }, // devide events with dateObject. if event has 2 dateObjects it will split them with as two events (will not effect how it is saved in db)
    addDateObjectForFiltering("upcoming"), // create dateObject from our custom date object
    { $match: { date: { $gt: new Date() } } }, // filter for future events
    { $unwind: "$guest" }, // devide by guest
    {
      $match: { "guest.email": user.email }, // filter where guest object is correct
    },
    markCorrectData, // mark items where guest dateIdentifier is same as item date identifier
    filterCorrectData, // filters for correctly marked data
    { $sort: { sortDate: 1, _id: 1 } }, // sort
    { $skip: offset },
    { $limit: parseInt(limit) },
    organiserLookup, // adds organiser
    favoritesLookup, // adds favorites list
  ]);
};

const getAttendedEvents = (user, offset, pastsLimit) => {
  return mongoAggregate("events", [
    matchGuests(user.email), // filters where user is guest
    addFields, //creates guest and dateObject list which is duplicate of guests and dateObjects for now.
    { $unwind: "$dateObject" }, // devide events with dateObject. if event has 2 dateObjects it will split them with as two events (will not effect how it is saved in db)
    addDateObjectForFiltering("past"), // create dateObject from our custom date object
    {
      $match: {
        $or: [{ date: { $lt: new Date() } }, { isOld: true }], // check for old events or events which have past date
      },
    },
    { $unwind: "$guest" }, // devide by guest
    {
      $match: { "guest.email": user.email }, // filter where guest object is correct
    },
    markCorrectData, // mark items where guest dateIdentifier is same as item date identifier
    filterCorrectData, // filters for correctly marked data
    { $sort: { sortDate: -1, _id: 1 } }, // sort
    { $skip: offset },
    { $limit: parseInt(pastsLimit) },
    organiserLookup, // adds organiser
    favoritesLookup, // adds favorites list
  ]);
};

// adds organiser
const organiserLookup = {
  $lookup: {
    from: "users",
    localField: "organiser",
    foreignField: "email",
    as: "organisers",
  },
};

// adds favorites list
const favoritesLookup = {
  $lookup: {
    from: "favorites",
    localField: "eventId",
    foreignField: "eventId",
    as: "favorites",
  },
};

// filters where user is guest
const matchGuests = (email) => {
  return {
    $match: {
      guests: {
        $elemMatch: {
          email: email,
          status: "accepted",
          coHost: false,
        },
      },
    },
  };
};

//creates guest and dateObject list which is duplicate of guests and dateObjects for now.
const addFields = {
  $addFields: {
    dateObject: "$dateObjects",
    guest: "$guests",
  },
};

// mark items where guest dateIdentifier is same as item date identifier
const markCorrectData = {
  $addFields: {
    correct: {
      $cmp: ["$dateObject.dateIdentifier", "$guest.dateIdentifier"],
    },
  },
};

// filters for correctly marked data
filterCorrectData = {
  $match: { correct: 0 },
};

module.exports = { getAllEventsInvitedDb };

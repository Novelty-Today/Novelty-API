const { mongoAggregate } = require("../mongodbDriver");
const { findOrganiserAndBuilEvent, buildFoundEvent } = require("../buildEvent");
const { isAcceptedCoOrganiser } = require("../guestGetterFunctions");
const { addDateObjectForFiltering } = require("./getAppDataGeneralFunctions");
const { getCanWriteFeedback } = require("../verificationFlowCheckers");

// getType => All(on app start we need both lists), upcoming(gets only future events), past(gets only old events)
const getAllMyEventsDb = (
  user,
  getType = "All",
  offset = 0,
  limit = 10,
  pastsLimit = 10
) => {
  return Promise.all([
    buildUpcomingProvidingEvents(getType, user, offset, limit), // gets events user hosts that are not old
    buildHistoryProvidingEvents(getType, user, offset, pastsLimit), // gets events user hosts that are old
  ])
    .then(([upcomingProvidingEventsList, historyProvidingEventsList]) => {
      return {
        status: "success",
        upcomingProvidingEventsList: upcomingProvidingEventsList,
        historyProvidingEventsList: historyProvidingEventsList,
      };
    })
    .catch((error) => {
      console.log("Error gaiduytd7yf78fgyad", error);
      return {
        status: "fail",
        upcomingProvidingEventsList: [],
        historyProvidingEventsList: [],
      };
    });
};

const buildUpcomingProvidingEvents = (getType, user, offset, limit) => {
  let upcomingProvidingEventsList = [];

  if (getType == "All" || getType == "upcoming") {
    return getUpcomingProvidingEvents(user, offset, limit).then((events) => {
      // return events;
      events.forEach((event) => {
        // user is organiser and we dont want to get user object anymore
        if (event.organiser == user.email) {
          upcomingProvidingEventsList.push(
            buildFoundEvent(
              event,
              event.dateObject.dateIdentifier,
              user.email,
              user,
              event.favorites
            )
          );
        }
        // user is cohost and we need to find userobject in database
        else if (isAcceptedCoOrganiser(event.guests, user.email)) {
          upcomingProvidingEventsList.push(
            findOrganiserAndBuilEvent(
              event,
              event.dateObject.dateIdentifier,
              user.email,
              event.favorites
            )
          );
        }
      });
      return Promise.all(upcomingProvidingEventsList);
    });
  } else {
    return Promise.resolve([]);
  }
};

const buildHistoryProvidingEvents = (getType, user, offset, pastsLimit) => {
  let historyProvidingEventsList = [];

  if (getType == "All" || getType == "past") {
    return getHistoryProvidingEvents(user, offset, pastsLimit).then(
      (events) => {
        // return events;
        events.forEach((event) => {
          // user is organiser and we dont want to get user object anymore
          if (event.organiser == user.email) {
            historyProvidingEventsList.push(
              getCanWriteFeedback(
                event._id + "",
                event.dateObject.dateIdentifier,
                user.email
              ).then((canWriteFeedback) => {
                return buildFoundEvent(
                  event,
                  event.dateObject.dateIdentifier,
                  user.email,
                  user,
                  event.favorites,
                  canWriteFeedback?.canWrite
                );
              })
            );
          }
          // user is cohost and we need to find userobject in database
          else if (isAcceptedCoOrganiser(event.guests, user.email)) {
            historyProvidingEventsList.push(
              findOrganiserAndBuilEvent(
                event,
                event.dateObject.dateIdentifier,
                user.email,
                event.favorites,
                true
              )
            );
          }
        });
        return Promise.all(historyProvidingEventsList);
      }
    );
  } else {
    return Promise.resolve([]);
  }
};

// gets sorted and spliced data from server with favorites list. each event in the list is getting dateObject based on dateObjects
const getUpcomingProvidingEvents = (user, offset, limit) => {
  return mongoAggregate("events", [
    { $match: { isOld: false } }, // filter events which are not old
    matchOrganiserOrCoHost(user.email), // filter where user is host or cohost
    addDateObjectAndId, //creates dateObject list which is duplicate of dateObjects for now. adds eventId with type string which we need for favorites search
    { $unwind: "$dateObject" }, // devide events with dateObject. if event has 2 dateObjects it will split them with as two events (will not effect how it is saved in db)
    addDateObjectForFiltering("upcoming"), // create dateObject from our custom date object
    { $match: { date: { $gt: new Date() } } }, // filter for new events
    { $sort: { sortDate: 1, _id: 1 } }, // sorting
    { $skip: offset },
    { $limit: parseInt(limit) },
    favoritesLookup, // add favorites list for each event
  ]);
};

// gets sorted and spliced data from server with favorites list. each event in the list is getting dateObject based on dateObjects
const getHistoryProvidingEvents = (user, offset, pastsLimit) => {
  return mongoAggregate("events", [
    matchOrganiserOrCoHost(user.email), // filter where user is host or cohost
    addDateObjectAndId, //creates dateObject list which is duplicate of dateObjects for now. adds eventId with type string which we need for favorites search
    { $unwind: "$dateObject" }, // devide events with dateObject. if event has 2 dateObjects it will split them with as two events (will not effect how it is saved in db)
    addDateObjectForFiltering("past"), // create dateObject from our custom date object
    {
      $match: {
        $or: [{ date: { $lt: new Date() } }, { isOld: true }], // check for old events or events which have past date
      },
    },
    { $sort: { sortDate: -1, _id: 1 } }, // sorting
    { $skip: offset },
    { $limit: parseInt(pastsLimit) },
    favoritesLookup, // add favorites list for each event
  ]);
};

// filter where user is host or cohost
const matchOrganiserOrCoHost = (email) => {
  return {
    $match: {
      $or: [
        { organiser: email },
        {
          guests: {
            $elemMatch: {
              email: email,
              status: "accepted",
              coHost: true,
            },
          },
        },
      ],
    },
  };
};

//creates dateObject list which is duplicate of dateObjects for now. adds eventId with type string which we need for favorites search
const addDateObjectAndId = {
  $addFields: {
    dateObject: "$dateObjects",
    eventId: { $toString: "$_id" },
  },
};

// add favorites list for each event
const favoritesLookup = {
  $lookup: {
    from: "favorites",
    localField: "eventId",
    foreignField: "eventId",
    as: "favorites",
  },
};

module.exports = { getAllMyEventsDb };

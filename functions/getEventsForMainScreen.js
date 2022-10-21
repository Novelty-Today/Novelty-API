const { findOrganiserAndBuilEvent } = require("./buildEvent");
const { buildEventFilterCommunities } = require("./filterFunctions");
const { getRandomNumberInRange } = require("./generalFunctions");
const {
  mongoFind,
  mongoUpdateOne,
  mongoAggregate,
} = require("./mongodbDriver");

const mongoose = require("mongoose");
const {
  getClosestDateIdentifierWithTimeFilters,
} = require("./timeTagFunctions");
const Event = mongoose.model("Event");

const getMainScreenEvents = (
  user,
  selectedTags = [],
  numberOfEvents = 3,
  randomizeCurrentEventNumber = false // if we are getting events on app start we need to randomize this number
) => {
  let isLastEvent = false;
  let events, nextNumber;

  const filter = buildEventFilterCommunities(user, selectedTags);

  return getEventsFromDb(
    filter,
    user,
    numberOfEvents,
    randomizeCurrentEventNumber
  )
    .then((result) => {
      events = result.events;
      nextNumber = result.nextNumber;
      isLastEvent = result.isLastEvent;
      return mongoUpdateOne(
        "users",
        { email: user.email },
        { $set: { currentEventNumber: nextNumber } }
      );
    })
    .then(() => {
      return Promise.all(
        events?.map((event) => {
          if (event?._id) {
            return mongoFind("favorites", { eventId: event?._id + "" }).then(
              (favorites) => {
                return findOrganiserAndBuilEvent(
                  event,
                  getClosestDateIdentifierWithTimeFilters(
                    event.dateObjects,
                    selectedTags
                  ) ?? "Closest date",
                  user.email,
                  favorites
                );
              }
            );
          }
        })
      );
    })
    .then((eventsData) => {
      const events = eventsData.filter((event) => event?.eventId);

      return {
        message: isLastEvent ? "isLastEvent" : "success",
        events: events,
      };
    })
    .catch((error) => {
      console.log("Erroir auf9a87f ", error);
      return { message: "fail", events: [] };
    });
};

const getEventsFromDb = (filter, user, numberOfEvents, randomize = false) => {
  let nextNumber, isLastEvent, currentEventNumber;

  return Event.count(filter)
    .then((count) => {
      currentEventNumber = randomize
        ? getRandomNumberInRange(0, count - numberOfEvents)
        : user.currentEventNumber;

      isLastEvent = count <= currentEventNumber + numberOfEvents;

      nextNumber =
        currentEventNumber + numberOfEvents >= count
          ? 0
          : currentEventNumber + numberOfEvents;

      return mongoAggregate("events", [
        { $match: filter },
        addCommonInterests(user),
        addRating(),
        { $sort: { rating: -1, _id: 1 } },
        { $skip: Math.max(parseInt(currentEventNumber), 0) },
        { $limit: parseInt(numberOfEvents) },
      ]);
    })
    .then((events) => {
      return { events, nextNumber, isLastEvent };
    })
    .catch((error) => {
      console.log("Error oigyat8gfta ", error, user?.email);
      return { events: [], nextNumber: currentEventNumber, isLastEvent };
    });
};

const addCommonInterests = (user) => {
  return {
    $addFields: {
      commonInterests: { $setIntersection: ["$tags", user?.interests] },
    },
  };
};

const addRating = () => {
  const likesCountWeight = 0.3;
  const interestsMatchedWeight = 0.4;

  return {
    $addFields: {
      rating: {
        $add: [
          {
            $multiply: [{ $size: "$commonInterests" }, interestsMatchedWeight],
          },
          {
            $multiply: [
              {
                $log: [{ $max: [{ $add: ["$likesCount", 1] }, 1] }, Math.E],
              },
              likesCountWeight,
            ],
          },
        ],
      },
    },
  };
};

module.exports = { getMainScreenEvents };

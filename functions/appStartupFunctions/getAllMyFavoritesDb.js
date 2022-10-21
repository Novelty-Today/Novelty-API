const { buildFoundEvent } = require("../buildEvent");
const { mongoAggregate } = require("../mongodbDriver");

// getType => All, upcoming, past
const getAllMyFavoritesDb = (user, offset = 0, limit = 10) => {
  return mongoAggregate("favorites", [
    matchUserFavorites(user), // filters users favorites
    addEventObjectId, // adds objectId for eventId
    addEvents, // adds events to each favorite object
    checkEventExistance, // check if events still exist
    addOrganisers, // adds organisers for favorited events
    { $sort: { sortId: -1 } }, // sort
    offsetForChats(offset),
    limitForChats(limit),
    addFavorites, // adds favorites list for each event // used to show likes count
  ])
    .then((favorites) => {
      let events = [];

      favorites.forEach((favorite) => {
        events.push(
          buildFoundEvent(
            favorite.events[0],
            "Closest date",
            user.email,
            favorite.organisers[0],
            favorite.favoritesList
          )
        );
      });

      return events;
    })
    .catch((error) => {
      console.log("Error goadyhgmadya", error);
      return [];
    });
};

// filters users favorites
const matchUserFavorites = (user) => {
  return { $match: { email: user.email } };
};

// adds objectId for eventId
const addEventObjectId = {
  $addFields: {
    convertedId: {
      $convert: { input: "$eventId", to: "objectId", onError: "", onNull: "" },
    },
    sortId: { $toString: "$_id" },
  },
};

// adds events to each favorite object
const addEvents = {
  $lookup: {
    from: "events",
    localField: "convertedId",
    foreignField: "_id",
    as: "events",
  },
};

// check if events still exist
const checkEventExistance = { $match: { "events.0": { $exists: true } } };

// adds organisers for favorited events
const addOrganisers = {
  $lookup: {
    from: "users",
    localField: "events.0.organiser",
    foreignField: "email",
    as: "organisers",
  },
};

// adds favorites list for each event // used to show likes count
const addFavorites = {
  $lookup: {
    from: "favorites",
    localField: "eventId",
    foreignField: "eventId",
    as: "favoritesList",
  },
};

const offsetForChats = (offset) => {
  return { $skip: offset };
};

const limitForChats = (limit) => {
  return { $limit: parseInt(limit) };
};

module.exports = { getAllMyFavoritesDb };

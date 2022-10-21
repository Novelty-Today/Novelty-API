const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const Order = mongoose.model("Order");
const Chat = mongoose.model("Chat");
const Review = mongoose.model("Review");
const User = mongoose.model("User");
const UserConnection = mongoose.model("UserConnection");
const EventVerification = mongoose.model("EventVerification");
const Friendship = mongoose.model("Friendship");
const fetch = require("node-fetch");
const { googleDirectionsApiKey } = require("../constants");
const { v4: uuidv4 } = require("uuid");
const { validEmailsUniversityNested } = require("../DataLists/emails");
const { getNumbersFromString } = require("./generalFunctions");
const { eventTagsGenerator } = require("./eventTagFunctions");
const { moveFinishedActivity } = require("../sockets/EventSockets");
const {
  compareTwoDateObjects,
  getDateObjectWithIdentifier,
} = require("./dateComparisons");
const {
  getGuestEmailsPromise,
  getGuestEmails,
} = require("./guestGetterFunctions");
const {
  createNotificationEventFinished,
} = require("./createNotificationFunctions");
const {
  createEventVerification,
} = require("./noveltyTokenFunctions/verifyEvents");
const {
  finishStaking,
} = require("./noveltyTokenFunctions/updateCoinFunctions");
const { mongoFindOneSpecificField, mongoFindOne } = require("./mongodbDriver");
const {
  socketEvents,
  isUserOnline,
  sendSocketEventToUsers,
} = require("../sockets/SocketFunctions");

const buildAndSaveEvent = (
  eventData,
  filenamesArray,
  coords,
  organiser,
  forCommunities
) => {
  // giving date objects identifiers
  let dateObjects = [];
  JSON.parse(eventData.dateObjects || "[]").forEach((dateObject) => {
    dateObjects.push({ ...dateObject, dateIdentifier: uuidv4() });
  });
  if (dateObjects.length == 0) {
    dateObjects.push({
      dateIdentifier: uuidv4(),
      dateString: "Flexible",
      onlyHas: "none",
      partOfDay: "day",
    });
  }

  const guests = getInvitedPeople(eventData, dateObjects);

  const tags = eventTagsGenerator([eventData.name, eventData.description]);

  let mediaArray = filenamesArray[0];
  let miniMediaArray = filenamesArray[1];

  let alreadyUploadedMediaArray = gelAlreadyUploadedMediaLinks(
    eventData.alreadyUploadedMediaLinks
  );

  let alreadyUploadedMiniMediaArray = gelAlreadyUploadedMediaLinks(
    eventData.alreadyUploadedMiniMediaLinks
  );

  const event = new Event({
    name: eventData.name,
    description: eventData.description,
    dateObjects: dateObjects,
    location: eventData.location || "Flexible Location",
    mediaArray: [...mediaArray, ...alreadyUploadedMediaArray],
    miniMediaArray: [...miniMediaArray, ...alreadyUploadedMiniMediaArray],
    capacity: eventData?.capacity ?? 3,
    price: parseFloat(eventData?.price) ?? 0,
    privacy: eventData?.privacy ?? "private-event",
    organiser: organiser,
    guests: guests,
    uploadTime: new Date().toUTCString(),
    lastModified: new Date().toUTCString(),
    forCommunities: forCommunities,
    zoomMeeting: eventData?.zoomMeeting ?? "",
    googleMeet: eventData?.googleMeet ?? "",
    showOnlineMeetingToPublic: getShowOnlineMeetingToPublic(eventData),
    tags: tags,
    clubAffiliations: JSON.parse(eventData.clubAffiliations || "[]"),
  });
  if (coords) {
    event.geometry = {
      coordinates: [coords.longitude, coords.latitude],
      type: "Point",
    };
  }

  return Event.insertMany([event]).then((events) => {
    // we need id of event which we get after event creation
    return events;
  });
};

const buildEventFilter = (userObj) => {
  // filter with university communities
  let filterList = [];
  let emailList = [];
  for (var i = 0; i < validEmailsUniversityNested.length; i++) {
    for (var j = 0; j < validEmailsUniversityNested[i].length; j++) {
      const emailEnding = "@" + userObj.email.split("@")[1];
      if (
        validEmailsUniversityNested[i][j].includes(emailEnding) ||
        userObj.ancestorComunities.includes(validEmailsUniversityNested[i][j])
      ) {
        for (var k = 0; k < validEmailsUniversityNested[i].length; k++) {
          if (!emailList.includes(validEmailsUniversityNested[i][k])) {
            filterList.push(
              new RegExp(validEmailsUniversityNested[i][k] + "$")
            );
            emailList.push(validEmailsUniversityNested[i][k]);
          }
        }
      }
    }
  }

  let filter = {
    organiser: { $in: filterList },
    isOld: false,
    privacy: { $ne: "private-event-invitation" },
  };

  return filter;
};

const getCoords = (location) => {
  return new Promise((resolve, reject) => {
    var coords = { longitude: -122.168861, latitude: 37.42823 };

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${googleDirectionsApiKey}`;
    fetch(url)
      .then((value) => value.json())
      .then((json) => {
        if (json.results.length != 0) {
          coords.latitude = parseFloat(json.results[0].geometry.location.lat);
          coords.longitude = parseFloat(json.results[0].geometry.location.lng);
        }
        resolve(coords);
      })
      .catch((error) => {
        resolve(coords);
      });
  });
};

const getForCommunities = (user) => {
  let list = [`@${user.email.split("@")[1]}`];

  if (user.role == "pendingUser") {
    list.push("pendingUser");
  } else {
    user.ancestorComunities.forEach((ancestorComunity) => {
      list.push(ancestorComunity);
    });
  }

  return UserConnection.findOne({ children: user.email })
    .then((connection) => {
      if (connection && !list.includes(`@${connection.user.split("@")[1]}`)) {
        list.push(`@${connection.user.split("@")[1]}`);
      }
      return list;
    })
    .catch((error) => {
      console.log("Error *^&$%^%& ", error);
      return list;
    });
};

const getShowOnlineMeetingToPublic = (data) => {
  try {
    return data.showOnlineMeetingToPublic &&
      JSON.parse(data.showOnlineMeetingToPublic)
      ? true
      : false;
  } catch (error) {
    console.log("Error gaygta ", error);
    return [];
  }
};

const gelAlreadyUploadedMediaLinks = (data) => {
  try {
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.log("Error daig6yt ", error);
    return [];
  }
};

const getInvitedPeople = (eventData, dateObjects) => {
  //
  // first we check cohosts list and then guests list
  // if user is invited as cohost and guest at the same time we ignore invitation for guest.
  //
  try {
    let guests = [];
    let addedGuestIdentifiers = [];

    const getEmail = (element) => {
      return typeof element?.email == "string"
        ? element?.email
        : element?.email?.email;
    };

    const getPhone = (element) => {
      return element?.phone ? getNumbersFromString(element?.phone) : null;
    };

    // adding co-organisers from connections and contacts
    if (eventData?.coHosts) {
      JSON.parse(eventData?.coHosts || "[]")?.forEach((invitedCoHost) => {
        const email = getEmail(invitedCoHost);
        const phone = getPhone(invitedCoHost);
        if (
          !addedGuestIdentifiers.includes(email) &&
          !addedGuestIdentifiers.includes(phone)
        ) {
          addedGuestIdentifiers.push(email ?? phone);

          guests.push({
            email: email,
            phone: phone,
            status: "waitlisted",
            coHost: true,
            addedBy: "organiser",
            time: new Date().toUTCString(),
          });
        }
      });
    }

    if (eventData?.guests) {
      JSON.parse(eventData?.guests || "[]")?.forEach((invitedGuest) => {
        const email = getEmail(invitedGuest);
        const phone = getPhone(invitedGuest);

        if (
          !addedGuestIdentifiers.includes(email) &&
          !addedGuestIdentifiers.includes(phone)
        ) {
          addedGuestIdentifiers.push(email ?? phone);
          // add on all dates
          if (invitedGuest?.date == "Invite on all dates") {
            dateObjects.forEach((dateObject) => {
              guests.push({
                email: email,
                phone: phone,
                status: "waitlisted",
                addedBy: "organiser",
                dateIdentifier: dateObject?.dateIdentifier,
                time: new Date().toUTCString(),
              });
            });
          }
          // add only on one date. here we need to find dateIdentifier
          else {
            dateObjects.forEach((dateObject) => {
              if (compareTwoDateObjects(dateObject, invitedGuest?.date) == 0) {
                guests.push({
                  email: email,
                  phone: phone,
                  status: "waitlisted",
                  addedBy: "organiser",
                  dateIdentifier: dateObject?.dateIdentifier,
                  time: new Date().toUTCString(),
                });
              }
            });
          }
        }
      });
    }

    return guests;
  } catch (error) {
    console.log("Error ahiftb ", error);
    return [];
  }
};

///
// deletes event from events collection, user.events[], order.eventId, review.event
///
const deleteEventWithId = (eventId, dateObject, email) => {
  let eventData;

  return removeEventFromdB(eventId, dateObject, email)
    .then((event) => {
      eventData = event;

      return Promise.all([
        Order.deleteMany({
          eventId,
          dateIdentifier: dateObject.dateIdentifier,
        }),
        Review.deleteMany({
          event: eventId,
          dateIdentifier: dateObject.dateIdentifier,
        }),
        EventVerification.findOne({
          eventId,
          dateIdentifier: dateObject.dateIdentifier,
        }).then((verification) => {
          if (
            verification?.verificationStatus == "not-started" ||
            verification?.verificationStatus == "pending"
          ) {
            return finishStaking(
              [],
              verification.verifiers,
              0,
              verification.stakeRequired,
              eventId,
              true,
              eventData
            );
          }
        }),
        Chat.findOneAndUpdate(
          { eventId: eventId, dateIdentifier: dateObject.dateIdentifier },
          { $set: { status: "disabled" } }
        ),
      ]);
    })
    .then(() => {
      return eventData;
    });
};

const removeEventFromdB = (eventId, dateObject, email) => {
  return new Promise((resolve, reject) => {
    let foundEvent;
    Event.findById(eventId)
      .then((event) => {
        if (event.dateObjects.length < 2) {
          return Event.findByIdAndDelete(eventId)
            .then((eventData) => {
              foundEvent = eventData;

              return User.findOneAndUpdate(
                { email: email },
                {
                  $pull: {
                    events: eventId,
                  },
                }
              );
            })
            .then(() => {
              resolve(event);
            })
            .catch((error) => {
              console.log("Error aefiayiuahf ", error);
              reject(error);
            });
        } else {
          return Event.findOneAndUpdate(
            { _id: eventId },
            { $pull: { dateObjects: dateObject } }
          )
            .then((deletedEvent) => {
              resolve(deletedEvent);
            })
            .catch((error) => {
              console.log("Error a;fja;ofacraiacrajwc", error);
              reject(error);
            });
        }
      })
      .catch((error) => {
        console.log("Error fadfoajwc", error);
        reject(error);
      });
  });
};

const finishActivity = (
  eventId,
  dateIdentifier,
  setData = {},
  notifyHost = false
) => {
  let event;

  return Event.findOneAndUpdate(
    { _id: eventId },
    { $addToSet: { finishedDateIdentifiers: dateIdentifier }, $set: setData },
    { new: true }
  )
    .then((eventData) => {
      event = eventData;

      const participants = getGuestEmails(event, dateIdentifier, true);
      return createEventVerification(
        eventId,
        dateIdentifier,
        event.forCommunities,
        participants
      );
    })
    .then(() => {
      moveFinishedActivity(
        eventId,
        getDateObjectWithIdentifier(event.dateObjects, dateIdentifier)
      );

      createNotificationEventFinished(event, dateIdentifier, notifyHost);

      return createConnectionsAfterEventFinish(event, dateIdentifier);
    });
};

const createConnectionsAfterEventFinish = async (event, dateIdentifier) => {
  const usersWhichAttended = await getGuestEmailsPromise(
    event,
    null,
    dateIdentifier,
    true
  );
  // create connections
  // i=0 loops 1,2,3,4... , i=1 loops 2,3,4... , i=2 loops 3,4...
  let promiseArray = [];
  for (var i = 0; i < usersWhichAttended.length; i++) {
    for (var j = i + 1; j < usersWhichAttended.length; j++) {
      let friends = [usersWhichAttended[i], usersWhichAttended[j]];
      promiseArray.push(buildFriendship(friends));
    }
  }

  await Promise.all(promiseArray);

  // update friend component in frontend for online users
  return Promise.all(
    usersWhichAttended.map(async (email) => {
      try {
        const user = await mongoFindOne("users", {
          email: email,
        });

        if (await isUserOnline(user)) {
          sendSocketEventToUsers([user], socketEvents.friendsUpdate);
        }
      } catch (error) {
        console.log("Error adigua6y ", error);
      }
    })
  );
};

const buildFriendship = async (friends) => {
  const friendship = await Friendship.findOne({ friends: { $all: friends } });

  if (friendship) {
    return Friendship.findOneAndUpdate(
      { friends: { $all: friends } },
      { $set: { connected: true } }
    );
  } else {
    const newFriendship = Friendship({
      uuid: uuidv4(),
      friends: friends,
    });
    return newFriendship.save();
  }
};

// do not add anything except emails and usernames, since it will add useless data to chat
// if anything else is added make sure it does not write extra(not used) data in chats
const getEventMembers = (event, dateIdentifier) => {
  let eventMembers = [event.organiser];

  event.guests.forEach((guest) => {
    if (
      (guest.coHost || guest.dateIdentifier == dateIdentifier) &&
      guest.status == "accepted"
    ) {
      eventMembers.push(guest.email);
    }
  });

  return Promise.all(
    eventMembers.map((email) => {
      return mongoFindOneSpecificField(
        "users",
        { email: email },
        { _id: 0, email: 1, username: 1 }
      ).then((user) => {
        return user;
      });
    })
  );
};

module.exports = {
  buildEventFilter,
  getCoords,
  buildAndSaveEvent,
  deleteEventWithId,
  getForCommunities,
  finishActivity,
  getInvitedPeople,
  getEventMembers,
};

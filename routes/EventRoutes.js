const express = require("express");
const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const Order = mongoose.model("Order");
const ObjectId = require("mongodb").ObjectId;
const router = express.Router();
const { requireAuth } = require("../middlewares/requireAuth");
const { multipleUploadNew } = require("../middlewares/mediaUpload");
const constants = require("../constants");
const { sendEventUpdateEmail } = require("../services/sendAllEmailTypes");
const {
  getCoords,
  buildAndSaveEvent,
  deleteEventWithId,
  getForCommunities,
  getInvitedPeople,
} = require("../functions/event");
const {
  updateEventNameInGroupChat,
} = require("../functions/ChatCreationFunctions");
const { notifyUserAboutEventUploadFinish } = require("../functions/users");
const {
  sendUpdateMyEventsInSocket,
  sendNewPastActivities,
  updateFutureActivityWithSocket,
} = require("../sockets/EventSockets");
const { buildFoundEvent } = require("../functions/buildEvent");
const {
  inviteUserToActivity,
} = require("../functions/inviteUserToActivityFunctions");
const {
  createNotificationActivityInfoUpdated,
  createNotificationActivityAdded,
} = require("../functions/createNotificationFunctions");
const {
  mongoFindOne,
  mongoFind,
  mongoFindOneSpecificField,
  mongoFindOneAndUpdate,
} = require("../functions/mongodbDriver");
const {
  getGuestsCount,
  getGuestEmails,
  getGuest,
} = require("../functions/guestGetterFunctions");
const {
  handleEventMediaUpdate,
  getCoordinatesToUpdate,
  updateDateInEvent,
  isDateUpdating,
} = require("../functions/eventUpdateFunctions");
const { getMainScreenEvents } = require("../functions/getEventsForMainScreen");
const {
  multipleMediaProcessing,
} = require("../functions/multipleMediaProcessing/multipleMediaProcessing");
const { getDateObjectWithIdentifier } = require("../functions/dateComparisons");
const {
  sendSocketEventToEveryone,
  socketEvents,
} = require("../sockets/SocketFunctions");

router.post("/addEventHls", requireAuth, multipleUploadNew, (req, res) => {
  res.send({
    status: "success",
    message: "Event is being added to the system.",
  });

  let eventId;
  let eventData;
  let forCommunities = [];

  return Promise.all([
    multipleMediaProcessing(
      req.body.MediaFilenamesArray,
      constants.googleCloudMediaBuckets.eventMediaBucket
    ),
    getCoords(req.body.location),
    getForCommunities(req.user),
  ])
    .then(([filenamesArray, coords, forCommunitiesData]) => {
      forCommunities = forCommunitiesData;
      return buildAndSaveEvent(
        req.body,
        filenamesArray,
        coords,
        req.user.email,
        forCommunities
      );
    })
    .then((event) => {
      eventData = event[0];
      eventId = event[0]._id;

      return User.findOneAndUpdate(
        { email: req.user.email },
        { $push: { events: eventId } }
      );
    })
    .then(() => {
      if (req.body.privacy != "private-event-invitation") {
        createNotificationActivityAdded(eventData, req.user, forCommunities);
      }

      if (req.body.showUploadAlert != "never") {
        notifyUserAboutEventUploadFinish(
          eventId,
          "Closest date",
          req.user,
          req.body.localEventId,
          true,
          false
        );
      }
      sendUpdateMyEventsInSocket(req.user, eventId, null, true); // adds event to MyEvent screen

      inviteUserToActivity(eventData.guests, eventData, req.user);
    })
    .catch((error) => {
      console.log("error.occured in the add   event route heere9&(" + error);
      if (req.body.showUploadAlert != "never") {
        notifyUserAboutEventUploadFinish(
          eventId,
          "Closest date",
          req.user,
          req.body.localEventId,
          false,
          false
        );
      }
    });
});

router.post("/updateEventNew", requireAuth, multipleUploadNew, (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  let eventBeforeUpdate;
  let newInvitations = [];

  mongoFindOne("events", { _id: ObjectId(req.body.eventId) })
    .then((event) => {
      eventBeforeUpdate = event;

      const guest = getGuest(event, req.user.email, req.body.dateIdentifier);

      if (guest?.coHost || event?.organiser == req.user?.email) {
        res.send({ status: "success" });
      } else {
        res.send({
          status: "fail",
          message: "You are not organiser of this event.",
        });
        throw new Error("You are not organiser of this event.");
      }

      const dateObject =
        req.body.dateObject && req.body.dateObject != "undefined"
          ? JSON.parse(req.body.dateObject)
          : null;

      newInvitations = getInvitedPeople(req.body, [
        { ...dateObject, dateIdentifier: req.body.dateIdentifier },
      ]);

      const shouldUpdateDate = isDateUpdating(
        eventBeforeUpdate,
        req.body.dateIdentifier,
        dateObject
      );

      return Promise.all([
        handleEventMediaUpdate(
          event,
          req.body.MediaFilenamesArray,
          JSON.parse(req.body.mediaArrayToDelete || "[]")
        ),
        // if we have zoom link we dont need coordinates
        getCoordinatesToUpdate(
          req.body.zoomMeeting?.includes("https") ||
            req.body.googleMeet?.includes("https")
            ? null
            : req.body.location
        ),
        updateDateInEvent(
          req.body.eventId,
          req.body.dateIdentifier,
          dateObject?.dateString,
          dateObject?.onlyHas,
          dateObject?.partOfDay,
          shouldUpdateDate,
          false
        ),
        updateEventNameInGroupChat(
          req.body.eventId,
          req.body.dateIdentifier,
          req.body?.name,
          event.name
        ),
      ]);
    })
    .then(([mediaData, geometry]) => {
      let newData = {
        description: req.body?.description,
        name: req.body?.name,
        capacity: parseInt(req.body.capacity),
        lastModified: new Date().toUTCString(),
        privacy: req.body.privacy,
        clubAffiliations: JSON.parse(req.body.clubAffiliations || "[]"),
      };

      if (req.body.zoomMeeting?.includes("https")) {
        newData.zoomMeeting = req.body.zoomMeeting;
        newData.showOnlineMeetingToPublic = req.body.showOnlineMeetingToPublic;
      } else if (req.body.googleMeet?.includes("https")) {
        newData.googleMeet = req.body.googleMeet;
        newData.showOnlineMeetingToPublic = req.body.showOnlineMeetingToPublic;
      } else if (req.body.location) {
        newData.location = req.body.location;
        newData.zoomMeeting = null;
        newData.googleMeet = null;
        if (geometry) newData.geometry = geometry;
      }
      if (mediaData.mediaArray.length > 0) {
        newData.mediaArray = mediaData.mediaArray;
        newData.miniMediaArray = mediaData.miniMediaArray;
      }

      return Event.findOneAndUpdate(
        { _id: req.body.eventId },
        {
          $set: newData,
          $push: { guests: newInvitations },
        },
        { new: true }
      );
    })
    .then((event) => {
      updateFutureActivityWithSocket(req.body.eventId);

      sendEventUpdateEmail(
        getGuestEmails(event, req.body.dateIdentifier),
        event,
        eventBeforeUpdate,
        req.body.dateIdentifier,
        req.user
      );

      // if we are making event invitation only we need to remove it from users event rolls
      if (
        eventBeforeUpdate.privacy == "private-event" &&
        req.body.privacy == "private-event-invitation"
      ) {
        sendSocketEventToEveryone(socketEvents.removeEventFromEventRoll, {
          eventId: req.body.eventId,
        });
      }

      inviteUserToActivity(newInvitations, event, req.user);

      createNotificationActivityInfoUpdated(event);
      notifyUserAboutEventUploadFinish(
        req.body.eventId,
        req.body.dateIdentifier,
        req.user,
        req.body.eventId,
        true,
        true
      );
    })
    .catch((error) => {
      console.log("Error afliackrl833a ", error);
      notifyUserAboutEventUploadFinish(
        req.body.eventId,
        req.body.dateIdentifier,
        req.user,
        req.body.eventId,
        false,
        true
      );
    });
});

router.get("/getEvent/:id/:dateIdentifier?", requireAuth, (req, res) => {
  let event;

  mongoFindOneSpecificField("events", { _id: ObjectId(req.params.id + "") })
    .then((result) => {
      event = result;

      if (event) {
        return Promise.all([
          mongoFindOne("users", { email: event.organiser }),
          mongoFind("favorites", { eventId: req.params.id + "" }),
        ]);
      } else {
        return [null, null];
      }
    })
    .then(([organiser, favorites]) => {
      if (event) {
        const finalEvent = buildFoundEvent(
          event,
          req.params.dateIdentifier
            ? req.params.dateIdentifier
            : "Closest date",
          req.user.email,
          organiser,
          favorites
        );

        if (event?.dateObjects?.length > 0) {
          res.send({ message: "success", event: finalEvent });
        } else {
          res.send({ message: "Event has already expired ", event: {} });
        }
      } else {
        res.send({ message: "Event does not exist ", event: {} });
      }
    })
    .catch((error) => {
      console.log("Error afliaeca38c7a345845", error);
      return res.send({
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/deleteEventNew", requireAuth, (req, res) => {
  if (req.user.events.includes(req.body.eventId)) {
    return deleteEventWithId(
      req.body.eventId,
      req.body.dateObject,
      req.user.email
    )
      .then((event) => {
        if (
          event.finishedDateIdentifiers.includes(req.body.dateObject) ||
          event.isOld
        ) {
          sendNewPastActivities(
            req.user,
            req.body.eventId,
            req.body.dateObject,
            false
          );
        } else {
          sendUpdateMyEventsInSocket(
            req.user,
            req.body.eventId,
            req.body.dateObject,
            false
          );
        }

        res.send({ message: "success" });
      })
      .catch((error) => {
        console.log("Error aefkhau ", error);
        res.send({ message: "Something went wrong. Please try again." });
      });
  } else {
    res.send({ message: "You can not delete these Activity" });
  }
});

router.get(
  "/getEventMembers/:eventId/:dateIdentifier",
  requireAuth,
  (req, res) => {
    if (req.params.eventId && req.params.dateIdentifier) {
      return mongoFindOneSpecificField("events", {
        _id: ObjectId(req.params.eventId),
      })
        .then((eventData) => {
          if (!eventData)
            throw new Error("Could not find Event. May be Event was deleted");

          const emailsList = getGuestEmails(
            eventData,
            req.params.dateIdentifier,
            true
          );

          return mongoFind("users", { email: { $in: emailsList } });
        })
        .then((usersList) => {
          let membersList = [];

          usersList.forEach((user) => {
            membersList.push({
              email: user.email,
              username: user.username,
              media: user.miniMedia,
              microMedia: user.microMedia,
            });
          });

          res.send({
            membersList,
            eventId: req.params.eventId,
            dateIdentifier: req.params.dateIdentifier,
          });
        })
        .catch((error) => {
          console.log("Error aflsjafaiecaada", error);
          res.send({ guestsList: [] });
        });
    } else {
      res.send({ guestList: [] });
    }
  }
);

router.get("/getMainScreenEvents", requireAuth, (req, res) => {
  try {
    if (req.user.role == "pendingUser" || req.user.role == "waitlistedUser") {
      res.send({ message: req.user.role });
    } else {
      getMainScreenEvents(req.user, [], 8, true)
        .then((result) => {
          res.send(result);
        })
        .catch((error) => {
          console.log("Error saidugayft7 ", error);
          res.send({ message: "fail", events: [] });
        });
    }
  } catch (error) {
    console.log("fnvjr3", error);
    res.send({ message: "fail", events: [] });
  }
});

// gets selectedTags and updateUniqueId, if you want to reset pagination resetPagination: true
router.post("/getMainScreenEventsSocket", requireAuth, (req, res) => {
  Promise.resolve()
    .then(() => {
      if (req.body.resetPagination) {
        return mongoFindOneAndUpdate(
          "users",
          { email: req.user.email },
          { $set: { currentEventNumber: 0 } },
          { returnDocument: "after" }
        );
      } else {
        return req.user;
      }
    })
    .then((updatedUser) => {
      if (updatedUser) {
        const numberOfEvents = parseInt(req.body.numberOfEvents) ?? 3;
        return getMainScreenEvents(
          updatedUser,
          req.body.selectedTags,
          numberOfEvents
        );
      }
    })
    .then((data) => {
      res.send({
        updateUniqueId: req.body.updateUniqueId,
        ...data,
      });
    })
    .catch((error) => {
      console.log("Error gauyg8agad ", error);
      res.send({ message: "fail" });
    });
});

router.get(
  "/eventPreviewData/:eventId/:dateIdentifier?/:guestEmail?",
  requireAuth,
  (req, res) => {
    return Promise.all([
      Event.findById(req.params.eventId),
      Order.findOne({
        eventId: req.params.eventId,
        dateIdentifier: req.params.dateIdentifier,
        email: req.params.guestEmail ?? req.user.email,
      }),
    ])
      .then(([event, order]) => {
        if (event) {
          const guestCount = getGuestsCount(event, req.params.dateIdentifier);

          const dateObject = getDateObjectWithIdentifier(
            event.dateObjects,
            req.params.dateIdentifier
          );

          const guest = getGuest(
            event,
            req.params.guestEmail,
            req.params.dateIdentifier
          );

          res.send({
            eventStatus: "active",
            eventName: event.name,
            image: event?.miniMediaArray[0],
            price: event.price,
            eventId: event._id,
            paid: order ? true : false,
            guestCount: guestCount,
            capacity: event.capacity,
            zoomMeeting: event.zoomMeeting,
            googleMeet: event.googleMeet,
            organiserEmail: event.organiser,
            dateObject: dateObject,
            location: event.location,
            // if it is undefined we send null because undefined will not be send and in case of removing guest we want to have null so we overwrite guest object with it
            guest: guest ?? null,
          });
        } else {
          res.send({
            eventStatus: "deleted",
            eventName: "Deleted",
            image: null,
            eventId: req.params.eventId,
          });
        }
      })
      .catch((error) => {
        console.log("error ifdya87fa ", error);
        res.send({
          eventStatus: "failed",
          eventName: "",
          image: null,
          eventId: req.params.eventId,
        });
      });
  }
);

router.get(
  "/zoomEventData/:eventId/:dateIdentifier",
  requireAuth,
  (req, res) => {
    let event;
    let joinedPeople = [];
    Event.findById(req.params.eventId)
      .then((eventData) => {
        event = eventData;

        let promiseArray = [];

        promiseArray.push(
          User.findOne({ email: event.organiser }).then((user) => {
            joinedPeople.push({
              picture: user.microMedia,
              email: user?.email,
              username: user?.username,
            });
          })
        );

        event.guests.forEach((guest) => {
          if (
            guest.joinedZoomMeeting &&
            guest.dateIdentifier == req.params.dateIdentifier
          ) {
            promiseArray.push(
              User.findOne({ email: guest.email }).then((user) => {
                joinedPeople.push({
                  picture: user.microMedia,
                  email: user?.email,
                  username: user?.username,
                });
              })
            );
          }
        });

        return Promise.all(promiseArray);
      })
      .then(() => {
        if (event) {
          let dateObject = event.dateObjects[0];
          event.dateObjects.forEach((element) => {
            if (element.dateIdentifier == req.params.dateIdentifier) {
              dateObject = element;
            }
          });

          res.send({
            eventStatus: "active",
            eventName: event.name,
            image: event?.miniMediaArray[0],
            zoomMeeting: event.zoomMeeting,
            googleMeet: event.googleMeet,
            organiserEmail: event.organiser,
            dateObject: dateObject,
            joinedPeople: joinedPeople,
          });
        } else {
          res.send({
            eventStatus: "deleted",
            eventName: "Deleted",
            image: null,
            eventId: req.params.eventId,
          });
        }
      })
      .catch((error) => {
        console.log("error ifdya87fa ", error);
        res.send({
          eventStatus: "failed",
          eventName: "",
          image: null,
          eventId: req.params.eventId,
        });
      });
  }
);

module.exports = router;

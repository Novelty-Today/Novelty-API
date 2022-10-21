const mongoose = require("mongoose");
const EventVerification = mongoose.model("EventVerification");
const Task = mongoose.model("Task");
const ObjectId = require("mongodb").ObjectId;
const { v4: uuidv4 } = require("uuid");
const { getEventDataWithLinks } = require("../buildEvent");
const { gainNoveltiesActionToNumber } = require("./updateCoinFunctions");
const {
  mongoFind,
  mongoFindOneAndUpdate,
  mongoFindOneSpecificField,
} = require("../mongodbDriver");
const { getGuestEmails } = require("../guestGetterFunctions");
const { getUserForCommunities } = require("../filterFunctions");
const { getDateObjectWithIdentifier } = require("../dateComparisons");
const { getRandomVerifiersAndNotify } = require("./getRandomVerifiers");
const { noveltyTokenConfigs } = require("../../constants");

const createEventVerification = (
  eventId,
  dateIdentifier,
  forCommunities = [],
  eventParticipants = []
) => {
  // create event verification object
  const eventFeedback = new EventVerification({
    uuid: uuidv4(),
    eventId,
    dateIdentifier,
    stakeRequired: noveltyTokenConfigs.stakeRequiredToVerifyEvent,
    verificationStatus: "not-started",
    numberOfVerifiers: noveltyTokenConfigs.maxNumberOfVerifiers,
    verifiers: [],
    forCommunities,
    eventParticipants,
    times: { creationTime: new Date().toUTCString() },
  });

  return EventVerification.insertMany([eventFeedback]).then(() => {
    // create event verification task
    const task = new Task({
      type: "startEventVerification",
      date: new Date().getTime(),
      arguments: {
        eventId,
        dateIdentifier,
        startDate:
          new Date().getTime() + noveltyTokenConfigs.verificationStartingTime, // verification starts after 24 hours of event finish.
      },
    });
    return Task.insertMany([task]);
  });
};

const updateVerificationStartTime = (eventId, dateIdentifier) => {
  mongoFindOneAndUpdate(
    "tasks",
    {
      type: "startEventVerification",
      "arguments.0.eventId": eventId,
      "arguments.0.dateIdentifier": dateIdentifier,
    },
    {
      $set: {
        "arguments.0.startDate": new Date().getTime(),
      },
    }
  );
};

const startEventVerification = (eventId, dateIdentifier) => {
  return mongoFindOneAndUpdate(
    "eventverifications",
    {
      eventId: eventId,
      dateIdentifier: dateIdentifier,
    },
    {
      $set: {
        verificationStatus: "pending",
        "times.startTime": new Date().toUTCString(),
      },
    }
  ).then((verification) => {
    getRandomVerifiersAndNotify(
      eventId,
      dateIdentifier,
      verification.stakeRequired
    );
  });
};

const getEventVerificationInfo = (
  eventId,
  dateIdentifier,
  email,
  verification
) => {
  return Promise.all([
    getEventDataWithLinks(eventId, dateIdentifier, email),
    mongoFind("eventfeedbacks", { eventId, dateIdentifier }),
  ])
    .then(([event, feedbacks]) => {
      let hostFeedback;
      let guestsFeedback = [];

      feedbacks.forEach((feedback) => {
        let feedbackObj = {
          rating: feedback.rating,
          questions: feedback.questions,
          mediaArray: feedback.mediaArray,
          miniMediaArray: feedback.miniMediaArray,
        };

        if (feedback.email == event.organiser.email) {
          hostFeedback = feedbackObj;
        } else {
          guestsFeedback.push(feedbackObj);
        }
      });

      const data = {
        eventId: eventId,
        dateObject: getDateObjectWithIdentifier(
          event.dateObjects,
          dateIdentifier
        ),
        name: event.name,
        mediaArray: event.mediaArray,
        miniMediaArray: event.miniMediaArray,
        description: event.description,
        hostFeedback: hostFeedback,
        guestsFeedback: guestsFeedback,
        stakeRequired: verification.stakeRequired,
      };

      return data;
    })
    .catch((error) => {
      console.log("Error aiuaatf8 ", error);

      return {};
    });
};

const startVerificationIfFeedbackCompleted = (eventId, dateIdentifier) => {
  Promise.all([
    mongoFindOneSpecificField("events", { _id: ObjectId(eventId) }),
    mongoFind("eventfeedbacks", { eventId, dateIdentifier }),
  ])
    .then(([event, feedbacks]) => {
      const participants = getGuestEmails(event, dateIdentifier, true);

      //comment
      if (
        hasValidFeedbackForVerification(event, feedbacks) &&
        feedbacks.length >= participants.length
      ) {
        return updateVerificationStartTime(eventId, dateIdentifier);
      }
    })
    .catch((error) => {
      console.log("Error aauyg87ft ", error);
    });
};

const getAlreadyStaked = (email, verifiers = []) => {
  let alreadyStakedVerifier = null;
  verifiers?.forEach((verifier) => {
    if (verifier?.email == email) {
      alreadyStakedVerifier = verifier;
    }
  });
  return alreadyStakedVerifier;
};

const getPendingVerifications = (user) => {
  let promiseArray = [];

  let filter = {
    verificationStatus: "pending",
    forCommunities: { $in: getUserForCommunities(user) },
    eventParticipants: { $ne: user.email },
  };

  let pendingVerifications = [];
  let answeredVerifications = [];

  let avalibleCount = 0;
  let stakedCount = 0;

  return mongoFind("eventverifications", filter).then((verifications) => {
    verifications.forEach((verification) => {
      let stakeTimedOut = false;
      let hasStaked = false;
      let hasAnswered = false;
      verification.verifiers.forEach((verifier) => {
        if (verifier.email == user.email) {
          stakeTimedOut = verifier.stakeTimedOut;
          hasStaked = true;
          if (verifier.validated != "none") {
            hasAnswered = true;
          }
        }
      });

      if (!stakeTimedOut) {
        promiseArray.push(
          mongoFindOneSpecificField(
            "events",
            {
              _id: ObjectId(verification.eventId),
              "dateObjects.dateIdentifier": verification.dateIdentifier,
            },
            { name: 1 }
          ).then((event) => {
            if (event) {
              if (hasAnswered) {
                answeredVerifications.push(
                  buildVerificationObject(verification)
                );
                stakedCount++;
              } else if (hasStaked) {
                pendingVerifications.unshift(
                  buildVerificationObject(verification)
                );
                stakedCount++;
              } else {
                pendingVerifications.push(
                  buildVerificationObject(verification)
                );
                avalibleCount++;
              }
            }
          })
        );
      }
    });

    return Promise.all(promiseArray).then(() => {
      return {
        pendingVerifications,
        answeredVerifications,
        avalibleCount,
        stakedCount,
        earnUpTo:
          avalibleCount *
            gainNoveltiesActionToNumber("eventVerification", {
              giveBonus: true,
            }) ?? 0,
      };
    });
  });
};

const buildVerificationObject = (verification) => {
  const verifiers = [];

  verification.verifiers.forEach((item) => {
    if (!item.stakeTimedOut) {
      verifiers.push(item);
    }
  });

  return { ...verification, verifiers };
};

const hasValidFeedbackForVerification = (event, feedbacks) => {
  let hasValidFeedback = feedbacks.find(
    (item) => item?.email != event?.organiser
  );

  return hasValidFeedback;
};

module.exports = {
  startEventVerification,
  updateVerificationStartTime,
  getEventVerificationInfo,
  getAlreadyStaked,
  startVerificationIfFeedbackCompleted,
  getPendingVerifications,
  createEventVerification,
  hasValidFeedbackForVerification,
};

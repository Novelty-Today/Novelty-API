const ObjectId = require("mongodb").ObjectId;
const { mongoFind, mongoFindOne, mongoAggregate } = require("../mongodbDriver");
const { createVerifyEventTask } = require("../../Tasks/VerifyEventTask");
const { sendVerifyEventEmails } = require("../../services/sendAllEmailTypes");
const {
  createRandomVerifierNotifications,
} = require("../createNotificationFunctions");
const { noveltyTokenConfigs } = require("../../constants");

const getRandomVerifiersAndNotify = (
  eventId,
  dateIdentifier,
  stakeRequired
) => {
  return findRandomVerifiers(eventId, dateIdentifier)
    .then((emails) => {
      emails.forEach((email) => {
        createVerifyEventTask(email, eventId, dateIdentifier);
      });
      sendVerifyEventEmails(emails, eventId, dateIdentifier, stakeRequired);
      createRandomVerifierNotifications(
        emails,
        eventId,
        dateIdentifier,
        stakeRequired
      );
    })
    .catch((error) => {
      console.log("Error digouaygf87adt ", error);
    });
};

const findRandomVerifiers = (eventId, dateIdentifier) => {
  return Promise.all([
    mongoFindOne("events", { _id: ObjectId(eventId) }),
    mongoFind("tasks", {
      type: "verifyEvent",
      "arguments.0.eventId": eventId,
      "arguments.0.dateIdentifier": dateIdentifier,
    }),
    mongoFindOne("eventverifications", {
      eventId: eventId,
      dateIdentifier: dateIdentifier,
    }),
  ])
    .then(([event, alreadySelectedVerifiers, verification]) => {
      const unvalidEmails = getUnvalidEmails(
        event,
        alreadySelectedVerifiers,
        verification
      );

      const size =
        verification.numberOfVerifiers -
        verification.verifiers.filter((item) => !item.stakeTimedOut).length;

      return mongoAggregate("users", [
        filterForUnvalidEmails(unvalidEmails),
        getEmailCommunity,
        addFieldsForFilter(event),
        filter,
        addActivities, // gets analitics
        addLastActivity, // gets last activity from analitics
        addLastActivityTime, // adds time object for last activity
        filterActiveUsers, // filters user by last active date
        sample(size ?? 5),
        project,
      ]);
    })
    .then((users) => {
      return users.map((item) => item.email);
    });
};

const getUnvalidEmails = (event, alreadySelectedVerifiers, verification) => {
  let unvalidEmails = [
    event?.organiser,
    ...(event?.guests?.map((item) => item.email) ?? []),
    ...(alreadySelectedVerifiers?.map((item) => item?.user) ?? []),
    ...(verification?.verifiers?.map((item) => item?.email) ?? []),
  ];

  return unvalidEmails;
};

const filterForUnvalidEmails = (unvalidEmails) => {
  return {
    $match: { email: { $nin: unvalidEmails } },
  };
};

const getEmailCommunity = {
  $addFields: {
    emailCommunity: {
      $concat: ["@", { $last: { $split: ["$email", "@"] } }],
    },
  },
};

const addFieldsForFilter = (event) => {
  return {
    $addFields: {
      validCommunity: {
        $setIntersection: ["$ancestorComunities", event?.forCommunities],
      },
      emailIsInCommunity: {
        $in: ["$emailCommunity", event?.forCommunities ?? []],
      },
    },
  };
};

const filter = {
  $match: {
    $and: [
      {
        $or: [
          { emailIsInCommunity: true },
          { "validCommunity.0": { $exists: true } },
        ],
      },
      {
        "crypto.noveltyTokens": {
          $gt: noveltyTokenConfigs.minimumTokenRequirementForRandomVerifier,
        },
      },
    ],
  },
};

const addActivities = {
  $lookup: {
    from: "analyticdatas",
    let: { email: "$email" },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: ["$email", "$$email"],
          },
        },
      },
      {
        $addFields: {
          lastActivityData: { $last: "$activities" },
        },
      },
      {
        $project: {
          lastActivityData: 1,
        },
      },
    ],
    as: "activities",
  },
};

const addLastActivity = {
  $addFields: {
    lastActivity: { $last: "$activities" },
  },
};

const addLastActivityTime = {
  $addFields: {
    lastActivityTime: {
      $dateFromString: {
        dateString: "$lastActivity.lastActivityData.dateTime",
        onNull: "",
        onError: "",
      },
    },
  },
};

const filterActiveUsers = {
  $match: {
    lastActivityTime: {
      $gt: new Date(
        new Date().getTime() - noveltyTokenConfigs.randomVerifierLastActiveDate
      ),
    },
  },
};

const sample = (size) => {
  return { $sample: { size: size } };
};

const project = {
  $project: { email: 1, lastActivityTime: 1 },
};

module.exports = { getRandomVerifiersAndNotify };

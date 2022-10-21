const ObjectId = require("mongodb").ObjectId;
const {
  startEventVerification,
  hasValidFeedbackForVerification,
} = require("../functions/noveltyTokenFunctions/verifyEvents");
const { updateTaskStatus } = require("./TaskHelper");
const {
  mongoFindOne,
  mongoFind,
  mongoAggregate,
} = require("../functions/mongodbDriver");
const {
  checkEventVerificationCompletedFromTask,
} = require("../functions/noveltyTokenFunctions/finishVerification");
const {
  handleFeedbackReminderSending,
} = require("../functions/feedbackFunctions");

const handleStartEventVerificationTask = (task) => {
  let verification;
  let { eventId, dateIdentifier, startDate } = task?.arguments?.[0];

  Promise.all([
    mongoFindOne("events", { _id: ObjectId(eventId) }),
    mongoFindOne("eventverifications", {
      eventId,
      dateIdentifier,
    }),
    mongoAggregate("tasks", tasksFilters(task)),
    mongoFind("eventfeedbacks", {
      eventId,
      dateIdentifier,
    }),
  ])
    .then(([event, verificationData, latestVerifierTask, feedbacks]) => {
      verification = verificationData;

      // If time for verificatin come -> start the process
      if (startDate < new Date().getTime()) {
        // 1) If there is at least one feedback, we start verification
        if (
          verification.verificationStatus == "not-started" &&
          hasValidFeedbackForVerification(event, feedbacks) //this conditions is not needed in next if because verification will already start
        ) {
          return startEventVerification(eventId, dateIdentifier); // if verification not started and it has valid feedback for verification we start verification process
        }

        //  2) Or continue verification
        else if (verification.verificationStatus == "pending") {
          return checkEventVerificationCompletedFromTask(
            verification,
            latestVerifierTask
          ); // here tokens can be lost/gasined
        }
      }

      // 2) remind people to write feedbacks even if verification started
      handleFeedbackReminderSending(task, event, verification).catch((error) =>
        console.log("dkjh", error, task)
      );
    })
    .then(() => {
      if (
        verification.verificationStatus == "verified" ||
        verification.verificationStatus == "not-verified"
      ) {
        return updateTaskStatus(task?._id, "done");
      } else {
        return updateTaskStatus(task?._id, "waiting");
      }
    })
    .catch((error) => {
      console.log("Error gdiatgfda6fad ", error);
      updateTaskStatus(task?._id, "waiting");
    });
};

const tasksFilters = (task) => {
  return [
    {
      $match: {
        type: "verifyEvent",
        "arguments.0.eventId": task?.arguments[0]?.eventId,
        "arguments.0.dateIdentifier": task?.arguments[0]?.dateIdentifier,
      },
    },
    { $sort: { date: -1 } },
    { $limit: 1 },
  ];
};

module.exports = {
  handleStartEventVerificationTask,
};

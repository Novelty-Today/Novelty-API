const ObjectId = require("mongodb").ObjectId;
const { noveltyTokenConfigs } = require("../constants");
const { getCanWriteFeedback } = require("./verificationFlowCheckers");
const { mongoFindOneAndUpdate } = require("./mongodbDriver");
const {
  createEventFinishedReminderToSpecificPeople,
} = require("./createNotificationFunctions");

const handleFeedbackReminderSending = (task, event, eventVerification) => {
  const sentFeedbackRemindersList =
    task?.arguments?.[0]?.sentFeedbackRemindersList ?? []; // event participants who received reminder to write feedback
  const participantsWithoutFeedbackReminders =
    eventVerification.eventParticipants.filter(
      (participant) => !sentFeedbackRemindersList.includes(participant)
    );

  let hostEmail = null;
  let guestEmails = [];
  if (
    new Date().getTime() -
      new Date(eventVerification?.times?.creationTime).getTime() >
      noveltyTokenConfigs.feedbackReminderTime &&
    sentFeedbackRemindersList.length <
      eventVerification?.eventParticipants?.length
  ) {
    return Promise.all(
      participantsWithoutFeedbackReminders.map((participant) =>
        getCanWriteFeedback(
          eventVerification.eventId,
          eventVerification.dateIdentifier,
          participant
        ).then((result) => {
          if (result.canWrite) {
            if (participant == event.organiser) hostEmail = participant;
            else guestEmails.push(participant);
          }
        })
      )
    ).then(() => {
      let allMails = guestEmails;
      if (hostEmail) allMails.push(hostEmail);

      return createEventFinishedReminderToSpecificPeople(
        event,
        eventVerification.dateIdentifier,
        allMails,
        allMails,
        guestEmails,
        hostEmail,
        true
      ).then(() => {
        return mongoFindOneAndUpdate(
          "tasks",
          { _id: ObjectId(task._id) },
          {
            $set: {
              "arguments.0.sentFeedbackRemindersList":
                eventVerification.eventParticipants,
            },
          }
        );
      });
    });
  } else {
    return Promise.resolve();
  }
};

module.exports = { handleFeedbackReminderSending };

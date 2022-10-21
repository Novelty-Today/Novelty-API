const { noveltyTokenConfigs } = require("../constants");
const { mongoFindOne } = require("./mongodbDriver");

const getCanWriteFeedback = (eventId, dateIdentifier, email) => {
  return Promise.all([
    mongoFindOne("eventverifications", { eventId, dateIdentifier }),
    mongoFindOne("eventfeedbacks", { eventId, dateIdentifier, email }),
  ])
    .then(([verification, feedback]) => {
      const passedDeadline =
        new Date(verification?.times?.creationTime).getTime() +
          noveltyTokenConfigs.feedbackWriteMaxTime <
        new Date().getTime();

      if (
        !feedback &&
        !passedDeadline &&
        verification?.eventParticipants?.includes?.(email) && // check if user trying to write feedback is realy host, coHost or guest
        ["not-started", "pending"].includes(verification?.verificationStatus)
      ) {
        return { canWrite: true };
      } else {
        let reason;

        if (feedback) reason = "The feedback has already been written.";
        else if (passedDeadline)
          reason =
            "Sorry, Time for writing feedback has finished. You can no longer write a feedback.";
        else if (!verification?.eventParticipants?.includes?.(email))
          reason =
            "You can not write a feedback because you are not an event participant.";
        else if (verification)
          reason =
            "Event has aleady been verified. You can no longer write feedback.";
        else reason = "You can not write feedback until the event is finished.";

        return {
          canWrite: false,
          reason,
        };
      }
    })
    .catch((error) => {
      console.log("Error gdagymadyigh ", error);
      return { canWrite: false };
    });
};

const getCanVerifyEvent = (email, eventId, dateIdentifier) => {
  return mongoFindOne("eventverifications", { eventId, dateIdentifier })
    .then((verification) => {
      let stakeTimedOut = false;
      let hasStaked = false;
      verification?.verifiers.forEach((verifier) => {
        if (verifier.email == email) {
          hasStaked = true;
          stakeTimedOut = verifier.stakeTimedOut;
        }
      });

      if (
        verification?.verificationStatus == "pending" &&
        (hasStaked ||
          verification?.verifiers?.length < verification?.numberOfVerifiers) &&
        !stakeTimedOut
      ) {
        return { canVerify: true, stakeRequired: verification.stakeRequired };
      } else {
        return { canVerify: false, stakeTimedOut };
      }
    })
    .catch((error) => {
      console.log("Error gdagymadyigh ", error);
      return { canWrite: false };
    });
};

module.exports = {
  getCanWriteFeedback,
  getCanVerifyEvent,
};

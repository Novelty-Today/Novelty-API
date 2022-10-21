const ObjectId = require("mongodb").ObjectId;
const { noveltyTokenConfigs } = require("../../constants");
const { sendVerifyEventEmails } = require("../../services/sendAllEmailTypes");
const { createVerifyEventTask } = require("../../Tasks/VerifyEventTask");
const {
  createNotificationEventVerified,
  createNotificationVerificationStakingFinished,
} = require("../createNotificationFunctions");
const {
  earnNovelties,
  finishStaking,
  gainNoveltiesActionToNumber,
} = require("./updateCoinFunctions");
const {
  mongoFindOneAndUpdate,
  mongoFindOne,
  mongoFindOneSpecificField,
} = require("../mongodbDriver");
const { showLostTokensInFrontend } = require("./remaindersForVerification");
const { getRandomVerifiersAndNotify } = require("./getRandomVerifiers");
const {
  checkAllStakedAnswered,
  getTimedOutVerifiers,
  getVerifiersWithoutTimeOut,
} = require("./noveltyTokenHelperFunctions");
const { isUserOnline } = require("../../sockets/SocketFunctions");

const checkEventVerificationCompletedFromTask = (
  verification,
  latestVerifierTask
) => {
  //
  const votesNeededForVerification =
    verification.numberOfVerifiers * noveltyTokenConfigs.stepOneVerification;

  let answeredPositive = [];
  let answeredNegative = [];
  let didNotAnswered = [];

  verification.verifiers.forEach((verifier) => {
    if (verifier.validated == "none") didNotAnswered.push(verifier);
    else if (verifier.validated == "yes") answeredPositive.push(verifier);
    else if (verifier.validated == "no") answeredNegative.push(verifier);
  });

  if (
    didNotAnswered.length == getTimedOutVerifiers(didNotAnswered).length && // all who did not vote, must be timed-out
    (answeredPositive.length >= votesNeededForVerification ||
      answeredNegative.length >= votesNeededForVerification)
  ) {
    // FINISH VERIFICATION AND MARK STAKES AS TIMED OUT AND
    return finishVerificationAndSendTokens(
      verification,
      answeredPositive,
      answeredNegative,
      answeredPositive.length >= answeredNegative.length
        ? "verified"
        : "not-verified"
    );
  } else if (
    didNotAnswered.length == getTimedOutVerifiers(didNotAnswered).length &&
    new Date().getTime() - latestVerifierTask?.[0]?.date > // even if noone staked and became verifier server still should wait some time after chosing verifiers before chosing new ones
      noveltyTokenConfigs.stakeTimeout
  ) {
    // All verifiers are timed out and event is not verified -> set to other verifiers
    return getRandomVerifiersAndNotify(
      verification.eventId,
      verification.dateIdentifier,
      verification.stakeRequired
    );
  } else {
    // SEND REMINDERS TO PEOPLE WHO DID NOT ANSWER And Are not timed-out
    let peopleWithoutTimeout = getVerifiersWithoutTimeOut(didNotAnswered);

    return Promise.all(
      peopleWithoutTimeout.map((element) =>
        remaindVerifierToAnswerQuestion(verification, element)
      )
    );
  }
};

const checkEventVerificationCompleted = (eventId, dateIdentifier) => {
  mongoFindOne("eventverifications", {
    eventId: eventId,
    dateIdentifier: dateIdentifier,
  })
    .then((verification) => {
      const verifiersWithoutTimeout = getVerifiersWithoutTimeOut(
        verification?.verifiers
      );

      if (
        verifiersWithoutTimeout?.length == verification?.numberOfVerifiers &&
        checkAllStakedAnswered(verifiersWithoutTimeout) &&
        verification?.verificationStatus == "pending"
      ) {
        let verifiersPositiveList = [];
        let verifiersNegativeList = [];

        verification?.verifiers?.forEach((verifier) => {
          if (verifier?.validated == "yes") {
            verifiersPositiveList.push(verifier);
          } else if (verifier?.validated == "no") {
            verifiersNegativeList.push(verifier);
          }
        });

        const positiveAnswersPercentage =
          verifiersPositiveList.length / verification?.numberOfVerifiers;

        // verified if it passed at least first step verification
        const verificationStatus =
          positiveAnswersPercentage >= noveltyTokenConfigs.stepOneVerification
            ? "verified"
            : "not-verified";

        return finishVerificationAndSendTokens(
          verification,
          verifiersPositiveList,
          verifiersNegativeList,
          verificationStatus
        );
      }
    })
    .catch((error) => {
      console.log("Error aauigfady7 ", error);
    });
};

const finishVerificationAndSendTokens = (
  verification,
  verifiersPositiveList,
  verifiersNegativeList,
  verificationStatus
) => {
  return Promise.all([
    mongoFindOne("events", { _id: ObjectId(verification.eventId) }).then(
      (event) => {
        finishStaking(
          verifiersPositiveList,
          verifiersNegativeList,
          verification?.numberOfVerifiers,
          verification?.stakeRequired,
          verification.eventId,
          false,
          event
        );
      }
    ),
    finishEventVerification(
      verification.eventId,
      verification.dateIdentifier,
      verificationStatus
    ),
    giveHostNoveltiesAfterEventVerification(
      verification.eventId,
      verification.dateIdentifier,
      verificationStatus
    ),
  ]);
};

const remaindVerifierToAnswerQuestion = (verification, verifier) => {
  let receivedEmail = 0;
  let receivedPopup = 0;

  verifier.notifiedToFinishValidation.forEach((element) => {
    if (element.type == "email") {
      receivedEmail++;
    } else if (element.type == "popup") {
      receivedPopup++;
    }
  });

  if (
    receivedEmail == 0 &&
    new Date().getTime() - new Date(verifier.timeStaked).getTime() >
      noveltyTokenConfigs.stakeFirstReminderTime
  ) {
    return Promise.all([
      sendVerifyEventEmails(
        [verifier.email],
        verification.eventId,
        verification.dateIdentifier,
        verification.stakeRequired
      ),
      createVerifyEventTask(
        verifier.email,
        verification.eventId,
        verification.dateIdentifier
      ),
    ]).then(() => {
      return addNotifiedToFinishValidation(verification, verifier, [
        "email",
        "popup",
      ]);
    });
  } else if (
    receivedPopup < 2 &&
    new Date().getTime() - new Date(verifier.timeStaked).getTime() >
      noveltyTokenConfigs.stakeSecondReminderTime
  ) {
    return createVerifyEventTask(
      verifier.email,
      verification.eventId,
      verification.dateIdentifier
    ).then(() => {
      return addNotifiedToFinishValidation(verification, verifier, ["popup"]);
    });
  } else if (
    new Date().getTime() - new Date(verifier.timeStaked).getTime() >
    noveltyTokenConfigs.stakeTimeout
  ) {
    return markStakeAsTimedOut(
      verification.uuid,
      verifier,
      verification.eventId,
      verification.stakeRequired
    );
  } else {
    return Promise.resolve();
  }
};

const addNotifiedToFinishValidation = (verification, verifier, types) => {
  let list = [];

  types.forEach((type) => {
    list.push({
      time: new Date().toUTCString(),
      type: type,
    });
  });

  return mongoFindOneAndUpdate(
    "eventverifications",
    { uuid: verification.uuid, "verifiers.email": verifier.email },
    {
      $push: {
        "verifiers.$.notifiedToFinishValidation": { $each: list },
      },
    }
  );
};

const markStakeAsTimedOut = async (uuid, verifier, eventId, stakeRequired) => {
  await mongoFindOneAndUpdate(
    "eventverifications",
    { uuid: uuid, "verifiers.email": verifier.email },
    { $set: { "verifiers.$.stakeTimedOut": true } }
  );

  const user = await mongoFindOne("users", { email: verifier.email });

  if (await isUserOnline(user)) {
    return showLostTokensInFrontend(eventId, user, stakeRequired, "timeout");
  } else {
    return createNotificationVerificationStakingFinished(
      eventId,
      user.email,
      stakeRequired,
      "timeout"
    );
  }
};

const finishEventVerification = (
  eventId,
  dateIdentifier,
  verificationStatus
) => {
  return mongoFindOneAndUpdate(
    "eventverifications",
    {
      eventId: eventId,
      dateIdentifier: dateIdentifier,
    },
    {
      $set: {
        verificationStatus: verificationStatus,
        "times.finishTime": new Date().toUTCString(),
      },
    }
  );
};

const giveHostNoveltiesAfterEventVerification = (
  eventId,
  dateIdentifier,
  verificationStatus
) => {
  if (verificationStatus == "verified") {
    let eventData;
    return mongoFindOneSpecificField("events", { _id: ObjectId(eventId) })
      .then((event) => {
        eventData = event;
        return mongoFindOne("users", { email: event?.organiser });
      })
      .then((user) => {
        return earnNovelties(user, "createActivity", true, 0, {
          eventId,
          eventName: eventData?.name,
          eventMedia: eventData?.miniMediaArray?.[0],
        });
      })
      .then((result) => {
        if (result?.status == "success") {
          return createNotificationEventVerified(
            eventData,
            dateIdentifier,
            gainNoveltiesActionToNumber("createActivity")
          );
        }
      });
  } else {
    return Promise.resolve();
  }
};

module.exports = {
  checkEventVerificationCompleted,
  checkEventVerificationCompletedFromTask,
};

const mongoose = require("mongoose");
const {
  noveltyTokenConfigs,
  noveltyActionsToAmounts,
} = require("../../constants");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
} = require("../../sockets/SocketFunctions");
const EventVerification = mongoose.model("EventVerification");
const {
  createNotificationVerificationStakingFinished,
  createNotificationInvitedUserJoined,
} = require("../createNotificationFunctions");
const { mongoUpdateOne, mongoFindOne } = require("../mongodbDriver");
const { showLostTokensInFrontend } = require("./remaindersForVerification");

const stakeNovelties = (user, eventId, dateIdentifier, noveltyTokens) => {
  if (noveltyTokens <= user.crypto.noveltyTokens) {
    return Promise.all([
      updateUserNovelties(
        user.email,
        user.crypto.noveltyTokens - noveltyTokens
      ),
      EventVerification.findOneAndUpdate(
        { eventId, dateIdentifier },
        {
          $push: {
            verifiers: {
              email: user.email,
              timeStaked: new Date().toUTCString(),
            },
          },
        }
      ),
    ])
      .then(() => {
        return {
          status: "success",
          message: "Staked successfuly.",
          totalTokens: user.crypto.noveltyTokens - noveltyTokens,
        };
      })
      .catch((error) => {
        console.log("Errora uigdyg8adtf8a ", error);
        return { status: "fail", message: "Something went wrong." };
      });
  } else {
    return Promise.resolve({
      status: "fail",
      message: "Not enough $NC",
    });
  }
};

const finishStaking = (
  verifiersPositiveList,
  verifiersNegativeList,
  numberOfVerifiers,
  stakedAmount,
  eventId,
  canceled = false,
  eventData = {}
) => {
  // verification cancelled // in case event is deleted
  if (canceled) {
    return Promise.all(
      [...verifiersPositiveList, ...verifiersNegativeList].map(
        async (verifier) => {
          const user = await mongoFindOne("users", {
            email: verifier.email,
          });

          return earnNovelties(user, "eventVerification", true, stakedAmount, {
            eventId: eventId,
            eventName: eventData?.name,
            eventMedia: eventData?.miniMediaArray?.[0],
          });
        }
      )
    );
  }
  // verification finished
  else {
    let promiseArray = [];

    const positiveAnswersPercentage =
      verifiersPositiveList.length / numberOfVerifiers;
    const negativeAnswersPercentage =
      verifiersNegativeList.length / numberOfVerifiers;

    let peopleWhoGetsStakeWithBonus = [];
    let peopleWhoLoseStake = [];

    // for positive step one verification
    if (positiveAnswersPercentage >= noveltyTokenConfigs.stepOneVerification) {
      peopleWhoGetsStakeWithBonus = verifiersPositiveList;
      peopleWhoLoseStake = verifiersNegativeList;
    }
    // for negative step one verification
    else if (
      negativeAnswersPercentage >= noveltyTokenConfigs.stepOneVerification
    ) {
      peopleWhoGetsStakeWithBonus = verifiersNegativeList;
      peopleWhoLoseStake = verifiersPositiveList;
    }

    peopleWhoGetsStakeWithBonus.forEach((verifier) => {
      promiseArray.push(
        new Promise(async (resolve, reject) => {
          const user = await mongoFindOne("users", {
            email: verifier.email,
          });

          await earnNovelties(user, "eventVerification", true, stakedAmount, {
            giveBonus: true,
            eventId: eventId,
            eventName: eventData?.name,
            eventMedia: eventData?.miniMediaArray?.[0],
          });
          resolve("done");
        })
      );
    });

    peopleWhoLoseStake.forEach((verifier) => {
      promiseArray.push(
        new Promise(async (resolve, reject) => {
          const user = await mongoFindOne("users", {
            email: verifier.email,
          });

          if (await isUserOnline(user)) {
            showLostTokensInFrontend(
              eventId,
              user,
              stakedAmount,
              "wrongAnswer"
            );
          } else {
            createNotificationVerificationStakingFinished(
              eventId,
              user.email,
              stakedAmount,
              "wrongAnswer"
            );
          }
          resolve("done");
        })
      );
    });

    return Promise.all(promiseArray);
  }
};

const earnNovelties = (
  user,
  action,
  showPopupForUser = false,
  stakedAmount = 0,
  extraData = {}
) => {
  const gainedNoveltyTokens =
    gainNoveltiesActionToNumber(action, extraData) + stakedAmount;

  const noveltyTokens = user?.crypto?.noveltyTokens + gainedNoveltyTokens;

  return updateUserNovelties(user.email, noveltyTokens)
    .then(() => {
      notifyUserAboutTokensUpdate(
        user,
        noveltyTokens,
        gainedNoveltyTokens,
        showPopupForUser,
        action,
        extraData
      );

      return {
        status: "success",
        gainedNoveltyTokens: gainedNoveltyTokens,
        totalTokens: noveltyTokens,
      };
    })
    .catch((error) => {
      console.log("Errora gaudyga ", error);
      return { status: "fail", message: "Something went wrong." };
    });
};

const updateUserNovelties = (email, noveltyTokens) => {
  return mongoUpdateOne(
    "users",
    { email: email },
    { $set: { "crypto.noveltyTokens": noveltyTokens } }
  );
};

const gainNoveltiesActionToNumber = (action, extraData) => {
  let novelties = 0;
  if (action == "eventVerification") {
    novelties = extraData?.giveBonus ? noveltyActionsToAmounts[action] : 0;
  } else if (action == "gift") {
    novelties = extraData?.amount;
  } else {
    novelties = noveltyActionsToAmounts[action] ?? 0;
  }

  return novelties;
};

const notifyUserAboutTokensUpdate = async (
  user,
  noveltyTokens,
  gainedNoveltyTokens,
  showPopupForUser,
  action,
  extraData
) => {
  try {
    if (await isUserOnline(user)) {
      sendSocketEventToUsers([user], socketEvents.updateNoveltyTokens, {
        noveltyTokens: noveltyTokens,
        gainedNoveltyTokens: gainedNoveltyTokens,
        showPopupForUser,
        popupText: earnActionsToAlertTexts(action, extraData),
        extraData: extraData,
      });
    } else if (action == "eventVerification") {
      createNotificationVerificationStakingFinished(
        extraData.eventId,
        user.email,
        gainedNoveltyTokens,
        "correctAnswer"
      );
    } else if (action == "invitedUser") {
      createNotificationInvitedUserJoined(
        user.email,
        extraData.email,
        extraData.username,
        gainedNoveltyTokens
      );
    }
  } catch (error) {
    console.log("Error dakgiiyat67 ", error);
  }
};

const earnActionsToAlertTexts = (action, extraData) => {
  let text = "";
  if (action == "createActivity") {
    text = "For hosting event";
  } else if (action == "fillOnboardingInfo") {
    text = "For filling your information";
  } else if (action == "eventVerification") {
    text = extraData?.giveBonus
      ? "For event verification"
      : "You got your stake back";
  } else if (action == "writeFeedback") {
    text = "For writing feedback";
  } else if (action == "invitedUser") {
    text = `For bringing ${extraData.username} to the novelty.`;
  } else if (action == "gift") {
    text = "You have been gifted by novelty.";
  }

  return text;
};

module.exports = {
  earnNovelties,
  stakeNovelties,
  finishStaking,
  gainNoveltiesActionToNumber,
  notifyUserAboutTokensUpdate,
};

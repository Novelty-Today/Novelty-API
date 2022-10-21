const mongoose = require("mongoose");
const User = mongoose.model("User");
const Friendship = mongoose.model("Friendship");
const {
  closedQuestionsList,
  closedQuestionKeyToQuestionMap,
  openQuestionsList,
  closedQuestionFeedbackKeyToTextMap,
  openQuestionKeyToQuestionMap,
} = require("../DataLists/friendshipQuestions");

const getUserFriendshipInfo = (email, friendEmail, eventId, dateIdentifier) => {
  return Promise.all([
    User.findOne({ email: friendEmail }),
    Friendship.findOne({ friends: { $all: [email, friendEmail] } }),
  ]).then(([friendData, friendship]) => {
    // if there is already a friendship object
    if (friendship) {
      return buildFriendObjectForOldFriendship(
        friendData,
        friendship,
        eventId,
        dateIdentifier,
        email
      );
    }
    // if there is no friendship object
    else {
      return buildFriendObjectForNewFriendship(friendData);
    }
  });
};

const buildFriendObjectForOldFriendship = (
  friendData,
  friendship,
  eventId,
  dateIdentifier,
  email
) => {
  let keyAndIndex = friendship.questionToAsk(); // question to ask key and index
  const index = friendship.questionnaire[0].email == email ? 0 : 1; // index of my questionnaire

  return {
    email: friendData.email,
    username: friendData.username,
    picture: friendData.microMedia,
    friendshipStatus: friendship.friendshipStatus(), // getting freindship status text
    totalQuestions: closedQuestionsList.length,
    numberOfQuestion: keyAndIndex.index + 1,
    openQuestions: buildOpenQuestionsForFriendship(
      friendData,
      friendship,
      eventId,
      dateIdentifier,
      index
    ),
    question: buildClosedQuestionForFriendship(
      friendData,
      friendship,
      keyAndIndex,
      eventId,
      dateIdentifier,
      index
    ),
  };
};

const buildClosedQuestionForFriendship = (
  friendData,
  friendship,
  keyAndIndex,
  eventId,
  dateIdentifier,
  index
) => {
  try {
    let closedQuestion = null;

    // check if user has already answered question for this event
    let alreadyAnswered = checkIfUserIsReviewed(
      friendship.questionnaire[index].closedQuestions,
      eventId,
      dateIdentifier
    );

    // if user has not answered question for this event and has not answered all of questions we add question
    if (!alreadyAnswered && keyAndIndex.index < closedQuestionsList.length) {
      closedQuestion = {
        questionKey: keyAndIndex.key,
        text: keyAndIndex.key
          ? closedQuestionKeyToQuestionMap(keyAndIndex.key, "questionText", {
              friendName: friendData.username
                ? friendData.username
                : friendData.email,
            })
          : "",
      };
    }

    return closedQuestion;
  } catch (error) {
    console.log("Error aifuayfa ", error);
  }
};

// check if this user is already reviewed
const checkIfUserIsReviewed = (closedQuestions, eventId, dateIdentifier) => {
  let isReviewed = false;
  closedQuestions.forEach((element) => {
    if (
      element.eventId == eventId &&
      element.dateIdentifier == dateIdentifier
    ) {
      isReviewed = true;
    }
  });
  return isReviewed;
};

const buildOpenQuestionsForFriendship = (
  friendData,
  friendship,
  eventId,
  dateIdentifier,
  index
) => {
  try {
    // getting open questions
    let openQuestions = getDefaultOpenQuestionsList({
      username: friendData?.username,
      email: friendData?.email,
    });
    // checking if open questions were answered alrady
    friendship.questionnaire[index].openQuestions.forEach((question) => {
      if (
        question.eventId == eventId &&
        question.dateIdentifier == dateIdentifier
      ) {
        openQuestions.forEach((openQuestion) => {
          openQuestion.answer = question.answer;
        });
      }
    });
    return openQuestions;
  } catch (error) {
    console.log("Error adfiuayf ", error);
    return [];
  }
};

const buildFriendObjectForNewFriendship = (friendData) => {
  return {
    friendshipStatus: "",
    username: friendData.username,
    email: friendData.email,
    picture: friendData.microMedia,
    question: {
      questionKey: closedQuestionsList[0]["questionKey"],
      text: closedQuestionKeyToQuestionMap(
        closedQuestionsList[0]["questionKey"],
        "questionText",
        {
          friendName: friendData.username
            ? friendData.username
            : friendData.email,
        }
      ),
    },
    openQuestions: getDefaultOpenQuestionsList({
      username: friendData?.username,
      email: friendData?.email,
    }),
    numberOfQuestion: 1,
    totalQuestions: closedQuestionsList.length,
  };
};

const getDefaultOpenQuestionsList = (extraData = {}) => {
  let openQuestions = [];
  openQuestionsList.forEach((element) => {
    openQuestions.push({
      questionKey: element.questionKey,
      text: element.questionText(extraData),
      answer: null,
    });
  });
  return openQuestions;
};

const getFriendshipsNew = (email) => {
  let friends = [];

  return Friendship.find({
    friends: email,
  })
    .then((results) => {
      let promiseArray = [];
      results.forEach((result) => {
        let friendEmail =
          result.friends[0] == email ? result.friends[1] : result.friends[0];

        let friendshipStatus = result.friendshipStatus();
        if (friendshipStatus != "" || result.connected) {
          promiseArray.push(
            User.findOne({ email: friendEmail }).then((user) => {
              friends.push({
                name: user.username ? user.username : user.email,
                username: user.username ? user.username : user.email,
                email: user.email,
                media: user.media,
                microMedia: user.microMedia,
              });
            })
          );
        }
      });
      return Promise.all(promiseArray).then(() => {
        return [friends, "success"];
      });
    })
    .catch((error) => {
      console.log(error);
      return [friends, "failed"];
    });
};

const getEmailListToReview = (event, dateIdentifier, requesterEmail) => {
  try {
    let emailListToReview = [];
    if (event) {
      eventData = event;

      // show organiser to review if organiser is not getting this people to review
      if (requesterEmail != event.organiser) {
        emailListToReview.push(event.organiser);
      }

      // get participants to review
      event.guests.forEach((guest) => {
        if (
          !emailListToReview.includes(guest.email) &&
          (guest.coHost || guest.dateIdentifier == dateIdentifier) &&
          guest.email != requesterEmail &&
          guest.status == "accepted"
        ) {
          emailListToReview.push(guest.email);
        }
      });
    }

    return emailListToReview;
  } catch (error) {
    console.log("Error aifuayf ", error);
    return [];
  }
};

const getClosedQuestionFeedback = (
  friendship,
  index,
  eventId,
  dateIdentifier,
  reviewer
) => {
  let closedQuestionAnswer;
  friendship.questionnaire[index].closedQuestions.forEach((element) => {
    if (
      element.eventId == eventId &&
      element.dateIdentifier == dateIdentifier
    ) {
      closedQuestionAnswer = closedQuestionFeedbackKeyToTextMap(
        element.questionKey,
        {
          friendName: reviewer.username ? reviewer.username : reviewer.email,
          answer: element.answer,
        }
      );
    }
  });
  return closedQuestionAnswer;
};

const getOpenedQuestionFeedback = (
  friendship,
  index,
  eventId,
  dateIdentifier,
  reviewer
) => {
  let openQuestionsList = [];
  friendship.questionnaire[index].openQuestions.forEach((element) => {
    if (
      element.eventId == eventId &&
      element.dateIdentifier == dateIdentifier
    ) {
      openQuestionsList.push({
        question: openQuestionKeyToQuestionMap(
          element.questionKey,
          "questionText",
          { email: reviewer.email, username: reviewer.username }
        ),
        answer: element.answer,
      });
    }
  });
  return openQuestionsList;
};

module.exports = {
  closedQuestionKeyToQuestionMap,
  getUserFriendshipInfo,
  closedQuestionsList,
  getEmailListToReview,
  checkIfUserIsReviewed,
  getClosedQuestionFeedback,
  getOpenedQuestionFeedback,
  getFriendshipsNew,
};

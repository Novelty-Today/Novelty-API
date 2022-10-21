const closedQuestionsList = [
  {
    questionKey: "wantsHangout",
    questionText: (extraInfo) => {
      return `Did you connect with ${extraInfo?.friendName}? Will you hangout more?`;
    },
  },
  {
    questionKey: "meaningfulConversation",
    questionText: (extraInfo) => {
      return `Did you have meaningful conversation with ${extraInfo?.friendName}? Will you hangout more?`;
    },
  },
  {
    questionKey: "becomeFriends",
    questionText: (extraInfo) => {
      return `Do you become friends with ${extraInfo?.friendName}?`;
    },
  },
  {
    questionKey: "becomeBff",
    questionText: (extraInfo) => {
      return `Have you become bff with ${extraInfo?.friendName}?`;
    },
  },
];

const closedQuestionsFeedbackList = [
  {
    questionKey: "wantsHangout",
    answerText: (extraInfo) => {
      return `${extraInfo.friendName} ${
        extraInfo.answer ? "wants" : "does not want"
      } to connect with you again${extraInfo.answer ? "! Great!" : "."}`;
    },
    answerKeyWord: (extraInfo) => {
      if (extraInfo.answer) {
        return "wants";
      } else {
        return "does not want";
      }
    },
  },
  {
    questionKey: "meaningfulConversation",
    answerText: (extraInfo) => {
      return `${extraInfo.friendName} ${
        extraInfo.answer ? "wants" : "does not want"
      } to be more connected with you${extraInfo.answer ? "! Great!" : "."}`;
    },
    answerKeyWord: (extraInfo) => {
      if (extraInfo.answer) {
        return "wants";
      } else {
        return "does not want";
      }
    },
  },
  {
    questionKey: "becomeFriends",
    answerText: (extraInfo) => {
      return `${extraInfo.friendName} ${
        extraInfo.answer ? "wants" : "does not want"
      } to become friend with you${extraInfo.answer ? "! Great!" : "."}`;
    },
    answerKeyWord: (extraInfo) => {
      if (extraInfo.answer) {
        return "wants";
      } else {
        return "does not want";
      }
    },
  },
  {
    questionKey: "becomeBff",
    answerText: (extraInfo) => {
      return `${extraInfo.friendName} ${
        extraInfo.answer ? "wants" : "does not want"
      } to become bff with you${extraInfo.answer ? "! Great!" : "."}`;
    },
    answerKeyWord: (extraInfo) => {
      if (extraInfo.answer) {
        return "wants";
      } else {
        return "does not want";
      }
    },
  },
];

const closedQuestionFeedbackKeyToTextMap = (
  questionKey = "wantsHangout",
  extraInfo = {}
) => {
  for (var i = 0; i < closedQuestionsFeedbackList.length; i++) {
    if (closedQuestionsFeedbackList[i]["questionKey"] == questionKey) {
      return {
        text: closedQuestionsFeedbackList[i]["answerText"](extraInfo),
        keyword: closedQuestionsFeedbackList[i]["answerKeyWord"](extraInfo),
      };
    }
  }
};

const closedQuestionKeyToQuestionMap = (
  searchString = "",
  getValueOf = "questionText",
  extraInfo = {},
  getNext = false
) => {
  if (
    getValueOf == "questionText" ||
    getValueOf == "questionValue" ||
    getValueOf == "questionKey"
  ) {
    for (var i = 0; i < closedQuestionsList.length; i++) {
      if (closedQuestionsList[i]["questionKey"] == searchString) {
        if (getNext) {
          if (closedQuestionsList.length == i + 1) {
            return null;
          } else {
            return getValueOf == "questionKey"
              ? closedQuestionsList[i + 1][getValueOf]
              : closedQuestionsList[i + 1][getValueOf](extraInfo);
          }
        } else {
          return getValueOf == "questionKey"
            ? closedQuestionsList[i][getValueOf]
            : closedQuestionsList[i][getValueOf](extraInfo);
        }
      }
    }
  } else {
    return null;
  }
};

const openQuestionsList = [
  {
    questionKey: "behaviourTimePlace",
    questionText: (extraInfo) => {
      return `How did ${
        extraInfo?.username
          ? extraInfo.username
          : extraInfo?.email
          ? extraInfo.email
          : "him/her"
      } make you feel? Remember, the best kind of feedback is when you keep it on "your side of the net".`;
    },
  },
  {
    questionKey: "behaviourDescription",
    questionText: (extraInfo) => {
      return `Describe your interactions with ${
        extraInfo?.username
          ? extraInfo.username
          : extraInfo?.email
          ? extraInfo.email
          : "him/her"
      }. What did you notice about him/her? What were things him/her said that resonated with you?`;
    },
  },
  {
    questionKey: "behaviourImpact",
    questionText: (extraInfo) => {
      return `What did you do with ${
        extraInfo?.username
          ? extraInfo.username
          : extraInfo?.email
          ? extraInfo.email
          : "him/her"
      }? Time and place are helpful.`;
    },
  },
];

const openQuestionKeyToQuestionMap = (
  searchString = "",
  getValueOf = "questionText",
  extraInfo = {},
  getNext = false
) => {
  if (getValueOf == "questionText" || getValueOf == "questionValue") {
    for (var i = 0; i < openQuestionsList.length; i++) {
      if (openQuestionsList[i]["questionKey"] == searchString) {
        if (getNext) {
          if (i + 1 == openQuestionsList.length) {
            return null;
          } else {
            return openQuestionsList[i + 1][getValueOf](extraInfo);
          }
        } else {
          return openQuestionsList[i][getValueOf](extraInfo);
        }
      }
    }
  } else {
    return null;
  }
};

module.exports = {
  closedQuestionsList,
  closedQuestionKeyToQuestionMap,
  openQuestionsList,
  openQuestionKeyToQuestionMap,
  closedQuestionFeedbackKeyToTextMap,
};

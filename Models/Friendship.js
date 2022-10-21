const mongoose = require("mongoose");
const {
  closedQuestionsList,
  closedQuestionKeyToQuestionMap,
} = require("../DataLists/friendshipQuestions");
const Schema = mongoose.Schema;

const questionSchema = new Schema({
  email: { type: String, required: true },
  closedQuestions: [
    {
      questionKey: { type: String, required: true },
      questionNotificationTime: { type: String, required: true },
      answer: { type: Boolean, required: false },
      answerTime: { type: String, required: false },
      eventId: { type: String, required: true },
      dateIdentifier: { type: String, required: true },
    },
  ],
  openQuestions: [
    {
      questionKey: { type: String, required: true },
      questionNotificationTime: { type: String, required: true },
      answer: { type: String, required: false },
      answerTime: { type: String, required: false },
      eventId: { type: String, required: true },
      dateIdentifier: { type: String, required: true },
    },
  ],
});

const friendshipSchema = new Schema({
  uuid: { type: String, required: true, unique: true },
  friends: [{ type: String, required: false }],
  questionnaire: [{ type: questionSchema, required: false }],
  connected: { type: Boolean, default: true },
});

friendshipSchema.methods.questionToAsk = function () {
  const friendship = this;
  let questionKey = null;
  let index = 0;

  const closedList1 = friendship.questionnaire[0].closedQuestions;
  const closedList2 = friendship.questionnaire[1].closedQuestions;

  for (var i = closedList1.length - 1; i >= 0; i--) {
    if (
      closedList1[i].answer == true &&
      closedList2[i]?.answer == true &&
      closedList1[i].questionKey == closedList2[i]?.questionKey &&
      closedList1[i].eventId == closedList2[i]?.eventId &&
      closedList1[i].dateIdentifier == closedList2[i]?.dateIdentifier
    ) {
      questionKey = closedList2[i].questionKey;
      index = i + 1;
    }
  }

  if (questionKey) {
    return {
      key: closedQuestionKeyToQuestionMap(questionKey, "questionKey", {}, true),
      index: index,
    };
  } else {
    return { key: closedQuestionsList[0].questionKey, index: 0 };
  }
};

friendshipSchema.methods.friendshipStatus = function (getOtherValue = null) {
  let answers = 0;
  if (this.questionnaire && this.questionnaire.length) {
    this.questionnaire[0].closedQuestions.forEach((friendOneQuestion) => {
      this.questionnaire[1].closedQuestions.forEach((frinedTwoQuestion) => {
        if (
          friendOneQuestion.answer == true &&
          frinedTwoQuestion.answer == true &&
          friendOneQuestion.questionKey == frinedTwoQuestion.questionKey &&
          friendOneQuestion.eventId == frinedTwoQuestion.eventId &&
          friendOneQuestion.dateIdentifier == frinedTwoQuestion.dateIdentifier
        ) {
          answers++;
        }
      });
    });
  }

  if (getOtherValue == "percentage") {
    const percentNumber = (answers / closedQuestionsList.length) * 100;
    return percentNumber.toFixed(2) + "%";
  } else if (getOtherValue == "value") {
    return answers;
  }

  if (answers === 0) {
    return "";
  } else if (answers === 1) {
    return "Connection";
  } else if (answers <= 3) {
    return "Friend";
  } else if (answers <= 6) {
    return "Best Friend";
  } else {
    return "BFF";
  }
};

const Friendship = mongoose.model("Friendship", friendshipSchema);

module.exports = Friendship;

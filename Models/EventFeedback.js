const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const legitQuestions = [
  "What did you like about the event?",
  "How could the event be improved?",
];

const eventFeedbackSchema = new Schema({
  uuid: { type: String, required: true },
  eventId: { type: String, required: true },
  dateIdentifier: { type: String, required: true },
  email: { type: String, required: true },
  mediaArray: [{ type: String, required: false }],
  miniMediaArray: [{ type: String, required: false }],
  rating: { type: Number, required: false },
  questions: [
    {
      question: {
        type: String,
        required: false,
        enum: legitQuestions,
      },
      answer: { type: String, required: false },
    },
  ],
  uploadTime: [{ type: String, required: true }],
});

const EventFeedback = mongoose.model("EventFeedback", eventFeedbackSchema);

module.exports = { EventFeedback, legitQuestions };

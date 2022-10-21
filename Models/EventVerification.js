const mongoose = require("mongoose");
const { noveltyTokenConfigs } = require("../constants");
const Schema = mongoose.Schema;

const eventVerificationSchema = new Schema({
  uuid: { type: String, required: true },
  eventId: { type: String, required: true },
  dateIdentifier: { type: String, required: true },
  stakeRequired: {
    type: Number,
    required: false,
    default: noveltyTokenConfigs.stakeRequiredToVerifyEvent,
  },
  verificationStatus: {
    type: String,
    required: true,
    enum: ["not-started", "pending", "verified", "not-verified"],
    default: "not-started",
  },
  numberOfVerifiers: {
    type: Number,
    required: false,
    default: noveltyTokenConfigs.maxNumberOfVerifiers,
  },
  verifiers: [
    {
      email: {
        type: String,
        required: false,
      },
      validated: {
        type: String,
        required: false,
        enum: ["yes", "no", "none"],
        default: "none",
      },
      timeStaked: { type: String, required: true },
      notifiedToFinishValidation: [
        {
          time: { type: String, required: false },
          type: {
            type: String,
            required: false,
            enum: ["email", "popup"],
            default: "email",
          },
        },
      ],
      stakeTimedOut: { type: Boolean, required: false, default: false },
    },
  ],
  eventParticipants: [{ type: String, required: false }],
  forCommunities: [{ type: String, required: false }],
  times: {
    creationTime: { type: String, required: false }, // time when this object was created. (event finish time)
    startTime: { type: String, required: false }, // when we activate verification and it gets pending status
    finishTime: { type: String, required: false }, // when it becomes verified or not-verified
  },
});

const EventVerification = mongoose.model(
  "EventVerification",
  eventVerificationSchema
);

module.exports = EventVerification;

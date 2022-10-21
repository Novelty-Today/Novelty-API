const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const geometry = mongoose.model("Geometry").schema;

const dateObject = new Schema({
  dateIdentifier: { type: String, required: true },
  dateString: { type: String, required: true },
  onlyHas: {
    type: String,
    required: true,
    enum: ["dateTime", "date", "time", "none"],
  },
  partOfDay: {
    type: String,
    required: true,
    enum: ["morning", "day", "evening", "night"],
  },
});

const eventSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  dateObjects: [{ type: dateObject, required: true }],
  location: { type: String, required: true },
  mediaArray: [{ type: String, required: false }],
  miniMediaArray: [{ type: String, required: false }],
  capacity: { type: Number, required: false },
  price: { type: Number, required: true },
  privacy: {
    type: String,
    required: false,
    enum: ["private-event", "private-event-invitation"],
    default: "private-event",
  },
  organiser: { type: String, required: false },
  guests: [
    {
      email: { type: String, required: false },
      phone: { type: String, required: false },
      dateIdentifier: { type: String, required: false },
      status: {
        type: String,
        required: false,
        // accepted when host accepts user
        // confirmed when user confirms he/she will attend event
        enum: ["waitlisted", "rejected", "accepted"], // before: pending, confirmed
        default: "waitlisted",
      },
      coHost: { type: Boolean, required: false, default: false },
      addedBy: {
        type: String,
        required: false,
        enum: ["organiser", "coHost", "user"],
        default: "user",
      },
      confirmedWantsToGo: { type: Boolean, required: false, default: false },
      priorityQueue: { type: Boolean, required: false, default: false },
      wasPreviouslyAccepted: { type: Boolean, required: false, default: false },
      joinedZoomMeeting: { type: Boolean, required: false, default: false },
      time: { type: String, required: true },
    },
  ],
  uploadTime: { type: String, required: false },
  lastModified: { type: String, required: false },
  forCommunities: [{ type: String, required: false }],
  zoomMeeting: { type: String, required: false },
  googleMeet: { type: String, required: false },
  showOnlineMeetingToPublic: { type: Boolean, required: false },
  tags: [{ type: String, required: false }],
  clubAffiliations: [{ type: String, required: false }],
  displayOnHomeScreen: { type: Boolean, required: true, default: true }, // is true straight away event start time passed
  isOld: { type: Boolean, required: false, default: false }, // is true after 24h event passed the starting time
  finishedDateIdentifiers: [{ type: String, required: false }],
  geometry: geometry,
  status: {
    type: String,
    required: true,
    enum: ["pending", "approved"],
    default: "pending",
  },
  reviewData: {
    reviewSum: { type: Number, required: true, default: 0 },
    reviewCount: { type: Number, required: true, default: 0 },
  },
  likesCount: { type: Number, required: true, default: 0 },
});

// returns average rating of event
eventSchema.virtual("rating").get(() => {
  if (
    !this.reviewData ||
    !this.reviewData.reviewSum ||
    this.reviewData.reviewSum === 0 ||
    this.reviewData.reviewCount === 0
  ) {
    return 0;
  } else {
    return this.reviewData.reviewSum / this.reviewData.reviewCount;
  }
});

eventSchema.index({ geometry: "2dsphere" });

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;

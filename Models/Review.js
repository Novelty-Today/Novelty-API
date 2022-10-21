const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const review = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["guestToOrganiser", "organiserToGuest", "guestToGuest"],
    default: "guestToOrganiser",
  },
  reviewer: { type: String, required: true },
  eventId: { type: String, required: true }, // an event can contain many dateTime
  dateIdentifier: { type: String, required: true },
  receiver: { type: String, required: true }, // to fetch all reviews for a user
  stars: { type: Number, required: false, min: 0, max: 5 },
  text: { type: String, required: false },
  uploadTime: { type: String, required: true },
});

const Review = mongoose.model("Review", review);

module.exports = Review;

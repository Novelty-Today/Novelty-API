const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const favorite = new Schema({
  eventId: { type: String, required: true },
  email: { type: String, required: true },
  dateTime: { type: String, required: true }, // time when user marked this event favourite
});

const Favorite = mongoose.model("Favorite", favorite);

module.exports = Favorite;

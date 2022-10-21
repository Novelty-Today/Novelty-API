const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const interest = new Schema({
  name: { type: String, required: true, unique: true },
  emoji: { type: String, required: false },
  url: [{ type: String, required: false }],
  urls: [{ type: String, required: false }],
});

const Interest = mongoose.model("Interest", interest);
module.exports = Interest;

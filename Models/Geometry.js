const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GeoSchema = new Schema({
  type: {
    type: String,
    default: "Point",
    enum: ["Point"],
  },
  coordinates: {
    type: [Number],
  },
});

const Geometry = mongoose.model("Geometry", GeoSchema);

module.exports = Geometry;

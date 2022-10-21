const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserCalendarSchema = new Schema({
  email: { type: String, required: true },
  events: [
    {
      title: { type: String, required: true },
      location: { type: String, required: false },
      startDate: { type: String, required: false },
      endDate: { type: String, required: false },
      fullObject: { type: Object, required: false },
    },
  ],
});

const UserCalendar = mongoose.model("UserCalendar", UserCalendarSchema);

module.exports = UserCalendar;

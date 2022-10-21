const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const errorLogSchema = new Schema({
  email: { type: String, required: false },
  date: { type: String, required: false },
  errorCode: { type: String, required: false },
  error: { type: String, required: false },
  deviceInfo: { type: Object, required: false },
});

const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);

module.exports = ErrorLog;

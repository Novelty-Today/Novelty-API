const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const task = new Schema({
  date: { type: Number, required: true },
  type: { type: String, required: true },
  user: { type: String, required: false },
  status: {
    type: String,
    required: true,
    enum: ["waiting", "processing", "done"],
    default: "waiting",
  },
  arguments: [{ type: Object, required: false }],
  identifier: { type: String, required: false },
});

const Task = mongoose.model("Task", task);

module.exports = Task;

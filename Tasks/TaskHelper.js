const mongoose = require("mongoose");
const Task = mongoose.model("Task");
const { mongoFindOne } = require("../functions/mongodbDriver");

const updateTaskStatus = (id, status) => {
  return Task.updateOne(
    {
      _id: id,
      status: "processing",
    },
    { status: status }
  )
    .then(() => {
      return "updated";
    })
    .catch((error) => {
      console.log("Error djfahu ", error);
      return error;
    });
};

// handles general task creation if it is not already created
// currently handles 'writeFeedback', 'verifyEvent', 'activityRequestAccepted' and 'eventDateUpdate' tasks.
// extraArguments are not used for searching
const createTaskIfDoesNotExist = (
  type,
  email,
  eventId,
  dateIdentifier,
  extraArguments = {}
) => {
  return mongoFindOne("tasks", {
    type: type,
    user: email,
    "arguments.0.eventId": eventId,
    "arguments.0.dateIdentifier": dateIdentifier,
    status: "waiting",
  }).then((foundTask) => {
    if (!foundTask) {
      const task = new Task({
        type: type,
        user: email,
        date: new Date().getTime(),
        arguments: { eventId, dateIdentifier, ...extraArguments },
      });
      return Task.insertMany([task]).catch((error) => {
        console.log("Error adiadygdtf6 ", error);
      });
    }
  });
};

module.exports = { updateTaskStatus, createTaskIfDoesNotExist };

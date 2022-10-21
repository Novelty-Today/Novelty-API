const { checkTasks } = require("./TaskHandler");
const {
  createGuestConfirmationAndWaitlistTasks,
} = require("./GuestConfirmationTasks");
const { checkEventDateTimes } = require("./EventStatusTasks");
const { updateTimeTagsFunction } = require("./TagTasks");
const { mongoFind, mongoUpdateMany } = require("../functions/mongodbDriver");

const runAllTasks = () => {
  if (
    !process?.env?.NODE_APP_INSTANCE ||
    process?.env?.NODE_APP_INSTANCE == 0
  ) {
    // recover processing tasks after app start or mark them as done
    recoverLostTasksFromProcessing().then(
      () => setInterval(checkTasks, 5 * 1000) // every 5 seconds
    );
    // bellow functions does not have tasks they are executing by directly searching events
    setInterval(createGuestConfirmationAndWaitlistTasks, 60 * 1000); // every 1 minutes
    setInterval(checkEventDateTimes, 5 * 60 * 1000); // every 5 min
    setInterval(updateTimeTagsFunction, 2 * 60 * 1000); // every 10 minutes
  }
};

const recoverLostTasksFromProcessing = () => {
  return mongoUpdateMany(
    "tasks",
    { status: "processing" },
    { $set: { status: "waiting" } }
  ).then(() => {});
};

module.exports = { runAllTasks };

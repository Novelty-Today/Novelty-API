const mongoose = require("mongoose");
const Task = mongoose.model("Task");
const ObjectId = require("mongodb").ObjectId;
const { handleNotificationTask } = require("./NotificationTasks");
const {
  handleNewMessagePushNotificationTask,
} = require("./remainderPushNotificationTasks");
const { handleEventUpdateAlertTask } = require("./EventUpdateTasks");
const {
  handleStartEventVerificationTask,
} = require("./EventVerificationTasks");
const { handleWriteFeedbackAlertTask } = require("./WriteFeedbackTask");
const { handleVerifyEventTask } = require("./VerifyEventTask");
const { mongoFindOneAndUpdate } = require("../functions/mongodbDriver");

const taskTypes = [
  "sendPushNotification",
  "activityRequestAccepted",
  "eventDateUpdate",
  "newMessagePushNotification",
  "startEventVerification",
  "writeFeedback",
  "verifyEvent",
];

const checkTasks = () => {
  let tasks = [];
  const filter = {
    date: { $lt: new Date().getTime() },
    status: "waiting",
    type: { $in: taskTypes },
  };

  // Finds all the taks that are due
  Task.find(filter)
    .then((result) => {
      tasks = result;

      if (tasks?.length > 0)
        return Task.updateMany(filter, { status: "processing" });
    })
    .then(() => {
      if (tasks?.length > 0) return handleTasks(tasks); // Sends tasks found to execution: each task will be executed
    })
    .catch((error) => console.log("Error adiatbaud6y5 ", error));
};

// working idea: for now 5 seconds are enough to go over all tasks, if task type repeats for the user we put to waiting mode and next time it will go over again.
// the idea is that the same tasks should not repeat actions twice
const handleTasks = (tasks) => {
  const alreadyHandledTasks = {};

  tasks.forEach((task) => {
    if (
      !task?.user ||
      !alreadyHandledTasks?.[task?.user]?.includes?.(task?.type)
    ) {
      // we check if we already passed same type of task for same user to handler
      if (alreadyHandledTasks?.[task?.user])
        alreadyHandledTasks?.[task?.user]?.push(task?.type);
      else alreadyHandledTasks[task?.user] = [task?.type];

      if (task.type == "sendPushNotification") {
        handleNotificationTask(task); // sends push notification
      } else if (task.type == "newMessagePushNotification") {
        handleNewMessagePushNotificationTask(task); // sends new message push notification
      } else if (
        task.type == "activityRequestAccepted" ||
        task.type == "eventDateUpdate"
      ) {
        handleEventUpdateAlertTask(task); // shows add to calendar alert
      } else if (task.type == "startEventVerification") {
        handleStartEventVerificationTask(task); // start event verification process
      } else if (task.type == "writeFeedback") {
        handleWriteFeedbackAlertTask(task); // shows feedback alert
      } else if (task.type == "verifyEvent") {
        handleVerifyEventTask(task); // shows event verification alert
      }
      // add other types here
    } else {
      mongoFindOneAndUpdate(
        "tasks",
        { _id: ObjectId(task._id + "") },
        { $set: { status: "waiting" } }
      ).then(() => {});
    }
  });
};

module.exports = {
  checkTasks,
};

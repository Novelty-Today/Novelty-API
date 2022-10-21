const { updateTaskStatus, createTaskIfDoesNotExist } = require("./TaskHelper");
const { getEventDataWithLinks } = require("../functions/buildEvent");
const { mongoFindOne } = require("../functions/mongodbDriver");
const {
  getCanWriteFeedback,
} = require("../functions/verificationFlowCheckers");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const createWriteFeedbackAlertTask = (email, eventId, dateIdentifier) => {
  return createTaskIfDoesNotExist(
    "writeFeedback",
    email,
    eventId,
    dateIdentifier
  );
};

const handleWriteFeedbackAlertTask = async (task) => {
  try {
    const [canWriteFeedback, user] = await Promise.all([
      getCanWriteFeedback(
        task?.arguments[0]?.eventId,
        task?.arguments[0]?.dateIdentifier,
        task?.user
      ),
      mongoFindOne("users", { email: task?.user }),
    ]);

    if (canWriteFeedback.canWrite) {
      if (await isUserOnline(user)) {
        await showPopupInFrontend(
          task?.arguments[0]?.eventId,
          task?.arguments[0]?.dateIdentifier,
          user
        );
        return updateTaskStatus(task._id, "done");
      } else {
        return updateTaskStatus(task?._id, "waiting");
      }
    } else {
      return updateTaskStatus(task?._id, "done");
    }
  } catch (error) {
    console.log("Error adyitaf ", error);
    updateTaskStatus(task?._id, "waiting").catch((error) => {
      console.log("Error &^*aifyafu ", error);
    });
  }
};

const showPopupInFrontend = (eventId, dateIdentifier, user) => {
  return getEventDataWithLinks(eventId, dateIdentifier, user.email, true).then(
    (event) => {
      sendSocketEventToUsers([user], socketEvents.showPopup, {
        type: "writeFeedback",
        params: { event },
      });
    }
  );
};

module.exports = {
  handleWriteFeedbackAlertTask,
  createWriteFeedbackAlertTask,
};

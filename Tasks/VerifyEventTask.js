const { updateTaskStatus, createTaskIfDoesNotExist } = require("./TaskHelper");
const { mongoFindOne } = require("../functions/mongodbDriver");
const { getCanVerifyEvent } = require("../functions/verificationFlowCheckers");
const {
  showLostTokensInFrontend,
  showVerifyEventPopupInFrontend,
} = require("../functions/noveltyTokenFunctions/remaindersForVerification");
const { isUserOnline } = require("../sockets/SocketFunctions");

const createVerifyEventTask = (email, eventId, dateIdentifier) => {
  return createTaskIfDoesNotExist(
    "verifyEvent",
    email,
    eventId,
    dateIdentifier
  );
};

const handleVerifyEventTask = async (task) => {
  try {
    let { eventId, dateIdentifier } = task?.arguments[0];

    const [verification, user] = await Promise.all([
      getCanVerifyEvent(task?.user, eventId, dateIdentifier),
      mongoFindOne("users", { email: task?.user }),
    ]);
    const isOnline = await isUserOnline(user);

    if ((verification.canVerify || verification.stakeTimedOut) && isOnline) {
      if (verification.canVerify) {
        await showVerifyEventPopupInFrontend(
          eventId,
          dateIdentifier,
          user,
          verification.stakeRequired
        );
      } else {
        showLostTokensInFrontend(
          eventId,
          dateIdentifier,
          user,
          verification.stakeRequired,
          "timeout"
        );
      }
    }

    if ((verification.canVerify || verification.stakeTimedOut) && isOnline) {
      return updateTaskStatus(task?._id, "done");
    } else if (!verification.canVerify && !verification.stakeTimedOut) {
      return updateTaskStatus(task?._id, "done");
    } else if (!isOnline) {
      return updateTaskStatus(task?._id, "waiting");
    }
  } catch (error) {
    console.log("Error gvdayut65f7a ", error);
    updateTaskStatus(task?._id, "waiting").catch((error) => {
      console.log("Error &^*aifyafu ", error);
    });
  }
};

module.exports = {
  createVerifyEventTask,
  handleVerifyEventTask,
};

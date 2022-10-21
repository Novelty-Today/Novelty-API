const ObjectId = require("mongodb").ObjectId;
const { getDateObjectWithIdentifier } = require("../functions/dateComparisons");
const { updateTaskStatus, createTaskIfDoesNotExist } = require("./TaskHelper");
const { getGuest } = require("../functions/guestGetterFunctions");
const { mongoFindOne } = require("../functions/mongodbDriver");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const createDateUpdateAlertTask = (email, eventId, dateIdentifier) => {
  return createTaskIfDoesNotExist(
    "eventDateUpdate",
    email,
    eventId,
    dateIdentifier
  );
};

const createRequestAcceptedAlertTask = (
  email,
  eventId,
  dateIdentifier,
  type
) => {
  return createTaskIfDoesNotExist(
    "activityRequestAccepted",
    email,
    eventId,
    dateIdentifier,
    { type }
  );
};

const handleEventUpdateAlertTask = async (task) => {
  try {
    const [event, user] = await Promise.all([
      mongoFindOne("events", { _id: ObjectId(task?.arguments[0]?.eventId) }),
      mongoFindOne("users", { email: task?.user }),
    ]);
    const isOnline = await isUserOnline(user);

    const guest = getGuest(
      event,
      task?.user,
      task?.arguments[0]?.dateIdentifier
    );

    const isValidUser =
      guest?.status == "accepted" || task?.user == event?.organiser;

    if (isOnline && event && isValidUser) {
      sendSocketEventToUsers([user], socketEvents.showPopup, {
        type: "addToCalendar",
        params: {
          text: getTextForPopup(task, event),
          name: event.name,
          dateObject: getDateObjectWithIdentifier(
            event?.dateObjects,
            task?.arguments[0]?.dateIdentifier
          ),
          location: event?.location,
        },
      });

      return updateTaskStatus(task._id, "done");
    }
    // if user is not accepted guest anymore or event is deleted task is done
    else if (!event || !isValidUser) {
      return updateTaskStatus(task?._id, "done");
    }
    // if user is not online we return this task as waiting
    else if (!isOnline) {
      return updateTaskStatus(task?._id, "waiting");
    }
  } catch (error) {
    console.log("Error guaiygta6ft76 ", error);
    updateTaskStatus(task?._id, "waiting").catch((error) => {
      console.log("Error &^*aifyafu ", error);
    });
  }
};

const getTextForPopup = (task, event) => {
  switch (task?.type) {
    case "eventDateUpdate":
      return `Date of ${event.name ?? ""} has been updated.`;
    case "activityRequestAccepted":
      return task?.arguments?.[0]?.type == "joinRequests"
        ? `Your request on ${event?.name ?? ""} has been accepted.`
        : `You have approved the invitation on event: ${event?.name ?? ""}`;
    default:
      return "";
  }
};

module.exports = {
  handleEventUpdateAlertTask,
  createDateUpdateAlertTask,
  createRequestAcceptedAlertTask,
};

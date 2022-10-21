const mongoose = require("mongoose");
const Task = mongoose.model("Task");
const Chat = mongoose.model("Chat");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const { updateTaskStatus } = require("./TaskHelper");
const { sendJustPushNotification } = require("../functions/notifications");
const { notificationsConfig } = require("../constants");

const createRemainderPushNotificationTask = (type, identifier, email) => {
  const dateNow = new Date().getTime();

  return Task.find({
    user: email,
    type: type,
    identifier: identifier,
  })
    .sort({ date: -1 })
    .limit(1)
    .then((tasks) => {
      const task = tasks.length > 0 ? tasks[0] : null;

      let createTaskWithDate = null;

      if (task) {
        // passed more than 10 min
        if (
          task.date <
          dateNow - notificationsConfig.timeToIgnoreNotification
        ) {
          createTaskWithDate = new Date().getTime();
        }
        // passed less than 10 min but is in past
        else if (task.date < dateNow) {
          createTaskWithDate =
            task.date + notificationsConfig.timeToIgnoreNotification;
        }
        // else task will be executed in the future so we dont have to do anything
      }
      //
      else {
        createTaskWithDate = new Date().getTime();
      }

      if (createTaskWithDate) {
        const task = new Task({
          user: email,
          type: type,
          date: createTaskWithDate,
          identifier: identifier,
        });
        return Task.insertMany([task]);
      }
    })
    .catch((error) => {
      console.log("Error djgaytr76 ", error);
    });
};

const handleNewMessagePushNotificationTask = (task) => {
  return Chat.findOne({ uuid: task?.identifier })
    .then((chat) => {
      let hasAlreadySeen = false;
      chat?.chatMembers?.forEach((member) => {
        if (member?.email == task?.user) {
          hasAlreadySeen = member?.lastMessageSeen;
        }
      });

      if (!hasAlreadySeen) return buildAndSendPush(chat, task);
    })
    .then(() => {
      return updateTaskStatus(task?._id, "done");
    })
    .catch((error) => {
      console.log("Error dfidaghfy7t  ", error);
      return updateTaskStatus(task?._id, "waiting");
    });
};

const buildAndSendPush = (chat, task) => {
  let user;
  return User.findOne({
    email: chat?.messages[chat?.messages?.length - 1]?.sender,
  })
    .then((userData) => {
      user = userData;
      return Event.findOne({ _id: chat?.eventId });
    })
    .then((event) => {
      let title = "New message";
      if (user?.username) {
        title = `${user?.username} ${
          chat?.type == "group"
            ? `sent new message in ${event?.name ?? "group chat"}`
            : "sent you new message"
        }`;
      } else if (chat?.type == "group") {
        title = `New message in ${event?.name ?? "group chat"}`;
      }

      const message = chat?.messages[chat?.messages?.length - 1]?.message;
      const extraData = buildExtraData(chat, task);

      return sendJustPushNotification(task?.user, title, message, extraData);
    });
};

const buildExtraData = (chat, task) => {
  let extraData = {
    type: "message",
    chatType: chat?.type,
    uuid: chat?.uuid,
  };
  if (chat?.type == "private") {
    extraData.email =
      chat?.chatMembers[0]?.email == task?.user
        ? chat?.chatMembers[1]?.email
        : chat?.chatMembers[0]?.email;
  } else {
    extraData.eventId = chat?.eventId;
    extraData.dateIdentifier = chat?.dateIdentifier;
  }

  return extraData;
};

module.exports = {
  createRemainderPushNotificationTask,
  handleNewMessagePushNotificationTask,
};

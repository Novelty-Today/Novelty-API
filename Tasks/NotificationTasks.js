const mongoose = require("mongoose");
const Task = mongoose.model("Task");
const User = mongoose.model("User");
const { updateTaskStatus } = require("./TaskHelper");
const {
  sendNotificationWithTokensList,
  getPushTokenLists,
} = require("../functions/notifications");
const { addNewNotification } = require("../functions/addNewNotification");
const {
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const createNotificationTasks = (emailList, title, message, extraData) => {
  // never call this function multiple times at the same place without waiting for previous call to finish.
  // if you call this function two times at the same place there is a chance that it will create two tasks with same time
  // and this can result user receiving same notification multiple times

  return Promise.all(
    emailList.map((email) => {
      let user;
      let notification;
      return User.findOne({ email: email })
        .then((userData) => {
          user = userData;
          console.log(
            "... createNotificationTasks  ",
            user.email,
            title,
            message
          );
          return addNewNotification(user, title, message, extraData);
        })
        .then((data) => {
          notification = data;
          sendSocketEventToUsers(
            [user],
            socketEvents.newNotification,
            notification
          );
          // Creating task for each user if there was not similar tasks already created
          return Task.findOne({
            user: email,
            type: "sendPushNotification",
            status: "waiting",
          });
        })
        .then((task) => {
          if (!task) {
            const task = new Task({
              user: email,
              type: "sendPushNotification",
              date: new Date().getTime(),
            });
            return Task.insertMany([task]);
          }
        })
        .then(() => {
          return notification;
        })
        .catch((error) => {
          console.log("Error adfiaghyt ", error);
        });
    })
  )
    .then((notifications) => {
      return notifications;
    })
    .catch((error) => {
      console.log("Error alfarcara rma", error);
    });
};

const handleNotificationTask = (task) => {
  const email = task?.user;
  const taskId = task?._id;
  let sentAll = true;

  //Finding user
  return User.findOne(
    { email: email },
    { notifications: 1, expoPushTokensList: 1, _id: 0 }
  )
    .then((user) => {
      //Sending all notifications to users
      var pushTokenList = getPushTokenLists([user]);

      return Promise.all(
        user?.notifications?.map((notification) => {
          if (notification?.status == "notSent") {
            return sendPushNotification(
              pushTokenList,
              notification,
              email
            ).then((sent) => {
              if (!sent) sentAll = false;
            });
          } else return Promise.resolve();
        })
      );
    })
    .then(() => {
      return updateTaskStatus(taskId, sentAll ? "done" : "waiting");
    })
    .catch((error) => {
      console.log("Error alfialiemrcamrauricma", error);
      return updateTaskStatus(taskId, "waiting");
    });
};

const sendPushNotification = (pushTokenList, notification, email) => {
  // we can send
  if (!notification.sendTime || notification.sendTime < new Date().getTime()) {
    return sendNotificationWithTokensList(
      pushTokenList,
      notification.title,
      notification.message,
      notification.extraData,
      notification._id,
      email
    )
      .then(() => true)
      .catch(() => false);
  }
  // we can not send yet
  else {
    return Promise.resolve().then(() => false);
  }
};

module.exports = {
  handleNotificationTask,
  createNotificationTasks,
};

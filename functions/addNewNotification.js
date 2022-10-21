const mongoose = require("mongoose");
const { notificationsConfig } = require("../constants");
const User = mongoose.model("User");
const Notification = mongoose.model("Notification");

const notificationsToGroup = ["privateEventGuestRequest", "ticketSold"];

const addNewNotification = (user, title, message, extraData) => {
  // notifications to group
  if (notificationsToGroup.includes(extraData.type)) {
    return handleNotificationsToGroup(user, title, message, extraData);
  }
  // normal notifications
  else {
    return addNormalNotification(user, title, message, extraData).then(
      (notification) => {
        return { notification, notificationIdToRemove: null };
      }
    );
  }
};

const handleNotificationsToGroup = (user, title, message, extraData) => {
  let notificationToRemove = findNotificationToGroup(
    user.notifications,
    extraData
  );

  const notificationMessage = notificationToRemove
    ? getMessageForGroupedNotifications(extraData.type, message)
    : message;

  return Promise.all([
    removeNotifications(user, notificationToRemove),
    addNormalNotification(
      user,
      title,
      notificationMessage,
      extraData,
      notificationToRemove ? true : false,
      notificationToRemove?.sendTime
    ),
  ]).then(([removed, notification]) => {
    return { notification, notificationIdToRemove: notificationToRemove?._id };
  });
};

const findNotificationToGroup = (notifications, extraData) => {
  let notificationToRemove;

  const numOfNotificationsToCheck =
    notifications.length - Math.min(100, notifications.length);

  for (var i = numOfNotificationsToCheck; i < notifications.length; i++) {
    if (shouldGroupNotifications(notifications[i], extraData)) {
      notificationToRemove = notifications[i];
      i = notifications.length;
    }
  }
  return notificationToRemove;
};

const shouldGroupNotifications = (notification, extraData) => {
  return (
    notification.extraData.type == extraData.type &&
    notification.extraData.eventId == extraData.eventId &&
    (notification.extraData.dateIdentifier == extraData.dateIdentifier ||
      (!extraData.dateIdentifier && !notification.extraData.dateIdentifier))
  );
};

const getMessageForGroupedNotifications = (type, message) => {
  if (type == "privateEventGuestRequest") {
    return "You have new requests.";
  } else if (type == "ticketSold") {
    return "Tickets sold.";
  } else {
    message;
  }
};

const addNormalNotification = (
  user,
  title,
  message,
  extraData,
  isGrouped = false,
  sendTime
) => {
  const notification = new Notification({
    title,
    message,
    extraData,
    status: "notSent",
    isGrouped,
    sendTime: getSendTime(sendTime),
  });

  return User.findOneAndUpdate(
    { email: user.email },
    { $push: { notifications: notification } },
    { new: true }
  )
    .then(() => {
      return notification;
    })
    .catch((error) => {
      console.log("Error eajhfaiuyf7ei ", error);
    });
};

const getSendTime = (sendTime) => {
  // we should wait some time(controled by timeToIgnoreNotification) from sending last notification of this group
  let sendTimeFinal = new Date().getTime();

  // if we have sendTime that means we already send same kind of notification and we have to adjust time
  if (sendTime) {
    // we have not sent notification yet so we don't change sendTime
    if (sendTime > new Date().getTime()) {
      sendTimeFinal = sendTime;
    }
    // we have sent notification but it was more than specified time ago so we sent it now
    else if (
      new Date().getTime() - sendTime >
      notificationsConfig.timeToIgnoreNotification
    ) {
      sendTimeFinal = new Date().getTime();
    }
    // we have sent notification but time specified above was not passed so we have to wait
    else {
      sendTimeFinal = sendTime + notificationsConfig.timeToIgnoreNotification;
    }
  }

  return sendTimeFinal;
};

const removeNotifications = (user, notificationToRemove) => {
  if (notificationToRemove) {
    return User.findOneAndUpdate(
      { email: user.email },
      { $pull: { notifications: { _id: notificationToRemove._id } } }
    ).catch((error) => {
      console.log("Error afihaiy ", error);
    });
  } else {
    return Promise.resolve();
  }
};

module.exports = { addNewNotification };

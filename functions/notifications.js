const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const http2 = require("http2");
const fs = require("fs");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { iosPushNotificationsApi } = require("../constants");

const sendToAndroid = (deviceToken, title, message, extraData) => {
  return fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `key=AAAAxXU_Ux4:APA91bEoK8dIx6h-nO4GVVuS1zwp7hLmhUeyH1LmeHXjZ2omw6vwhNsRpuZAjJrWBfWEiMFpcB7UCewDWzPiaBPa2pnBxRcfKGccnxih4FYd9mXX5sS21UzpIgT1-LBJXesSv-Mu4W2n`,
    },
    body: JSON.stringify({
      to: deviceToken,
      priority: "normal",
      data: {
        title: `${title}`,
        message: `${message}`,
        body: { extraData: extraData },
      },
    }),
  })
    .then((result) => result)
    .catch((error) => error);
};

const sendToIos = (deviceToken, title, message, extraData) => {
  const authorizationToken = jwt.sign(
    {
      iss: "ASQ752JA9M", //Payload: Development Team
      iat: Math.round(new Date().getTime() / 1000),
    },
    fs.readFileSync("./AuthKey_S5MUW3248M.p8", "utf8"), // Encription key by Apple
    {
      header: {
        alg: "ES256", // Signing Algorithm
        kid: "S5MUW3248M", // Key ID
      },
    }
  );

  return new Promise((resolve, reject) => {
    const client = http2.connect(iosPushNotificationsApi);

    const request = client.request({
      ":method": "POST",
      ":path": "/3/device/" + deviceToken, // This is the native device token you grabbed from client-side: It has device identifier + App ID
      authorization: `bearer ${authorizationToken}`, // This is the JSON web token we generated in the "Authorization" step above
      ":scheme": "https",
      "apns-topic": "org.novelty.today",
    });

    request.setEncoding("utf8");

    request.write(
      JSON.stringify({
        aps: {
          alert: {
            title: `${title}`,
            body: `${message}`,
          },
        },
        body: { extraData: extraData },
        //experienceId: "@username/example",
      })
    );

    request.on("error", (error) => {
      console.log("Error afl;jacrimaema", error);
      reject(error);
    });

    request.on("response", (headers, flags, payload) => {
      if (payload.status != 200 || payload.status != 210) {
        // console.log("notification paload ", payload);
        reject("Too many Notification");
      }
    });

    request.end(() => {
      //console.log("iOS message sent");
      resolve("iOS message sent");
    });
  });
};

////////////////////////////////////////////////////////////////////

const getPushTokenLists = (serverUserList, exceptUserList = []) => {
  var pushTokenLists = {
    androidTokensList: [],
    iosTokensList: [],
  };

  // For several users
  for (var i = 0; i < serverUserList.length; i++) {
    // Expo Push token List Field

    if (serverUserList[i].expoPushTokensList) {
      for (var j = 0; j < serverUserList[i].expoPushTokensList.length; j++) {
        if (
          serverUserList[i].expoPushTokensList[j].deviceType == "android" &&
          !exceptUserList.includes(serverUserList[i].email)
        ) {
          pushTokenLists.androidTokensList.push(
            serverUserList[i].expoPushTokensList[j].devicePushToken
          );
        } else if (
          serverUserList[i].expoPushTokensList[j].deviceType == "ios" &&
          !exceptUserList.includes(serverUserList[i].email)
        ) {
          pushTokenLists.iosTokensList.push(
            serverUserList[i].expoPushTokensList[j].devicePushToken
          );
        }
      }
    }
  }
  return pushTokenLists;
};

const sendNotificationWithTokensList = (
  pushTokensList,
  title,
  message,
  extraData,
  notificationId,
  email
) => {
  var pushPromises = [];

  for (var i = 0; i < pushTokensList.androidTokensList.length; i++) {
    pushPromises.push(
      sendToAndroid(
        pushTokensList.androidTokensList[i],
        title,
        message,
        extraData
      )
    );
  }

  for (var i = 0; i < pushTokensList.iosTokensList.length; i++) {
    pushPromises.push(
      sendToIos(pushTokensList.iosTokensList[i], title, message, extraData)
    );
  }

  return Promise.all(pushPromises).then((result) => {
    return User.updateOne(
      {
        email: email,
        "notifications._id": notificationId,
      },
      { $set: { "notifications.$.status": "sent" } }
    );
  });
};

const sendJustPushNotification = (email, title, message, extraData) => {
  return User.findOne({ email }).then((user) => {
    const expoPushTokensList = getPushTokenLists([user]);

    expoPushTokensList.androidTokensList.forEach((expoPushToken) => {
      sendToAndroid(expoPushToken, title, message, extraData).catch((error) => {
        console.log("Error a58468afafafaad", error);
      });
    });
    expoPushTokensList.iosTokensList.forEach((expoPushToken) => {
      sendToIos(expoPushToken, title, message, extraData).catch((error) => {
        console.log("Error alfarila3433acmlralm", error);
      });
    });
  });
};

const markNotificationAsAnswered = (user, notificationId, confirmed) => {
  let notificationExtraData = {};

  user.notifications.forEach((notification) => {
    if (notification._id.toString() == notificationId) {
      notificationExtraData = {
        ...notification.extraData,
        confirmed: confirmed,
        answered: true,
      };
      if (notification.extraData.type == "waitlistReadyToGo") {
        notificationExtraData.added = confirmed == true;
      }
    }
  });

  return User.findOneAndUpdate(
    {
      email: user.email,
      "notifications._id": notificationId,
    },
    {
      $set: {
        "notifications.$.extraData": notificationExtraData,
      },
    }
  )
    .then(() => {})
    .catch((error) => console.log("dm vhr3", error));
};

const checkNotificationExsits = (user, type, eventId, dateIdentifier) => {
  let exists = false;

  user?.notifications?.forEach((notification) => {
    if (
      notification.extraData.type == type &&
      notification.extraData.eventId == eventId &&
      notification.extraData.dateIdentifier == dateIdentifier
    ) {
      exists = true;
    }
  });

  return exists;
};

module.exports = {
  getPushTokenLists,
  sendNotificationWithTokensList,
  sendJustPushNotification,
  markNotificationAsAnswered,
  checkNotificationExsits,
};

const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const Chat = mongoose.model("Chat");
const User = mongoose.model("User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sharp = require("sharp");
const constants = require("../constants");
const { showLocalTaskFinishAlert } = require("./taskStringCodes");
const {
  handleInvitationToken,
  isInvitationLinkValid,
} = require("./handleInvitationToken");
const { validEmails } = require("../DataLists/emails");
const { getCustomMessage } = require("./generalFunctions");
const {
  createNotificationActivityUploaded,
} = require("./createNotificationFunctions");
const { getGuest } = require("./guestGetterFunctions");
const { getEventDataWithLinks } = require("./buildEvent");
const { getUserCommunityName } = require("./communityFunctions");
const { newMessageHandler } = require("../sockets/MessageSockets");
const { createPrivateChat } = require("./ChatCreationFunctions");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");

const resizeImg = (mediaBool, mediaPath, miniMediaPath, width) => {
  return new Promise((resolve, reject) => {
    if (mediaBool) {
      sharp(mediaPath)
        .resize({ width: width })
        .toFile(miniMediaPath)
        .then(async () => {
          resolve("done");
        });
    } else {
      resolve("done");
    }
  });
};

const getMessagesCount = (email) => {
  return Chat.find({
    "chatMembers.email": email,
    messages: { $not: { $size: 0 } },
  })
    .then((chats) => {
      let messageCount = 0;
      let promiseArray = [];

      for (var i = 0; i < chats.length; i++) {
        for (var j = 0; j < chats[i].chatMembers.length; j++) {
          if (
            chats[i].chatMembers[j].email == email &&
            chats[i].chatMembers[j].lastMessageSeen == false &&
            !chats[i].chatMembers[j].isRemoved
          ) {
            // if chat is private
            if (chats[i].type == "private") {
              messageCount++;
              j = chats[i].chatMembers.length;
            }
            // if it is group chat we need to check if event exists
            else {
              const tempI = i;
              promiseArray.push(
                Event.findOne({ _id: chats[tempI].eventId })
                  .then((event) => {
                    // we need to check if event exists, user is realy member of that group and event is not old to count unread messages
                    // if removing user from chat fails without checking guest status it will return wrong unread messages count
                    if (
                      event &&
                      (event.organiser == email ||
                        getGuest(event, email, chats[tempI].dateIdentifier)
                          ?.status == "accepted") &&
                      !event.isOld &&
                      !event.finishedDateIdentifiers.includes(
                        chats[tempI].dateIdentifier
                      )
                    ) {
                      messageCount++;
                      j = chats[tempI].chatMembers.length;
                    }
                  })
                  .catch((error) => {
                    console.log("Error diufay ", error);
                  })
              );
            }
          }
        }
      }
      return Promise.all(promiseArray).then(() => {
        return messageCount;
      });
    })
    .catch((error) => {
      console.log("Error afyii76b85745(*&* ", error);
      return 0;
    });
};

const getHashedPassword = (password) => {
  return bcrypt.genSalt(10).then((salt) => {
    return bcrypt.hash(password, salt);
  });
};

const isRegistrationValid = (email, invitationToken) => {
  return new Promise((resolve, reject) => {
    if (validEmails.includes(`@${email.split("@")[1]}`)) {
      resolve("valid");
    } else if (invitationToken) {
      return isInvitationLinkValid(invitationToken).then(
        (isInvitationValidBool) => {
          if (isInvitationValidBool) {
            resolve("valid");
          } else {
            isStringEmail(email)
              ? resolve("pendingUser")
              : reject({
                  message: "Please, use valid email.",
                });
          }
        }
      );
    } else {
      isStringEmail(email)
        ? resolve("pendingUser")
        : reject({
            message: "Please, use valid email.",
          });
    }
  });
};

const isStringEmail = (string) => {
  try {
    if (string.includes("@")) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error dfiuayfaf ", error);
  }
};

const signTokenAndSend = (
  user,
  res,
  message,
  email,
  shouldFillFields = false,
  invitationToken = null,
  role = "user"
) => {
  const token = jwt.sign({ userId: user._id }, constants.MY_SECRET_KEY);
  handleInvitationToken(invitationToken, email).then(() => {
    res.send({
      message,
      token,
      email,
      shouldFillFields,
      role,
      community: getUserCommunityName(user),
    });
  });
};

const createNewUser = (
  email,
  password,
  connectedAccounts = null,
  emailConfirmed = null,
  wasDeleted = false,
  isPendingUser = false
) => {
  return Promise.resolve()
    .then(() => {
      let data = {};
      if (!wasDeleted && connectedAccounts) {
        data.connectedAccounts = connectedAccounts;
      }
      if (!wasDeleted && emailConfirmed) {
        data.emailConfirmed = emailConfirmed;
      }
      if (wasDeleted && password) {
        data.password = password;
      }

      if (wasDeleted) {
        return User.findOneAndUpdate(
          { email },
          {
            $set: {
              accountStatus: "active",
              role: isPendingUser ? "pendingUser" : "user",
              ...data,
            },
          }
        );
      } else {
        return User.create({
          email: email,
          password: password,
          role: isPendingUser ? "pendingUser" : "user",
          ...data,
        });
      }
    })
    .then((userData) => {
      return userData;
    });
};

const notifyUserAboutEventUploadFinish = async (
  eventId,
  dateIdentifier,
  organiser,
  localEventId,
  isSuccess = true,
  update = false
) => {
  try {
    let event = null;

    if (update || isSuccess) {
      event = await getEventDataWithLinks(
        eventId,
        dateIdentifier,
        organiser.email
      );
    }

    if (await isUserOnline(organiser)) {
      sendSocketEventToUsers([organiser], socketEvents.eventUploadFinish, {
        event,
        localEventId,
        isSuccess,
        update,
      });
    } else {
      createNotificationActivityUploaded(
        organiser.email,
        event._id,
        localEventId,
        event.name,
        event.dateObjects,
        isSuccess
      );
    }
  } catch (error) {
    console.log("Error siaudyt7a6t ", error);
  }
};

const notifyUserAboutPictureUpdate = (
  user,
  isSuccess,
  localTaskKey,
  media,
  microMedia
) => {
  let alertText = isSuccess
    ? `Picture has uploaded successfully.`
    : `Picture upload failed. Please try again.`;

  sendSocketEventToUsers([user], socketEvents.runServerCode, {
    code: showLocalTaskFinishAlert(
      localTaskKey,
      alertText,
      isSuccess,
      isSuccess ? media : null,
      isSuccess ? microMedia : null
    ),
  });
};

const extractPayloadFromConfirmationToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      constants.EMAIL_CONFIRMATION_SECRET_KEY,
      (error, payload) => {
        if (error) {
          console.log("Error in parsing email confirmation token: ", error);
          return reject("Unknown error");
        }
        return resolve(payload);
      }
    );
  });
};

const buildSocialMediaProfileUrl = (socialMediaObj) => {
  // instagram
  if (
    socialMediaObj.type == "Instagram" &&
    !socialMediaObj.profileUrl.includes("instagram.com/")
  ) {
    return `https://www.instagram.com/${socialMediaObj.profileUrl}/`;
  }
  // tiktok
  else if (
    socialMediaObj.type == "Tiktok" &&
    !socialMediaObj.profileUrl.includes("tiktok.com/@")
  ) {
    return `https://www.tiktok.com/@${socialMediaObj.profileUrl}/`;
  }
  // others should directly have url not usernames
  return socialMediaObj.profileUrl;
};

const getGreetingMessage = (user) => {
  const greetingEmail = "koreli@stanford.edu";
  const name = user?.username?.split(" ")[0] ?? "";
  const message = getCustomMessage(name);

  return Promise.all([
    Chat.findOne({
      "chatMembers.email": { $all: [user.email, greetingEmail] },
      type: "private",
    }),
    User.findOne({ email: greetingEmail }),
  ]).then(([chat, senderUser]) => {
    if (!chat) {
      return createPrivateChat([
        { email: user.email, username: user.username },
        { email: greetingEmail, username: senderUser.username },
      ]).then((chatData) => {
        return newMessageHandler(
          senderUser,
          chatData.uuid,
          null,
          message,
          null,
          null,
          { type: "message" },
          null
        );
      });
    }
  });
};

module.exports = {
  resizeImg,
  getMessagesCount,
  getHashedPassword,
  signTokenAndSend,
  notifyUserAboutEventUploadFinish,
  notifyUserAboutPictureUpdate,
  createNewUser,
  extractPayloadFromConfirmationToken,
  isRegistrationValid,
  buildSocialMediaProfileUrl,
  getGreetingMessage,
};

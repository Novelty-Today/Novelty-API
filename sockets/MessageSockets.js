const mongoose = require("mongoose");
const Chat = mongoose.model("Chat");
const { googleCloudMediaBuckets } = require("../constants");
const { v4: uuidv4 } = require("uuid");
const { sendPushIfNotOnline } = require("./ChatSockets");
const {
  uploadImageDataToDatabaseWithMiniPicture,
  uploadAudioDataToDatabase,
} = require("../functions/mediaProccessing");
const { mongoFindOne } = require("../functions/mongodbDriver");
const { addComment } = require("../functions/commentFunctions");
const { tokenValidation } = require("./ValidationSockets");
const {
  deleteOldZoomStartedMessages,
} = require("../functions/zoomMessageFunctions");
const { buildGoogleCloudUrl } = require("../services/gcp-storage");
const { sendSocketEventToRoom, socketEvents } = require("./SocketFunctions");

const newMessageHandler = (
  sender,
  chatUuid,
  messageUuid, // comes from frontend
  message, // message text
  media = null,
  voice = null,
  extraData = {}, // extraData object
  replyTo = null
) => {
  let time = new Date().toUTCString();
  let originalFilename = null;
  let imageFilename = null;
  let miniImageFilename = null;
  let audioFilename = null;

  let messageObj;

  updateLastMessagesSeenStatus(chatUuid, sender?.email, false, true);

  if (media) {
    originalFilename = uuidv4() + ".jpeg";
    imageFilename = uuidv4() + ".jpeg";
    miniImageFilename = uuidv4() + ".jpeg";
  }
  if (voice) {
    audioFilename = uuidv4() + ".wav";
  }

  messageObj = {
    ...extraData,
    type: extraData?.type ?? "message",
    message,
    sender: sender?.email,
    time,
    media: imageFilename
      ? buildGoogleCloudUrl(
          googleCloudMediaBuckets.chatMediaBucket,
          imageFilename
        )
      : null,
    miniMedia: miniImageFilename
      ? buildGoogleCloudUrl(
          googleCloudMediaBuckets.chatMediaBucket,
          miniImageFilename
        )
      : null,
    voice: buildGoogleCloudUrl(
      googleCloudMediaBuckets.chatMediaBucket,
      audioFilename
    ),
    replyTo,
  };

  return Promise.all([
    Chat.findOneAndUpdate(
      { uuid: chatUuid },
      { $push: { messages: messageObj } },
      { new: true }
    ),
    uploadImageDataToDatabaseWithMiniPicture(
      media,
      originalFilename,
      imageFilename,
      miniImageFilename
    ),
    uploadAudioDataToDatabase(voice, audioFilename),
  ])
    .then(([chat, imageData, audioData]) => {
      if (chat) {
        sendSocketEventToRoom(chatUuid, socketEvents.newMessage, {
          chatUuid,
          _id: chat?.messages?.[chat.messages.length - 1]?._id?.toString(), // id of last message added
          messageUuid, // incoming message uuid. Controls which message we want to alter
          username: sender?.username,
          ...messageObj,
        });

        sendPushIfNotOnline(sender, chatUuid);
      }
    })
    .then(() => {
      // optional stuff for different message types
      if (extraData?.type == "zoomMeetingStarted") {
        deleteOldZoomStartedMessages(
          chatUuid,
          extraData?.eventId,
          extraData?.dateIdentifier
        );
      }
    })
    .catch((error) => console.log("Error socket dsfli7dfafa ", error));
};

const editMessageHandler = (token, chatUuid, messageId, message, media) => {
  tokenValidation(token)
    .then((user) => {
      return editMessage(user, chatUuid, messageId, message, media).then(
        (data) => {
          if (data) {
            sendSocketEventToRoom(chatUuid, socketEvents.editMessage, {
              chatUuid,
              messageId,
              message,
              media: data.media,
              miniMedia: data.miniMedia,
            });
          }
        }
      );
    })
    .catch((error) => console.log("Error akfjaiubu5 ", error));
};

const editMessage = (user, chatUuid, messageId, message, media) => {
  try {
    return mongoFindOne("chats", { uuid: chatUuid }).then((chat) => {
      if (chat) {
        let promiseArray = [];
        const found = chat.messages.find(
          (message) => message._id == messageId && message.sender == user.email
        );

        if (found) {
          let setObject = {
            "messages.$.message": message,
            "messages.$.edited": true,
            "messages.$.media": null,
            "messages.$.miniMedia": null,
          };

          let originalFilename = null;
          let imageFilename = null;
          let miniImageFilename = null;

          if (media && !media?.includes("http")) {
            originalFilename = uuidv4() + ".jpeg";
            imageFilename = uuidv4() + ".jpeg";
            miniImageFilename = uuidv4() + ".jpeg";
            setObject["messages.$.media"] = buildGoogleCloudUrl(
              googleCloudMediaBuckets.chatMediaBucket,
              imageFilename
            );
            setObject["messages.$.miniMedia"] = buildGoogleCloudUrl(
              googleCloudMediaBuckets.chatMediaBucket,
              miniImageFilename
            );
          }
          // image is not changed
          else if (media == found.media) {
            setObject["messages.$.media"] = found.media;
            setObject["messages.$.miniMedia"] = found.miniMedia;
          }

          promiseArray.push(
            Chat.findOneAndUpdate(
              { uuid: chatUuid, "messages._id": messageId },
              {
                $set: setObject,
              }
            )
          );

          if (media && !media?.includes("http")) {
            promiseArray.push(
              uploadImageDataToDatabaseWithMiniPicture(
                media,
                originalFilename,
                imageFilename,
                miniImageFilename
              )
            );
          }

          return Promise.all(promiseArray).then(() => {
            return {
              imageFilename,
              miniImageFilename,
              media: setObject["messages.$.media"],
              miniMedia: setObject["messages.$.miniMedia"],
            };
          });
        }
      }
    });
  } catch (error) {
    console.log("Error fiauyfa ", error);
  }
};

const deleteMessageHandler = (token, chatUuid, messageId) => {
  tokenValidation(token)
    .then((user) => {
      return removeMessageFromChat(user, chatUuid, messageId).then(() => {
        sendSocketEventToRoom(chatUuid, socketEvents.deleteMessage, {
          chatUuid,
          messageId,
        });
      });
    })
    .catch((error) => console.log("Error akfjaiubu5 ", error));
};
const removeMessageFromChat = (user, chatUuid, messageId) => {
  try {
    return mongoFindOne("chats", { uuid: chatUuid }).then((chat) => {
      if (chat) {
        return Chat.findOneAndUpdate(
          { uuid: chatUuid, "messages._id": messageId },
          { $set: { "messages.$.isDeleted": true } }
        );
      }
    });
  } catch (error) {
    console.log("Error fiauyfa ", error);
  }
};

const messageSeenHandler = (token, chatUuid) => {
  tokenValidation(token)
    .then((user) => {
      return updateLastMessagesSeenStatus(chatUuid, user.email, true, false);
    })
    .catch((error) => console.log("Error akfjaiubu5 ", error));
};

const updateLastMessagesSeenStatus = (uuid, email, status, shouldUpdateAll) => {
  if (shouldUpdateAll) {
    return Chat.findOneAndUpdate(
      { uuid: uuid },
      { $set: { "chatMembers.$[].lastMessageSeen": status } }
    )
      .then((result) => {
        return Chat.findOneAndUpdate(
          { uuid: uuid, "chatMembers.email": email },
          { $set: { "chatMembers.$.lastMessageSeen": true } }
        );
      })
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log("Error iudfya87&& ", error);
      });
  } else {
    return Chat.findOneAndUpdate(
      { uuid: uuid, "chatMembers.email": email },
      { $set: { "chatMembers.$[].lastMessageSeen": status } },
      { new: true }
    )
      .then((result) => {
        return result;
      })
      .catch((error) => {
        console.log("Error iudfya87&& ", error);
      });
  }
};

const newCommentHandler = (eventId, comment, token, uuid) => {
  let time = new Date().toUTCString();
  let user;

  tokenValidation(token)
    .then((userData) => {
      user = userData;
      return addComment(eventId, comment, user, time, uuid);
    })
    .then((newUuid) => {
      sendSocketEventToRoom(eventId, socketEvents.newComment, {
        author: {
          email: user.email,
          username: user.username,
          picture: user?.microMedia,
        },
        comment,
        time,
        replyToUuid: uuid,
        uuid: newUuid,
      });
    })
    .catch((error) => {
      console.log("Error socket gisoff87aa ", error);
    });
};

module.exports = {
  newMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  messageSeenHandler,
  newCommentHandler,
};

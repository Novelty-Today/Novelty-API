const {
  createPrivateChat,
  buildPrivateChatData,
  createGroupChat,
  buildGroupChatData,
  updateUserStatusInChat,
} = require("./ChatCreationFunctions");

const buildChatData = (req, chat, event, user, dateIdentifier) => {
  return new Promise((resolve, reject) => {
    try {
      let lastMessageSeen;
      if (chat?.chatMembers) {
        chat.chatMembers.forEach((element) => {
          if (element.email == req.user.email) {
            lastMessageSeen = element.lastMessageSeen;
          }
        });
      }

      if (user) {
        // build private chat
        if (chat) {
          resolve(buildPrivateChatData(chat, user, lastMessageSeen));
        }
        // create new private chats
        else {
          return createPrivateChat([
            { email: req.user.email, username: req.user.username },
            { email: user.email, username: user.username },
          ])
            .then((newChatObject) => {
              resolve(buildPrivateChatData(newChatObject, user, true));
            })

            .catch((error) => {
              console.log("Error aiuafa ", error);
              reject("fail");
            });
        }
      } else if (event) {
        // build group chat

        if (chat) {
          return updateUserStatusInChat(req, chat)
            .then((chatData) => {
              resolve(buildGroupChatData(chatData, event, lastMessageSeen));
            })
            .catch((error) => {
              console.log("nvuriydr24", error);
              reject("fail");
            });
        }
        // create new group chat
        else {
          return createGroupChat(event, dateIdentifier)
            .then((chat) => {
              resolve(buildGroupChatData(chat, event, true));
            })
            .catch((error) => {
              console.log("nvuriyr24", error);
              reject("fail");
            });
        }
      } else {
        reject("fail");
        console.log("dncjv vr", error);
      }
    } catch (error) {
      console.log("Error afoafyafa ", error);
      reject("fail");
    }
  });
};

module.exports = {
  buildChatData,
};

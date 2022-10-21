const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
const { MY_SECRET_KEY } = require("../constants");
const { getAllDataForApp } = require("../functions/appStartupFunctions");
const { shouldUserSeeOnboarding } = require("../functions/authFunctions");
const {
  mongoFindOneSpecificField,
  mongoFindOne,
  mongoFindOneAndUpdate,
} = require("../functions/mongodbDriver");
const { showUpdateAlert } = require("../functions/taskStringCodes");
const { getAllChatUuidList } = require("./ChatSockets");
const { sendSocketEventToUsers, socketEvents } = require("./SocketFunctions");

const tokenValidation = (token, getOnlyEmail = false) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, MY_SECRET_KEY, (error, payload) => {
      if (error) {
        reject(error);
      }
      const { userId } = payload;

      // only email
      if (getOnlyEmail) {
        mongoFindOneSpecificField(
          "users",
          { _id: ObjectId(userId) },
          { email: 1 }
        )
          .then((user) => {
            if (user != null) {
              resolve(user?.email);
            } else {
              reject("invalid token");
            }
          })
          .catch((error) => {
            console.log("Errorjdifgaytfyt ", error);
            reject(error);
          });
      }
      // full user object
      else {
        mongoFindOne("users", { _id: ObjectId(userId) })
          .then((user) => {
            if (user != null) {
              resolve(user);
            } else {
              reject("invalid token");
            }
          })
          .catch((error) => {
            console.log("Errorjdifgaytfyt ", error);
            reject(error);
          });
      }
    });
  });
};

const validateTokenAndChangeUserOnlineStatus = (
  online,
  clientSocket,
  status = null
) => {
  let user;
  return tokenValidation(clientSocket?.handshake?.query?.token)
    .then((userData) => {
      user = userData;

      if (status) {
        console.log(
          `user: ${user?.email}, connection status: ${
            online ? "connected" : "disconnected"
          }, socketId: ${clientSocket.id} port: ${
            process?.env?.NODE_APP_INSTANCE
          }`
        );
      }

      const updateData = online
        ? {
            $addToSet: {
              socketIdList: clientSocket.id,
            },
          }
        : { $pull: { socketIdList: clientSocket.id } };

      return mongoFindOneAndUpdate(
        "users",
        { _id: ObjectId(user._id) },
        updateData,
        { returnDocument: "after" }
      );
    })
    .then(() => {
      return getAllChatUuidList(user?.email);
    })
    .then((uuidList) => {
      if (online) {
        clientSocket.join(uuidList);
      } else {
        uuidList.forEach((uuid) => clientSocket.leave(uuid));
      }

      return user?.email;
    });
};

const handleSocketConnect = (clientSocket) => {
  return tokenValidation(clientSocket?.handshake?.query?.token)
    .then((user) => {
      getAllDataForApp(user, clientSocket?.handshake?.query);

      sendSocketEventToUsers([user], socketEvents.shouldFillFields, {
        shouldFillFields: shouldUserSeeOnboarding(user),
      });

      sendSocketEventToUsers([user], socketEvents.runServerCode, {
        code: showUpdateAlert,
      });
    })
    .catch((error) => {
      console.log("Error auiatyd67fgat ", error);
    });
};

module.exports = {
  tokenValidation,
  validateTokenAndChangeUserOnlineStatus,
  handleSocketConnect,
};

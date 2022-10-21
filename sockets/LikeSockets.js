const mongoose = require("mongoose");
const { mongoFind } = require("../functions/mongodbDriver");
const { emitToClient, socketEvents } = require("./SocketFunctions");
const User = mongoose.model("User");

const getUsersLikedEvent = (eventId, clientSocket) => {
  mongoFind("favorites", { eventId: eventId + "" })
    .then((favorites) => {
      return Promise.all(
        favorites.map((favorite) => {
          return User.findOne({ email: favorite.email }).then((user) => {
            return {
              email: user.email,
              username: user.username,
              media: user?.media,
              microMedia: user?.microMedia,
            };
          });
        })
      );
    })
    .then((usersLiked) => {
      emitToClient(clientSocket, socketEvents.getLikes, { usersLiked });
    })
    .catch((error) => {
      console.log("evnu6y", error);
      return [];
    });
};

module.exports = { getUsersLikedEvent };

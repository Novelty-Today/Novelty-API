const mongoose = require("mongoose");
const User = mongoose.model("User");
const UserConnection = mongoose.model("UserConnection");

const getUserInviters = (email) => {
  return new Promise((resolve, reject) => {
    let inviteAncestors = {
      user: email,
      middleInviters: [],
    };

    const getInviters = (inviter) => {
      return UserConnection.findOne({ user: inviter })
        .then((userConnection) => {
          if (userConnection.inviter) {
            inviteAncestors.middleInviters.push({ email: inviter });
            return getInviters(userConnection.inviter);
          } else {
            inviteAncestors.topInviter = { email: inviter };
          }
        })
        .catch((error) => {
          console.log("Error fai987fa7&& ", error);
        });
    };

    return UserConnection.findOne({ user: email }).then((firstConnection) => {
      inviteAncestors.creationTime = firstConnection?.creationTime;
      if (firstConnection?.inviter) {
        getInviters(firstConnection.inviter).then(() => {
          let promiseArray = [];

          promiseArray.push(
            User.findOne({ email: inviteAncestors.topInviter.email })
              .then((user) => {
                inviteAncestors.topInviter.username = user.username;
                inviteAncestors.topInviter.media = user.media;
                inviteAncestors.topInviter.microMedia = user.microMedia;
              })
              .catch((error) => {
                console.log("Error dfaofiua9+5 ", error);
              })
          );

          inviteAncestors.middleInviters.forEach((element, index) => {
            promiseArray.push(
              User.findOne({ email: element.email })
                .then((user) => {
                  inviteAncestors.middleInviters[index].username =
                    user.username;
                  inviteAncestors.middleInviters[index].media = user.media;
                  inviteAncestors.middleInviters[index].microMedia =
                    user.microMedia;
                })
                .catch((error) => {
                  console.log("Error klafiad7f6a6d76 ", error);
                })
            );
          });

          return Promise.all(promiseArray)
            .then(() => {
              resolve(inviteAncestors);
            })
            .catch((error) => {
              console.log("Error nufia87fa ", error);
              resolve({ user: email, middleInviters: [] });
            });
        });
      } else {
        resolve(inviteAncestors);
      }
    });
  });
};

module.exports = { getUserInviters };

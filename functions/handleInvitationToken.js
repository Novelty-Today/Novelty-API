const jwt = require("jsonwebtoken");
const { MY_SECRET_KEY } = require("../constants");
const {
  validEmailsUniversityNested,
  LIMIT_OF_INVITEES,
} = require("../DataLists/emails");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const UserConnection = mongoose.model("UserConnection");

const decodeToken = (token) => {
  return new Promise((resolve, reject) => {
    if (token) {
      jwt.verify(token, MY_SECRET_KEY, (error, payload) => {
        if (error) {
          console.log("Error aiua Error", error);
          reject(null);
        }
        resolve(payload);
      });
    } else {
      reject(null);
    }
  });
};

const getConnection = (email) => {
  return UserConnection.findOne({ user: email })
    .then((connection) => {
      if (connection.inviter) {
        return connection.inviter;
      }
      return null;
    })
    .catch((error) => {
      console.log("Error euiayf7a8 ", error);
      return null;
    });
};

const getAllAncestors = (email) => {
  return new Promise((resolve, reject) => {
    let ancestorsList = [];

    const func = (email) => {
      getConnection(email).then((ancestor) => {
        if (ancestor) {
          if (!ancestorsList.includes(`@${ancestor.split("@")[1]}`)) {
            ancestorsList.push(`@${ancestor.split("@")[1]}`);
          }
          func(ancestor);
        } else {
          resolve(ancestorsList);
        }
      });
    };
    func(email);
  });
};

const handleInvitationToken = (invitationToken, email) => {
  return new Promise((resolve, reject) => {
    let payload;
    decodeToken(invitationToken)
      .then((result) => {
        payload = result;
        return UserConnection.findOne({ user: email });
      })
      .then((userConnection) => {
        if (!userConnection) {
          return Promise.all([
            UserConnection.findOneAndUpdate(
              { user: payload.inviter },
              { $addToSet: { children: email } },
              { upsert: true }
            ),
            UserConnection.create({
              inviter: payload.inviter,
              user: email,
              children: [],
              creationTime: new Date().toUTCString(),
            }),
          ])
            .then((data) => {
              if (payload.inviter) {
                let ancestorComunities = [];
                return getAllAncestors(payload.inviter).then((list) => {
                  ancestorComunities.push(...list);
                  if (
                    !ancestorComunities.includes(
                      `@${payload.inviter.split("@")[1]}`
                    )
                  ) {
                    ancestorComunities.push(
                      `@${payload.inviter.split("@")[1]}`
                    );
                  }
                  return ancestorComunities;
                });
              } else {
                // payload.inviter is null or empty here, following code will throw an exception

                //const ancestorComunities = [
                //  `@${payload.inviter.split("@")[1]}`,
                //];
                //return ancestorComunities;

                return [];
              }
            })
            .then((ancestorComunities) => {
              return User.findOneAndUpdate(
                { email: email },
                { $set: { ancestorComunities: ancestorComunities } }
              );
            })
            .then(() => {
              resolve(payload.inviter);
            });
        }
      })
      .catch((error) => {
        console.log("Error asifua987f65 ", error);
        resolve(null);
      });
  });
};

const isInvitationLinkValid = (invitationToken) => {
  return new Promise((resolve, reject) => {
    let payload;
    decodeToken(invitationToken)
      .then((result) => {
        payload = result;
        return UserConnection.findOne({ user: payload.inviter });
      })
      .then((userConnection) => {
        if (userConnection) {
          let nonStanfordInvitees = 0;
          userConnection.children.forEach((child) => {
            if (
              !validEmailsUniversityNested[0].includes(
                `@${child.split("@")[1]}`
              )
            ) {
              nonStanfordInvitees++;
            }
          });
          if (userConnection.user == "koreli@stanford.edu") {
            resolve(true);
          } else {
            resolve(nonStanfordInvitees < LIMIT_OF_INVITEES);
          }
        } else {
          resolve(true);
        }
      })
      .catch((error) => {
        console.log("Error sasgsifua987f65 ", error);
        resolve(false);
      });
  });
};

module.exports = {
  handleInvitationToken,
  isInvitationLinkValid,
  decodeToken,
};

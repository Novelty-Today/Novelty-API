const { mongoFindOne } = require("./mongodbDriver");
const {
  earnNovelties,
} = require("./noveltyTokenFunctions/updateCoinFunctions");

const findAccountInviterAndGiveBonus = (user) => {
  mongoFindOne("userconnections", { children: user.email })
    .then((userConnection) => {
      if (userConnection) {
        return mongoFindOne("users", { email: userConnection.user });
      }
    })
    .then((inviterUserObj) => {
      if (inviterUserObj) {
        earnNovelties(inviterUserObj, "invitedUser", true, 0, {
          email: user.email,
          username: user.username,
        });
      }
    })
    .catch((error) => {
      console.log("Error asayugftadt ", error);
    });
};

module.exports = {
  findAccountInviterAndGiveBonus,
};

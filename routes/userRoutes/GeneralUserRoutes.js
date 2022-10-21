const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const Order = mongoose.model("Order");
const jwt = require("jsonwebtoken");
const { requireAuth } = require("../../middlewares/requireAuth");
const { getGreetingMessage } = require("../../functions/users");
const {
  earnNovelties,
} = require("../../functions/noveltyTokenFunctions/updateCoinFunctions");
const {
  findAccountInviterAndGiveBonus,
} = require("../../functions/inviteFriendFunctions");
const {
  mongoFindOne,
  mongoFind,
  mongoFindSpecificField,
  mongoFindOneAndUpdate,
} = require("../../functions/mongodbDriver");
const { MY_SECRET_KEY } = require("../../constants");
const { htmlPage } = require("../../miniHTMLpages/htmlPagePaths");

router.post("/getUsernamesFromEmails", requireAuth, (req, res) => {
  mongoFind("users", { email: { $in: req.body.emails } })
    .then((users) => {
      let usernames = [];
      users.forEach((user) => {
        usernames.push(user.username);
      });

      res.send({ status: "success", usernames });
    })
    .catch((error) => {
      console.log("Error aoiguay8ft ", error);
      res.send({ status: "fail", usernames: [] });
    });
});

router.post("/finishOnBoarding", requireAuth, (req, res) => {
  let gainedNoveltyTokens = 0;
  if (!req.user.finishedOnBoarding) {
    return Promise.all([
      getGreetingMessage(req.user),
      earnNovelties(req.user, "fillOnboardingInfo", true),
      findAccountInviterAndGiveBonus(req.user),
    ])
      .then(([greeting, noveltiesObj, inviterBonus]) => {
        gainedNoveltyTokens = noveltiesObj.gainedNoveltyTokens;
        return User.findOneAndUpdate(
          { email: req.user.email },
          {
            $set: {
              finishedOnBoarding: true,
            },
          }
        );
      })
      .then((user) => {
        res.send({
          status: "success",
          gainedNoveltyTokens: gainedNoveltyTokens,
        });
      })
      .catch((error) => {
        console.log("Error Y&%^$O ", error);
        res.send({ status: "fail" });
      });
  } else {
    res.send({ status: "success" });
  }
});

router.post("/deleteAccount", requireAuth, (req, res) => {
  const deletedAccountData = {
    username: "",
    description: "",
    location: "",
    geometry: {},
    interests: [],
    favorites: [],
    connectedAccounts: [],
    media: null,
    miniMedia: null,
    microMedia: null,
    expoPushTokensList: [],
    notifications: [],
    squareId: "",
    currentEventNumber: 0,
    paymentHistory: [],
    events: [],
    paymentMethods: [],
    accountStatus: "deleted",
    emailConfirmed: false,
  };

  User.findOneAndUpdate(
    { email: req.user.email },
    { $set: deletedAccountData }
  ).then(() => {
    let promiseArray = [];

    req.user.events.forEach((event) => {
      promiseArray.push(Event.findByIdAndDelete(event));
      promiseArray.push(Order.deleteMany({ eventId: event }));
    });

    return Promise.all(promiseArray)
      .then(() => {
        res.send({ message: "success" });
      })
      .catch((error) => {
        res.send({ message: "fail" });
      });
  });
});

router.post("/getPendingUsers", requireAuth, (req, res) => {
  mongoFindSpecificField(
    "users",
    { role: "pendingUser" },
    { email: 1, username: 1, microMedia: 1 },
    req.body.limit ?? 30,
    req.body.skip ?? 0,
    true
  )
    .then((usersData) => {
      let users = [];

      usersData.forEach((user) => {
        users.push({
          email: user.email,
          username: user.username,
          picture: user.microMedia,
        });
      });

      res.send({ status: "success", users: users });
    })
    .catch((error) => {
      console.log("Error adigyatdg76 ", error);
      res.send({ status: "fail", users: [] });
    });
});

router.get("/getAdminInfo", requireAuth, (req, res) => {
  mongoFindOne("users", { email: "koreli@stanford.edu" })
    .then((user) => {
      res.send({
        status: "success",
        adminData: {
          email: user?.email,
          username: user?.username,
          picture: user?.microMedia,
        },
      });
    })
    .catch((error) => {
      console.log("Error siudag76yt ", error);
      res.send({ status: "fail", adminData: {} });
    });
});

router.get("/unsubscribeEmail/:token", (req, res) => {
  jwt.verify(req.params.token, MY_SECRET_KEY, async (error, payload) => {
    if (error || !payload?.email) {
      console.log("Error gaduyga", error);
      res.sendFile(htmlPage.somethingWentWrong);
    } else {
      mongoFindOneAndUpdate(
        "users",
        { email: payload?.email },
        { $set: { unsubscribedMail: true } }
      )
        .then(() => {
          res.sendFile(htmlPage.emailUnsubscribed);
        })
        .catch((error) => {
          console.log("Error aoufy87^%$& ", error);
          res.sendFile(htmlPage.somethingWentWrong);
        });
    }
  });
});

module.exports = router;

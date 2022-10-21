const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const { pendingUserAccepted } = require("../sockets/ChatSockets");
const { requireAuth } = require("../middlewares/requireAuth");
const { sendJustPushNotification } = require("../functions/notifications");

router.post("/acceptPendingUser", requireAuth, (req, res) => {
  try {
    if (req.user.role == "admin") {
      const myCommunity = "@" + req.user.email.split("@")[1];
      return Promise.all([
        User.findOneAndUpdate(
          { email: req.body.email },
          {
            $addToSet: { ancestorComunities: myCommunity },
            $set: { role: "user" },
          }
        ),
        Event.updateMany(
          { organiser: req.body.email },
          { $addToSet: { forCommunities: myCommunity } }
        ),
        Event.updateMany(
          { organiser: req.body.email },
          { $pull: { forCommunities: "pendingUser" } }
        ),
      ]).then((data) => {
        pendingUserAccepted(req.body.email);
        sendJustPushNotification(
          req.body.email,
          "You are now part of novelty app",
          "",
          { type: "acceptedInCommunity" }
        );

        res.send({
          status: "success",
          message: `${data[0].username} is now part of your community.`,
        });
      });
    } else {
      res.send({ status: "fail", message: "You are not admin" });
    }
  } catch (error) {
    console.log("Error iufdsffay ", error);
    res.send({ status: "fail", message: error });
  }
});

router.post("/waitlistPendingUser", requireAuth, (req, res) => {
  try {
    if (req.user.role == "admin") {
      const myCommunity = "@" + req.user.email.split("@")[1];
      return Promise.all([
        User.findOneAndUpdate(
          { email: req.body.email },
          {
            $set: { role: "waitlistedUser" },
          }
        ),
        Event.updateMany(
          { organiser: req.body.email },
          { $pull: { forCommunities: "pendingUser" } }
        ),
      ]).then((data) => {
        res.send({
          status: "success",
          message: `${data[0].username} is waitlisted.`,
        });
      });
    } else {
      res.send({ status: "fail", message: "You are not admin" });
    }
  } catch (error) {
    console.log("Error iufdsffay ", error);
    res.send({ status: "fail", message: error });
  }
});

module.exports = router;

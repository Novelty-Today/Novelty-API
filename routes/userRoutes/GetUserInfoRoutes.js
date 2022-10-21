const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { requireAuth } = require("../../middlewares/requireAuth");
const {
  getDrivingPolyline,
  getNearbyPlaces,
} = require("../../functions/generalFunctions");
const { getUserInviters } = require("../../functions/userConnectionFunctions");

router.get("/getUsersInfo/:email", requireAuth, (req, res) => {
  User.findOne({ email: req.params.email })
    .then((user) => {
      if (user) {
        getUserInviters(user.email).then((inviteAncestors) => {
          res.send({
            media: user.media,
            username: user.username,
            email: user.email,
            location: user.location,
            description: user.description,
            interests: user.interests,
            organiserInterests: req.user.interests,
            inviteAncestors: inviteAncestors,
            socialIntegrations: user.socialIntegrations,
          });
        });
      } else {
        res.send({});
      }
    })
    .catch((error) => {
      console.log("Error afjaehorcao3er3r338rr5+99", error);
      return res.send({
        message: "fail",
      });
    });
});

router.get("/getPolyline/:latitude/:longitude", requireAuth, (req, res) => {
  if (req.user.geometry) {
    getDrivingPolyline(
      req.user.geometry.coordinates[1],
      req.user.geometry.coordinates[0],
      req.params.latitude,
      req.params.longitude
    ).then((result) => {
      res.send(result);
    });
  } else {
    res.send([]);
  }
});

router.post("/getNearbyPlaces", requireAuth, (req, res) => {
  const text = req.body.text;
  const radius = req.body.radius;
  getNearbyPlaces(
    req.user?.geometry?.coordinates[1],
    req.user?.geometry?.coordinates[0],
    text,
    radius
  ).then((result) => {
    res.send(result);
  });
});

module.exports = router;

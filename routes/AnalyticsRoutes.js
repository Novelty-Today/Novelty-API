const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/requireAuth");
const mongoose = require("mongoose");
const AnalyticData = mongoose.model("AnalyticData");
const { amplitudeClient } = require("../constants");

router.post("/analytics", requireAuth, (req, res) => {
  let activity = {
    type: req.body.type,
    dateTime: req.body.dateTime,
    timeZone: req.body.timeZone,
    extraData: req.body.extraData,
  };

  AnalyticData.updateOne(
    { email: req.user.email },
    { $addToSet: { activities: { ...activity } } },
    { upsert: true, new: true }
  )
    .then(() => {
      amplitudeClient?.logEvent({
        time: new Date().getTime(),
        session_id: req.body.session_id,
        event_type: activity.type,
        event_properties: activity,
        user_id: req.user.email,
        user_properties: {
          deviceOs: req.user.deviceOs,
          device: req.user.device,
          nativeAppVersion: req.user.nativeAppVersion,
        },
      });
      res.send({ message: "success" });
    })
    .catch((error) => {
      // console.log("vkf45", error);
      res.send({ message: "failure" });
    });
});
module.exports = router;

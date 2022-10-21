const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Feedback = mongoose.model("Feedback");
const ErrorLog = mongoose.model("ErrorLog");
const { requireAuth } = require("../middlewares/requireAuth");

router.post("/addFeedback", requireAuth, (req, res) => {
  try {
    const feedback = new Feedback({
      email: req.user.email,
      text: req.body.text,
      stars: req.body.stars,
      dateTime: new Date().toUTCString(),
    });
    Feedback.insertMany([feedback]);
    res.send({ message: "successs" });
  } catch (error) {
    console.log("Error idarialercla4374633++", error);
    res.send({ message: error });
  }
});

router.post("/logErrors", requireAuth, (req, res) => {
  const errorLog = new ErrorLog({
    email: req.user.email,
    date: new Date().toUTCString(),
    errorCode: req.body.errorCode,
    error: req.body.error,
    deviceInfo: req.body.deviceInfo,
  });
  ErrorLog.insertMany([errorLog]);
  res.send({ status: "saved" });
});

module.exports = router;

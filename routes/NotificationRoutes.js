const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const User = mongoose.model("User");
const { requireAuth } = require("../middlewares/requireAuth");
const {
  handleFeedbackAboutYouNotification,
  handleGeneralNotification,
  handleGeneralNotificationWithEvent,
  handlePrivateEventGuestRequestAnswer,
  handleGeneralNotificationMiniEvent,
  handleConfirmationNotification,
} = require("../functions/notificationInfoFunctions");
const { mongoFindOneAndUpdate } = require("../functions/mongodbDriver");

router.post("/changeNotificationStatus", requireAuth, (req, res) => {
  const updateCommand = req.body.changeAll
    ? { $set: { "notifications.$[].status": req.body.status } } // this updates all notifications
    : { $set: { "notifications.$.status": req.body.status } }; // this updates only on index found with _id in find query

  const searchCommand = req.body.changeAll
    ? { email: req.user.email }
    : {
        email: req.user.email,
        "notifications._id": ObjectId(req.body.notificationId),
      };

  mongoFindOneAndUpdate("users", searchCommand, updateCommand)
    .then((result) => {
      res.send({ message: "success" });
    })
    .catch((error) => {
      console.log("Error a aeha^^^&& ", error);
      res.send({ message: "fail" });
    });
});

router.post("/requestNotificationPaid", requireAuth, (req, res) => {
  User.findOneAndUpdate(
    { email: req.user.email, "notifications._id": req.body.id },
    { $set: { "notifications.$.extraData.paid": true } }
  )
    .then(() => {
      res.send({ status: "success" });
    })
    .catch((error) => {
      console.log("Error ajbhajg ".error);
      res.send({ status: "fail" });
    });
});

router.post("/getNotificationInfo", requireAuth, (req, res) => {
  if (req.body.notificationType == "eventUploadFinish") {
    handleGeneralNotification(req, res);
  }
  /////
  else if (
    req.body.notificationType == "eventCapacityReached" ||
    req.body.notificationType == "ticketSold" ||
    req.body.notificationType == "invitationOnActivity"
  ) {
    handleGeneralNotificationWithEvent(req, res);
  }
  /////
  else if (req.body.notificationType == "feedbackAboutYou") {
    handleFeedbackAboutYouNotification(req, res);
  }
  /////
  else if (req.body.notificationType == "privateEventGuestRequestAnswer") {
    handlePrivateEventGuestRequestAnswer(req, res);
  }
  //
  else if (req.body.notificationType == "removedFromGuests") {
    handleGeneralNotificationMiniEvent(req, res);
  }
  //
  else if (
    req.body.notificationType == "participationConfirmation" ||
    req.body.notificationType == "likeToGoToActivity" ||
    req.body.notificationType == "waitlistReadyToGo"
  ) {
    handleConfirmationNotification(req, res, req.user.email);
  } else if (req.body.notificationType == "placeToPriorityWaitlist") {
    handleConfirmationNotification(req, res, req.body.email);
  }
  /////
  else {
    res.send({ message: "Notification type not found" });
  }
});

module.exports = router;

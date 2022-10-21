const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const {
  scheduleMeeting,
  createZoomUser,
  refreshZoomToken,
  removeZoomUser,
} = require("../functions/zoomFunctions");
const { requireAuth } = require("../middlewares/requireAuth");
const fetch = require("node-fetch");
const { ZOOM_CONFIG } = require("../constants");

router.post("/createZoomUser", requireAuth, (req, res) => {
  createZoomUser(req.user, req.body.zoomEmail, req.body.ignoreExistingAccount)
    .then((result) => {
      console.log(result);
      if (result?.id) {
        res.send({
          status: "invitationNotAccepted",
          message:
            "You need to accept invitation on your email to start using zoom.",
        });
      } else if (result?.id == "") {
        res.send({
          status: "cannotSwitch",
          message:
            "You need to follow invitation instructions on your email to start using zoom.",
        });
      } else if (result?.message?.includes("User already in the account")) {
        res.send({
          status: "accessNotGranted",
        });
      } else {
        res.send({ message: "Something went wrong. Please try again." });
      }
    })
    .catch((error) => {
      console.log("Error ajfgu ", error);
      res.send({ message: "Something went wrong. Please try again." });
    });
});

router.post("/removeZoomUser", requireAuth, (req, res) => {
  removeZoomUser(req.user.email)
    .then(() => {
      res.send({
        status: "success",
        message: "Zoom account has been disconnected.",
      });
    })
    .catch((error) => {
      console.log("Error adifat65 ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/getZoomTokens", requireAuth, (req, res) => {
  const url = `https://zoom.us/oauth/token?grant_type=authorization_code&code=${req.body.code}&redirect_uri=${ZOOM_CONFIG.redirect_uri}`;
  let accessToken;
  let refreshToken;

  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          ZOOM_CONFIG.clientId + ":" + ZOOM_CONFIG.clientSecret
        ).toString("base64"),
    },
  })
    .then((result) => {
      return result.json();
    })
    .then((result) => {
      accessToken = result.access_token;
      refreshToken = result.refresh_token;
      return User.findOneAndUpdate(
        { email: req.user.email },
        {
          $set: {
            "zoomConnection.accessToken": result.access_token,
            "zoomConnection.refreshToken": result.refresh_token,
            "zoomConnection.zoomEmail": req.body.zoomEmail,
          },
        }
      );
    })
    .then(() => {
      res.send({
        status: "success",
        accessToken: accessToken,
        refreshToken: refreshToken,
        zoomEmail: req.user.zoomConnection.zoomEmail,
      });
    })
    .catch((error) => {
      console.log("Error fdddjah ", error);
      res.send({
        status: "fail",
      });
    });
});

router.get("/scheduleZoomMeeting", requireAuth, (req, res) => {
  let accessToken;
  refreshZoomToken(req.user.zoomConnection?.refreshToken, req.user.email)
    .then((accessTokenResult) => {
      accessToken = accessTokenResult;
      if (accessToken) {
        return scheduleMeeting(
          req.user.zoomConnection.zoomEmail,
          accessToken
        ).then((meetingUrl) => {
          res.send({ status: "success", meetingUrl: meetingUrl });
        });
      } else {
        res.send({
          status: "accessNotGranted",
          message:
            "Access not granted. Please login in your zoom account again.",
        });
      }
    })
    .catch((error) => {
      console.log("Error &^$V^E% ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

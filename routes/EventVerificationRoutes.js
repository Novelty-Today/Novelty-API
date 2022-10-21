const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const EventFeedback = mongoose.model("EventFeedback");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../middlewares/requireAuth");
const { multipleUploadNew } = require("../middlewares/mediaUpload");
const { legitQuestions } = require("../Models/EventFeedback");
const {
  getEventVerificationInfo,
  getAlreadyStaked,
  startVerificationIfFeedbackCompleted,
  getPendingVerifications,
} = require("../functions/noveltyTokenFunctions/verifyEvents");
const {
  checkEventVerificationCompleted,
} = require("../functions/noveltyTokenFunctions/finishVerification");
const {
  mongoFindOne,
  mongoFindOneAndUpdate,
  mongoFindOneSpecificField,
} = require("../functions/mongodbDriver");
const {
  stakeNovelties,
  earnNovelties,
  notifyUserAboutTokensUpdate,
} = require("../functions/noveltyTokenFunctions/updateCoinFunctions");
const {
  multipleMediaProcessing,
} = require("../functions/multipleMediaProcessing/multipleMediaProcessing");
const { googleCloudMediaBuckets } = require("../constants");
const {
  getCanWriteFeedback,
} = require("../functions/verificationFlowCheckers");

router.post("/startEventFeedback", requireAuth, (req, res) => {
  getCanWriteFeedback(req.body.eventId, req.body.dateIdentifier, req.user.email)
    .then((canWriteFeedback) => {
      if (canWriteFeedback.canWrite) {
        res.send({ status: "success" });
      } else {
        res.send({
          status: "fail",
          message:
            canWriteFeedback.reason ??
            "Something went wrong. Please try again.",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post(
  "/createEventFeedback",
  requireAuth,
  multipleUploadNew,
  (req, res) => {
    const {
      eventId,
      dateIdentifier,
      rating,
      textFeedbacks,
      MediaFilenamesArray,
    } = req.body;

    let questions = [];

    JSON.parse(textFeedbacks || "[]")?.forEach((textFeedback) => {
      if (legitQuestions.includes(textFeedback?.question) || true) {
        questions.push(textFeedback);
      }
    });

    mongoFindOne("eventfeedbacks", {
      eventId: eventId,
      dateIdentifier: dateIdentifier,
      email: req.user.email,
    })
      .then((feedback) => {
        if (!feedback) {
          return multipleMediaProcessing(
            MediaFilenamesArray,
            googleCloudMediaBuckets.feedbackMediaBucket
          )
            .then(([mediaArray, miniMediaArray]) => {
              const eventFeedback = new EventFeedback({
                uuid: uuidv4(),
                email: req.user.email,
                eventId,
                dateIdentifier,
                rating: isNaN(parseInt(rating)) ? -1 : parseInt(rating),
                questions,
                mediaArray,
                miniMediaArray,
                uploadTime: new Date().toUTCString(),
              });

              return Promise.all([
                EventFeedback.insertMany([eventFeedback]),
                mongoFindOneSpecificField(
                  "events",
                  { _id: ObjectId(eventId) },
                  { organiser: 1, name: 1, miniMediaArray: 1 }
                ),
              ]);
            })
            .then(([savedFeedback, event]) => {
              if (event.organiser != req.user.email) {
                return earnNovelties(req.user, "writeFeedback", false, 0, {
                  eventId,
                  eventName: event?.name,
                  eventMedia: event?.miniMediaArray?.[0],
                });
              }
            })
            .then((novelties) => {
              startVerificationIfFeedbackCompleted(eventId, dateIdentifier);
              res.send({
                status: "success",
                gainedNoveltyTokens: novelties?.gainedNoveltyTokens ?? 0,
              });
            });
        } else {
          res.send({
            status: "fail",
            gainedNoveltyTokens: 0,
            message: "Feedback is already written.",
          });
        }
      })

      .catch((error) => {
        res.send({ status: "fail" });
        console.log("Error adgioauygad ", error);
      });
  }
);

router.get("/getPendingVerifications", requireAuth, (req, res) => {
  getPendingVerifications(req.user)
    .then((result) => {
      res.send({
        ...result,
        status: "success",
      });
    })
    .catch((error) => {
      console.log("Errors auiaga ", error);
      res.send({
        status: "fail",
        pendingVerifications: [],
        answeredVerifications: [],
        earnUpTo: 0,
      });
    });
});

router.post("/stake", requireAuth, (req, res) => {
  let status, message, verification;

  mongoFindOne("eventverifications", {
    eventId: req.body.eventId,
    dateIdentifier: req.body.dateIdentifier,
  })
    .then((verificationData) => {
      verification = verificationData;
      const verifier = getAlreadyStaked(req.user.email, verification.verifiers);

      // already verified
      if (verification?.verificationStatus != "pending") {
        status = "fail";
        message = "Verification is already completed.";
      }
      // already staked
      else if (verifier) {
        status =
          verifier?.validated == "none" && !verifier?.stakeTimedOut
            ? "success"
            : "fail";
        message = verifier?.stakeTimedOut
          ? "You can no longer verify event because your stake was timed out."
          : verifier?.validated == "none"
          ? "Already Staked."
          : "Already verified by you.";
      }
      // verifiers list is full
      else if (
        verification.numberOfVerifiers ==
        verification.verifiers.filter((item) => !item.stakeTimedOut).length
      ) {
        status = "fail";
        message = "Verifiers pool is already full.";
      }
      // staking
      else {
        return stakeNovelties(
          req.user,
          req.body.eventId,
          req.body.dateIdentifier,
          verification.stakeRequired
        )
          .then((result) => {
            status = result.status;
            message = result.message;

            if (status == "success") {
              notifyUserAboutTokensUpdate(
                req.user,
                req.user.crypto.noveltyTokens - verification.stakeRequired,
                0,
                false
              );
            }
          })
          .catch((error) => {
            console.log("Error ga9yg8a ", error);
            status = "fail";
            message = "Something went wrong. Please try again.";
          });
      }
    })
    .then(() => {
      if (status == "success") {
        return getEventVerificationInfo(
          req.body.eventId,
          req.body.dateIdentifier,
          req.user.email,
          verification
        );
      }
    })
    .then((verificationInfo) => {
      res.send({ status, message, verificationInfo });
    })
    .catch((error) => {
      console.log("Error aiuigfuya8ty ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/verifyEvent", requireAuth, (req, res) => {
  mongoFindOne("eventverifications", {
    eventId: req.body.eventId,
    dateIdentifier: req.body.dateIdentifier,
  })
    .then((verification) => {
      const verifier = getAlreadyStaked(req.user.email, verification.verifiers);

      if (verifier.validated == "none") {
        return mongoFindOneAndUpdate(
          "eventverifications",
          {
            eventId: req.body.eventId,
            dateIdentifier: req.body.dateIdentifier,
            "verifiers.email": req.user.email,
          },
          { $set: { "verifiers.$.validated": req.body.validated } }
        ).then(() => {
          checkEventVerificationCompleted(
            req.body.eventId,
            req.body.dateIdentifier
          );

          res.send({
            status: "success",
            message: "You verified event.",
          });
        });
      } else if (verifier) {
        res.send({
          status: "success",
          message: "You have already answered this question.",
        });
      } else {
        res.send({
          status: "fail",
          message: "You have not staked $NC yet.",
        });
      }
    })
    .catch((error) => {
      console.log("Error adgiaya87d ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const fs = require("fs");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const User = mongoose.model("User");
const { mongoFindOne } = require("../functions/mongodbDriver");

router.get("/getEventPreviewMedia/:eventId", (req, res) => {
  try {
    if (
      req.params.eventId &&
      req.params.eventId.toLocaleLowerCase() != "undefined"
    ) {
      mongoFindOne("events", {
        _id: ObjectId(req.params.eventId),
      }).then((event) => {
        if (event && event?.miniMediaArray?.[0]?.includes("http")) {
          res.redirect(event.miniMediaArray[0]);
        } else {
          res.send({ message: "media file not found" });
        }
      });
    } else {
      res.send({ message: "media file not found" });
    }
  } catch (error) {
    console.log("Error aufy87^^*& ", error);
    res.send({ message: "media file not found" });
  }
});

router.get("/getUserMedia/:email/:size", (req, res) => {
  if (
    req.params.size == "normal" ||
    req.params.size == "mini" ||
    req.params.size == "micro"
  ) {
    User.findOne({ email: req.params.email })
      .then((userData) => {
        if (userData) {
          if (req.params.size == "normal") {
            return userData.media;
          } else if (req.params.size == "mini") {
            return userData.miniMedia;
          } else {
            return userData.microMedia;
          }
        } else {
          return null;
        }
      })
      .then((mediaFilename) => {
        if (mediaFilename && mediaFilename?.includes("http")) {
          res.redirect(mediaFilename);
        } else {
          res.send({ message: "media file not found" });
        }
      });
  } else {
    res.send({ message: `media size can be "normal", "mini" or "micro"` });
  }
});

router.get("/getLogo", (req, res) => {
  const filename = `${process.cwd()}/NoveltyLogo.png`;
  fs.createReadStream(filename).pipe(res);
});

module.exports = router;

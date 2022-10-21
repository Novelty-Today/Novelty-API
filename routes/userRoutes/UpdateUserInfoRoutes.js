const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { googleCloudMediaBuckets } = require("../../constants");
const { requireAuth } = require("../../middlewares/requireAuth");
const {
  resizeImg,
  notifyUserAboutPictureUpdate,
  buildSocialMediaProfileUrl,
} = require("../../functions/users");
const {
  multipleUploadNew,
  mediaUpload,
} = require("../../middlewares/mediaUpload");
const {
  uploadMediaToGoogleCloud,
  buildGoogleCloudUrl,
} = require("../../services/gcp-storage");
const {
  multipleMediaProcessing,
} = require("../../functions/multipleMediaProcessing/multipleMediaProcessing");
const {
  updateUsernameInChats,
} = require("../../functions/ChatCreationFunctions");

router.post(
  "/updateUserInformation",
  requireAuth,
  multipleUploadNew,
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    multipleMediaProcessing(
      req.body.MediaFilenamesArray,
      googleCloudMediaBuckets.userMediaBucket
    )
      .then((filenames) => {
        const username =
          (req.body.name ?? "") + " " + (req.body.lastname ?? "");
        let newData = {
          name: req.body.name ?? "",
          lastname: req.body.lastname ?? "",
          username: username,
          location: req.body.location ?? "",
          gender: req.body.gender ?? "",
          description: req.body.description ?? "",
          interests: JSON.parse(req.body.interests || "[]"),
          mediaArray: [],
          socialIntegrations: [],
          major: req.body.major,
          classYear: req.body.classYear,
          clubAffiliations: JSON.parse(req.body.clubAffiliations || "[]"),
        };

        JSON.parse(req.body.socialIntegrations || "[]")?.forEach((element) => {
          if (element.profileUrl && element.profileUrl != "") {
            newData.socialIntegrations.push({
              type: element.type,
              id: uuidv4(),
              username: "",
              profileUrl: buildSocialMediaProfileUrl(element),
            });
          }
        });

        const removeMediaArray = JSON.parse(req.body.removeMedia || "[]");

        for (var i = 0; i < req.user.mediaArray.length; i++) {
          if (
            !removeMediaArray.includes(req.user.mediaArray[i].normal) &&
            !removeMediaArray.includes(req.user.mediaArray[i].mini)
          ) {
            newData.mediaArray.push({
              normal: req.user.mediaArray[i].normal,
              mini: req.user.mediaArray[i].mini,
            });
          }
        }

        for (var i = 0; i < filenames[0].length; i++) {
          newData.mediaArray.push({
            normal: filenames[0][i],
            mini: filenames[1][i],
          });
        }

        return Promise.all([
          User.findOneAndUpdate({ email: req.user.email }, newData, {
            new: true,
          }),
          updateUsernameInChats(req.user.email, username, req.user.username),
        ]);
      })
      .then(([user, chatUpdate]) => {
        let userData = {
          name: user.name,
          lastname: user.lastname,
          username: user.username,
          location: user.location,
          gender: user.gender,
          description: user.description,
          interests: user.interests,
          mediaArray: user.mediaArray,
          socialIntegrations: user.socialIntegrations,
          major: user.major,
          classYear: user.classYear,
          clubAffiliations: user.clubAffiliations,
        };

        res.send({ status: "success", newData: userData });
      })
      .catch((error) => {
        console.log("eRRO FIAUH ", error);
        res.send({ status: "fail" });
      });
  }
);

router.post("/updateUser", requireAuth, async (req, res) => {
  var newData = {};

  if ("description" in req.body) {
    newData.description = req.body.description;
  }
  if ("name" in req.body) {
    newData.name = req.body.name;
  }
  if ("lastname" in req.body) {
    newData.lastname = req.body.lastname;
  }
  if ("name" in req.body && "lastname" in req.body) {
    newData.username = (req.body.name ?? "") + " " + (req.body.lastname ?? "");
  }
  if ("interests" in req.body) {
    newData.interests = req.body.interests;
  }
  if ("location" in req.body) {
    newData.location = req.body.location;
  }
  if ("clubAffiliations" in req.body) {
    newData.clubAffiliations = req.body.clubAffiliations;
  }
  if ("classYear" in req.body) {
    newData.classYear = req.body.classYear;
  }
  if ("major" in req.body) {
    newData.major = req.body.major;
  }

  return Promise.all([
    updateUsernameInChats(req.user.email, req.body.username, req.user.username),
    User.updateOne({ email: req.user.email }, newData),
  ])
    .then(() => {
      res.send({ message: "updating info of profile done" });
    })
    .catch((error) => {
      console.log("Error afheolca3iyomr83o", error);
      res.send({ message: error });
    });
});

router.post(
  "/addProfilePicture",
  requireAuth,
  mediaUpload.single("media"),
  async (req, res) => {
    res.send({ message: "Adding picture" });
    const mediaPath = `./tempMedia/media/${req.body.MediaFilename}`;
    const miniMediaPath = `./tempMedia/mediaMini/${req.body.miniMediaFilename}`;
    const microMediaPath = `./tempMedia/mediaMicro/${req.body.microMediaFilename}`;
    const oldMedia = [req.user.media, req.user.miniMedia, req.user.microMedia];

    let filename = null;
    let microFilename = null;

    Promise.all([
      resizeImg(req.file.fieldname == "media", mediaPath, miniMediaPath, 500),
      resizeImg(req.file.fieldname == "media", mediaPath, microMediaPath, 250),
    ])
      .then(() => {
        return Promise.all([
          uploadMediaToGoogleCloud(
            req.body.MediaFilename,
            "./tempMedia/media/",
            googleCloudMediaBuckets.userMediaBucket
          ),
          uploadMediaToGoogleCloud(
            req.body.miniMediaFilename,
            "./tempMedia/mediaMini/",
            googleCloudMediaBuckets.userMediaBucket
          ),
          uploadMediaToGoogleCloud(
            req.body.microMediaFilename,
            "./tempMedia/mediaMicro/",
            googleCloudMediaBuckets.userMediaBucket
          ),
        ]);
      })
      .then(() => {
        let newPictureNames = {
          media: buildGoogleCloudUrl(
            googleCloudMediaBuckets.userMediaBucket,
            req.body.MediaFilename
          ),
          miniMedia: buildGoogleCloudUrl(
            googleCloudMediaBuckets.userMediaBucket,
            req.body.miniMediaFilename
          ),
          microMedia: buildGoogleCloudUrl(
            googleCloudMediaBuckets.userMediaBucket,
            req.body.microMediaFilename
          ),
        };
        filename = newPictureNames.miniMedia;
        microFilename = newPictureNames.microMedia;

        return User.updateOne({ email: req.user.email }, newPictureNames);
      })
      .then(() => {
        fs.unlink(mediaPath, () => {});
        fs.unlink(miniMediaPath, () => {});
        fs.unlink(microMediaPath, () => {});
      })
      .then(() => {
        notifyUserAboutPictureUpdate(
          req.user,
          true,
          req.body.localTaskKey,
          filename,
          microFilename
        );
      })
      .catch((error) => {
        console.log("Error akakecaimhc<>?<?<", error);

        notifyUserAboutPictureUpdate(
          req.user,
          false,
          req.body.localTaskKey,
          filename,
          microFilename
        );
      });
  }
);

module.exports = router;

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const Favorite = mongoose.model("Favorite");
const { v4: uuidv4 } = require("uuid");
const { requireAuth } = require("../../middlewares/requireAuth");
const { buildSocialMediaProfileUrl } = require("../../functions/users");
const { getNumbersFromString } = require("../../functions/generalFunctions");
const { sendNewFavoriteInSocket } = require("../../sockets/EventSockets");

router.post("/updateNotificationToken", requireAuth, (req, res) => {
  let alreadyAdded = false;

  req.user?.expoPushTokensList?.forEach?.((element) => {
    if (element?.devicePushToken == req.body?.tokenAndOs?.devicePushToken) {
      alreadyAdded = true;
    }
  });

  if (alreadyAdded) {
    res.send({ message: "Updated Notification Token List" });
  } else {
    User.findOneAndUpdate(
      { email: req.user.email },
      { $addToSet: { expoPushTokensList: [req.body.tokenAndOs] } }
    )
      .then((user) => {
        res.send({ message: "Updated Notification Token List" });
      })
      .catch((error) => {
        res.send({ message: "Could not find user with provided ID" });
      });
  }
});

router.post("/signOutRemoveExpoToken", requireAuth, (req, res) => {
  if (req.body.expoPushToken) {
    User.findOneAndUpdate(
      { email: req.user.email },
      {
        $pull: {
          expoPushTokensList: {
            devicePushToken: req.body.expoPushToken.data,
          },
        },
      }
    )
      .then(() => {
        res.send({ message: "success" });
      })
      .catch((error) => {
        console.log("Error afkahlca3ma83r5+95", error);
        res.send({ message: error });
      });
  } else {
    return res.send({
      message: "put expoPushToken in body",
    });
  }
});

router.post("/pushOrPullFavorites", requireAuth, (req, res) => {
  // adding to favorites
  if (req.body.pushOrPull === "push") {
    const favorite = new Favorite({
      eventId: req.body.eventId,
      email: req.user.email,
      dateTime: new Date().toUTCString(),
    });

    Favorite.findOne({ eventId: req.body.eventId, email: req.user.email })
      .then((favoriteData) => {
        if (favoriteData) return null;
        else {
          return Promise.all([
            Event.findOneAndUpdate(
              { _id: req.body.eventId },
              { $inc: { likesCount: 1 } }
            ),
            Favorite.insertMany([favorite]),
          ]);
        }
      })
      .then((favoriteData) => {
        if (favoriteData)
          sendNewFavoriteInSocket(req.user, req.body.eventId, true);
        res.send({ status: "success", message: "Marked as favorite" });
      })
      .catch((error) => {
        console.log("Error in marking favorite: ", error);
        res.send({ status: "failed", message: "Failed to mark favorite" });
      });
  }
  // removing from favorites
  else if (req.body.pushOrPull === "pull") {
    return Promise.all([
      Event.findOneAndUpdate(
        { _id: req.body.eventId },
        { $inc: { likesCount: -1 } }
      ),
      Favorite.deleteMany({
        eventId: req.body.eventId,
        email: req.user.email,
      }),
    ])
      .then(() => {
        sendNewFavoriteInSocket(req.user, req.body.eventId, false);
        res.send({ status: "success", message: "Unmarked from favorites" });
      })
      .catch((error) => {
        console.log("Error in unmarking favorite: ", error);
        res.send({ status: "failed", message: "Failed to unmark favorite" });
      });
  }
});

router.post("/updateUserGeometry", requireAuth, (req, res) => {
  User.findOneAndUpdate(
    { email: req.user.email },
    {
      $set: {
        "geometry.coordinates": [req.body.longitude, req.body.latitude],
        "geometry.type": "Point",
      },
    }
  )
    .then(() => {
      res.send({ message: "success" });
    })
    .catch((error) => {
      console.log("Error afajrfaoc38r3arc964", error);
      res.send({ message: "fail" });
    });
});

router.post("/updatePhoneContactsList", requireAuth, (req, res) => {
  let existingContacts = req.user.phoneContacts;

  let newContacts = [];

  const getEmails = (emails) => {
    let list = [];
    emails.forEach((element) => {
      list.push({ label: element.label, email: element.email });
    });
    return list;
  };

  const getAddresses = (emails) => {
    let list = [];
    emails.forEach((element) => {
      list.push({
        label: element.label,
        address: element.formattedAddress,
      });
    });
    return list;
  };

  req.body.contactsList.forEach((element) => {
    if (element.phoneNumbers[0]) {
      const newContactObject = {
        phone: getNumbersFromString(element.phoneNumbers[0].number),
        givenName: element.givenName,
        middleName: element.middleName,
        familyName: element.familyName,
        jobTitle: element.jobTitle,
        postalAddresses: getAddresses(element.postalAddresses),
        emails: getEmails(element.emailAddresses),
      };
      newContacts.push(newContactObject);
      existingContacts.forEach((element, index) => {
        if (element.phone == newContactObject.phone) {
          existingContacts.splice(index, 1);
        }
      });
    }
  });

  User.findOneAndUpdate(
    { email: req.user.email },
    { $set: { phoneContacts: [...existingContacts, ...newContacts] } }
  )
    .then(() => {
      res.send({ status: "success" });
    })
    .catch((error) => {
      console.log("Error afojiyi8766 ", error);
    });
});

router.post("/removeSocialIntegration", requireAuth, (req, res) => {
  try {
    let found = false;
    let socialIntegrations = [];
    req.user?.socialIntegrations?.forEach((element) => {
      if (!(element.type == req.body.type && element.id == req.body.id)) {
        socialIntegrations.push(element);
      } else {
        found = true;
      }
    });
    if (found) {
      User.findOneAndUpdate(
        { email: req.user.email },
        { $set: { socialIntegrations: socialIntegrations } }
      )
        .then(() => {
          res.send({ status: "success" });
        })
        .catch((error) => {
          res.send({ status: fail, message: error });
        });
    } else {
      res.send({ status: "fail", message: "type or id incorrect" });
    }
  } catch (error) {
    console.log("Error afahfua ", error);
    res.send({ status: "fail", message: error });
  }
});

router.post("/addSocialAccounts", requireAuth, (req, res) => {
  let socialIntegrations = [];
  req.body.socialIntegrations.forEach((element) => {
    if (element.profileUrl && element.profileUrl != "") {
      socialIntegrations.push({
        type: element.type,
        id: uuidv4(),
        username: "",
        profileUrl: buildSocialMediaProfileUrl(element),
      });
    }
  });

  return User.findOneAndUpdate(
    { email: req.user.email },
    {
      $set: {
        socialIntegrations: socialIntegrations,
      },
    },
    {
      new: true,
    }
  )
    .then((user) => {
      res.send({
        status: "success",
        socialIntegrations: user.socialIntegrations,
      });
    })
    .catch((error) => {
      res.send(error);
    });
});

module.exports = router;

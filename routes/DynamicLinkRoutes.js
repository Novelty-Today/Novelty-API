const express = require("express");
const router = express.Router();
const { MY_SECRET_KEY } = require("../constants");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const { requireAuth } = require("../middlewares/requireAuth");
const {
  getDynamicLink,
  getDynamicLinkFromData,
} = require("../functions/dynamicLinkFunctions");
const {
  getDynamicLinkBody,
  getHttpsRequestOptions,
} = require("../functions/dynamicLinkFunctions");
const UserConnection = require("../Models/UserConnection");
const {
  validEmailsUniversityNested,
  LIMIT_OF_INVITEES,
} = require("../DataLists/emails");
const { mongoFindOneSpecificField } = require("../functions/mongodbDriver");

router.post("/getPayloadFromToken", requireAuth, (req, res) => {
  jwt.verify(req.body.token, MY_SECRET_KEY, (error, payload) => {
    if (error) {
      console.log("Error goaiugyiada8f", error);
      res.send({ status: "fail", error });
    }

    res.send({ status: "success", payload });
  });
});

// sending user link to share with friends
router.get("/invitePeopleToApp", requireAuth, (req, res) => {
  let link;
  let nonStanfordInvitees = 0;
  const token = jwt.sign(
    { type: "invitePeople", inviter: req.user.email },
    MY_SECRET_KEY
  );
  const body = getDynamicLinkBody(`invitationToken=${token}`);
  const httpsData = new TextEncoder().encode(JSON.stringify(body));
  const options = getHttpsRequestOptions(httpsData);

  return getDynamicLink(httpsData, options)
    .then((dynamicLink) => {
      link = dynamicLink;

      return UserConnection.findOne({ user: req.user.email });
    })
    .then((userConnection) => {
      if (userConnection) {
        userConnection.children.forEach((child) => {
          if (
            !validEmailsUniversityNested[0].includes(`@${child.split("@")[1]}`)
          ) {
            nonStanfordInvitees++;
          }
        });
      }
    })
    .then(() => {
      res.send({
        link: link,
        nonStanfordInvitees: nonStanfordInvitees,
        limitOfInvitees:
          req.user.email == "koreli@stanford.edu" ||
          req.user.email.includes("@novelty")
            ? 10000
            : LIMIT_OF_INVITEES,
      });
    })
    .catch((error) => {
      console.log("Error aijfya876787 ", error);
      res.send({ link: null });
    });
});

router.get("/getEventShareLink/:eventId", (req, res) => {
  mongoFindOneSpecificField(
    "events",
    { _id: ObjectId(req.params.eventId) },
    { name: 1, description: 1, miniMediaArray: 1 }
  )
    .then((event) => {
      return getDynamicLinkFromData(
        "event",
        req.params.eventId,
        false,
        event.name,
        event.description,
        event.miniMediaArray[0]
      );
    })
    .then((dynamicLink) => {
      res.send({ status: "success", link: dynamicLink });
    })
    .catch((error) => {
      console.log("Error GADOUYGA8I7 ", error);
      res.send({ status: "fail", link: null });
    });
});

module.exports = router;

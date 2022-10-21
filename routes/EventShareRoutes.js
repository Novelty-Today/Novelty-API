const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/requireAuth");
const { mongoFindSpecificField } = require("../functions/mongodbDriver");
const {
  isAcceptedCoOrganiser,
  getGuest,
} = require("../functions/guestGetterFunctions");
const {
  isDateObjectOld,
  compareTwoDateObjects,
} = require("../functions/dateComparisons");

router.post("/userInvitationActivities", requireAuth, (req, res) => {
  mongoFindSpecificField(
    "events",
    {
      isOld: false,
      displayOnHomeScreen: true,
      $or: [{ organiser: req.user.email }, { "guests.email": req.user.email }],
      organiser: { $ne: req.body.email },
    },
    {
      _id: 1,
      name: 1,
      dateObjects: 1,
      miniMediaArray: 1,
      guests: 1,
      lastModified: 1,
      organiser: 1,
    }
  )
    .then((events) => {
      let eventsList = [];
      events.forEach((event) => {
        const isCoHost = isAcceptedCoOrganiser(event.guests, req.user.email);
        if (isCoHost || event.organiser == req.user.email) {
          event.dateObjects.forEach((dateObject) => {
            if (!isDateObjectOld(dateObject)) {
              eventsList.push({
                eventId: event._id + "",
                name: event.name,
                dateObject: dateObject,
                lastModified: event.lastModified,
                miniMediaArray: event.miniMediaArray,
                guest: getGuest(
                  event,
                  req.body.email,
                  dateObject.dateIdentifier
                ),
              });
            }
          });
        }
      });

      eventsList.sort((a, b) => {
        return compareTwoDateObjects(a.dateObject, b.dateObject);
      });

      res.send({ status: "success", eventsList: eventsList });
    })
    .catch((error) => {
      console.log("Error siastb6u ", error);
      res.send({ status: "fail", eventsList: [] });
    });
});

module.exports = router;

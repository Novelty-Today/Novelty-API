const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
  createNotificationCalendarPermission,
} = require("../functions/createNotificationFunctions");
const {
  getFreeSlots,
  getBusySlots,
  formatSuggestionDates,
} = require("../functions/userCalendarFunctions");
const UserCalendar = mongoose.model("UserCalendar");
const Event = mongoose.model("Event");
const { requireAuth } = require("../middlewares/requireAuth");

router.post("/addEventsInCalendar", requireAuth, (req, res) => {
  let events = []; 

  req.body.events.forEach((event) => {
    if (
      isNaN(Date.parse(event.startDate)) == false && // checking if start date is legit date
      isNaN(Date.parse(event.endDate)) == false // checking if end date is legit date
    ) { 
      events.push({
        title: event.title,
        location: event.location,
        startDate: new Date(event.startDate).toUTCString(),
        endDate: new Date(event.endDate).toUTCString(),
      });
    }
  });

  UserCalendar.findOneAndUpdate(
    { email: req.user.email },
    { $set: { events: events } },
    { upsert: true }
  )
    .then(() => {
      res.send({ status: "success" });
    })
    .catch((error) => {
      console.log("Error djfah ", error);
    });
});

router.post("/getFreeSlots", requireAuth, (req, res) => {
  const eventId = req.body.eventId;
  const dateIdentifier = req.body.dateIdentifier;

  getBusySlots(eventId, dateIdentifier, req.user.email)
    .then((busySlots) => {
      const freeSlots = getFreeSlots(busySlots, req.body.timezoneOffset);
      const formatedSuggestionDates = formatSuggestionDates(
        freeSlots,
        req.body.timezoneOffset
      );

      res.send(formatedSuggestionDates);
    })
    .catch((error) => {
      console.log("Error fdiagf ", error);
      res.send({ status: "fail", message: error });
    });
});

router.post("/askCalendarPermission", requireAuth, (req, res) => {
  Event.findOne({ _id: req.body.eventId })
    .then((event) => {
      if (event) {
        return createNotificationCalendarPermission(event, req.body.email);
      }
    })
    .then(() => {
      res.send({
        status: "success",
        message: "Request for calendar permissions sent successfuly.",
      });
    })
    .catch((error) => {
      console.log("Error adbg%$%^$ ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

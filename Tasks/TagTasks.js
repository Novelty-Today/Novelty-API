const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const { timeTags } = require("../DataLists/generalTagsList");
const { mongoFindSpecificField } = require("../functions/mongodbDriver");
const ObjectId = require("mongodb").ObjectId;
const { isDateObjectOld } = require("../functions/dateComparisons");
const {
  isToday,
  isTommorow,
  isThisWeek,
  isNextWeek,
  getDateInCal,
} = require("../functions/timeTagFunctions");

const updateTimeTagsFunction = (eventId = null) => {
  let filter = {};

  if (eventId) {
    filter._id = ObjectId(eventId);
  }

  mongoFindSpecificField("events", filter, {
    _id: 1,
    dateObjects: 1,
    finishedDateIdentifiers: 1,
    tags: 1,
  })
    .then((events) => {
      let promises = [];
      events.forEach((event) => {
        let timeTagsList = [];
        event?.dateObjects?.forEach((dateObject) => {
          if (dateObject.onlyHas != "none" && !isDateObjectOld(dateObject)) {
            const date = getDateInCal(new Date(dateObject.dateString));
            //today
            if (isToday(date) && !timeTagsList.includes("Today")) {
              timeTagsList.push("Today");
            }
            //tommorow
            else if (isTommorow(date) && !timeTagsList.includes("Tomorrow")) {
              timeTagsList.push("Tomorrow");
            }
            //this week
            if (isThisWeek(date) && !timeTagsList.includes("This week")) {
              timeTagsList.push("This week");
            }
            //next week
            else if (isNextWeek(date) && !timeTagsList.includes("Next week")) {
              timeTagsList.push("Next week");
            }
          }
        });

        event?.tags?.forEach((tag) => {
          if (!timeTags.includes(tag)) {
            timeTagsList.push(tag);
          }
        });

        promises.push(
          Event.findOneAndUpdate(
            { _id: event._id },
            { $set: { tags: timeTagsList } }
          ).catch((error) => {
            console.log("Error difuay7t ", error);
          })
        );
      });
      return Promise.all(promises);
    })
    .catch((error) => {
      console.log("Error adgiatt6t ", error);
    });
};

module.exports = { updateTimeTagsFunction };

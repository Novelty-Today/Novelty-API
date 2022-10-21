const express = require("express");
const mongoose = require("mongoose");
const {
  getNoveltyTokenConfigs,
  getEventAttendanceControlTimes,
} = require("../configs");
const { helperTimes } = require("../functions/helperTimes");
const { mongoFindOne } = require("../functions/mongodbDriver");
const {
  earnNovelties,
} = require("../functions/noveltyTokenFunctions/updateCoinFunctions");
const Event = mongoose.model("Event");
const router = express.Router();

router.get("/config", (req, res) => {
  res.send(helperTimes());
});

router.get("/usersWithActivities", (req, res) => {
  const stanfordEmails = [
    "stanford.edu",
    "alumni.stanford.edu",
    "alumni.gsb.stanford.edu",
  ];

  let peopleWithActivities = {};
  let emailList = [];
  let emailListString = "";

  Event.find({}).then((events) => {
    events.forEach((event) => {
      if (stanfordEmails.includes(event.organiser.split("@")[1])) {
        if (!emailList.includes(event.organiser)) {
          emailList.push(event.organiser);
          peopleWithActivities[event.organiser] = [event.name];
        } else {
          peopleWithActivities[event.organiser].push(event.name);
        }
      }
    });

    emailList.forEach((element, index) => {
      emailListString += `${element}${
        index == emailList.length - 1 ? "" : ", "
      }`;
    });

    res.send({
      peopleWithActivities: peopleWithActivities,
      emailList: emailList,
      emailListString: emailListString,
    });
  });
});

router.get("/giftCoins", (req, res) => {
  const list = [];
  let promiseArray = [];

  list.forEach((email) => {
    promiseArray.push(
      mongoFindOne("users", { email: email }).then((user) => {
        return earnNovelties(user, "gift", true, 0, { amount: 100 });
      })
    );
  });

  Promise.all(promiseArray)
    .then(() => {
      res.send("done");
    })
    .catch((error) => {
      console.log("Error daigta76yt7  ", error);
      res.send("fail");
    });
});

module.exports = router;

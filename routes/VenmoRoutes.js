const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const ObjectId = require("mongodb").ObjectId;
const { createOrder } = require("../functions/orders");
const { v4: uuidv4 } = require("uuid");
const {
  isUserOnline,
  sendSocketEventToUsers,
  socketEvents,
} = require("../sockets/SocketFunctions");
const { mongoFindOne } = require("../functions/mongodbDriver");

router.get("/getVenmoLink/:eventId/:dateIdentifier/:email", (req, res) => {
  let eventId = req?.params?.eventId;
  let dateIdentifier = req?.params?.dateIdentifier;
  let email = req?.params?.email;

  let orderId = uuidv4();

  Promise.all([
    User.findOne({ email }),
    Event.findOne({ _id: ObjectId(eventId) }),
  ])
    .then(([user, event]) => {
      res.render("venmo", {
        price: event?.price,
        orderId,
        eventId,
        dateIdentifier,
        email: user?.email,
      });
    })
    .catch((error) => console.log("fjri3 ", error));
});

router.post("/venmoTransactionSuccess", async (req, res) => {
  let transaction = req?.body?.transaction;

  try {
    await createOrder(req.user, req.body.eventId, req.body.dateIdentifier, 1);
    res.send({ message: "success" });
    const user = await mongoFindOne("users", { email: req.body?.email });

    if (await isUserOnline(user)) {
      sendSocketEventToUsers([user], socketEvents.venmoTransactionSuccess, {
        message: "success",
        transaction,
      });
    }
  } catch (error) {
    console.log("Error ajifhgau ", error);
  }
});

router.post("/venmoTransactionFail", async (req, res) => {
  res.send({ message: "failed" });
  const user = await mongoFindOne("users", { email: req.body?.email });

  if (await isUserOnline(user)) {
    sendSocketEventToUsers([user], socketEvents.venmoTransactionFail, {
      message: "fail",
    });
  }
});

module.exports = router;

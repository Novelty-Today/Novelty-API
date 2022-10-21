const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { requireAuth } = require("../middlewares/requireAuth");

router.post("/addPaymentMethod", requireAuth, (req, res) => {
  let paymentMethod = {
    individualOrCompany: req.body.isIndividual ? "Individual" : "Company",
    address: req.body.paymentInfoData.address,
    city: req.body.paymentInfoData.city,
    state: req.body.paymentInfoData.state,
    postalCode: req.body.paymentInfoData.postalCode,
    accountType: req.body.isChecking ? "Checking" : "Saving",
    bankName: req.body.paymentInfoData.bankName,
    routingNumber: req.body.paymentInfoData.routingNumber,
    accountNumber: req.body.paymentInfoData.accountNumber,
  };

  if (req.body.isIndividual) {
    paymentMethod.name = req.body.paymentInfoData.name;
    paymentMethod.surname = req.body.paymentInfoData.surname;
  } else {
    paymentMethod.companyName = req.body.paymentInfoData.companyName;
  }

  User.findOneAndUpdate(
    { email: req.user.email },
    {
      $set: {
        paymentMethods: [paymentMethod],
      },
    }
  )
    .then(() => {
      res.send({ message: "success" });
    })
    .catch((error) => {
      console.log("Error alfaram&UN*&MFB", error);
    });
});

router.post("/getBankDetails", requireAuth, (req, res) => {
  User.findOne({ email: req.user.email })
    .then((user) => {
      if (user.paymentMethods[0]) {
        res.send(user.paymentMethods[0]);
      } else {
        res.send({ message: "noData" });
      }
    })
    .catch((error) => console.log("Error alfiaejciahroarh&&", error));
});

module.exports = router;

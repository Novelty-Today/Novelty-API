const express = require("express");
const router = express.Router();
const { sendEmail } = require("../services/email");
const { getHTMLstring } = require("../functions/sendMailFunctions");
const { htmlPage } = require("../miniHTMLpages/htmlPagePaths");

router.post("/sendFormToInfoVerifier", (req, res) => {
  const {
    userName,
    userSurname,
    managerName,
    managerSurname,
    organizationName,
    userPosition,
    managerPosition,
    userEmailAddress,
    managerEmailAddress,
    employmentStartDate,
    employmentEndDate,
  } = req.body;

  //
  if (
    userName &&
    userSurname &&
    managerName &&
    managerSurname &&
    organizationName &&
    userPosition &&
    managerPosition &&
    userEmailAddress &&
    managerEmailAddress &&
    employmentStartDate &&
    employmentEndDate
  ) {
    //
    const data = {
      ...req.body,
      employmentStartDate: new Date(employmentStartDate).toDateString(),
      employmentEndDate: new Date(employmentEndDate).toDateString(),
    };

    const htmlString = getHTMLstring(
      htmlPage.verifyWork,
      {
        ...data,
        jsonData: JSON.stringify(data),
      },
      {}
    );

    sendEmail(
      req.body.managerEmailAddress,
      `Verify working experience for - ${userName} ${userSurname}. ${new Date().toUTCString()} `,
      "",
      htmlString
    );

    res.send({ message: "received data" });
  } else {
    res.status(400).send({ message: "missing fields" });
  }
});
module.exports = router;

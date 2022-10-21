const fs = require("fs");
const jwt = require("jsonwebtoken");
const path = require("path");
const { mongoFindOneSpecificField } = require("../functions/mongodbDriver");
const { activityTimeFormater, activityDateFormater } = require("./time");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const { sendEmail } = require("../services/email");
const {
  emailTexts,
  emailSubjectLines,
  getEmailTemplate,
} = require("../DataLists/emailTexts");
const { baseUrl, MY_SECRET_KEY } = require("../constants");

const mailTypes = {
  "1HourKickOutReminder": "1HourKickOutReminder",
  "48HourAttendanceConfirmation": "48HourAttendanceConfirmation",
  "24HourAttendanceConfirmation": "24HourAttendanceConfirmation",
  "48HourWaitlistConfirmation": "48HourWaitlistConfirmation",
  "24HourWaitlistConfirmation": "24HourWaitlistConfirmation",
  resetPassword: "resetPassword",
  eventRequestApproved: "eventRequestApproved",
  eventRequestRejected: "eventRequestRejected",
  eventInvitation: "eventInvitation",
  verifyEvent: "verifyEvent",
  eventFinishedForGuest: "eventFinishedForGuest",
  eventFinishedForHost: "eventFinishedForHost",
  feedbackReminderForGuest: "feedbackReminderForGuest",
  feedbackReminderForHost: "feedbackReminderForHost",
  eventUpdated: "eventUpdated",
  sixHoursLeftTillEvent: "sixHoursLeftTillEvent",
  welcomeToTheNovelty: "welcomeToTheNovelty",
};

const getHTMLstring = (htmlFilePath, texts, values = {}) => {
  const html = fs.readFileSync(path.resolve(htmlFilePath), "utf8");

  let finalHtml = html;

  for (const text in texts) {
    finalHtml = finalHtml.replaceAll(`*|EVENT:${text}|*`, texts[text]);
  }

  for (const value in values) {
    finalHtml = finalHtml.replaceAll(`*|EVENT:${value}|*`, values[value]);
  }

  // for copyright text
  finalHtml = finalHtml.replaceAll(
    `*|EVENT:currentYear|*`,
    new Date().getFullYear().toString()
  );

  return finalHtml;
};

const getDataForMailAndSend = (
  receivers,
  eventType = "",
  event,
  dateIdentifier,
  actionLink = "",
  nameOfActionMaker = "",
  numberOfTokensToEarn = ""
) => {
  let promiseArray = [];

  return Promise.resolve()
    .then(() => {
      if (event?.organiser) {
        return mongoFindOneSpecificField(
          "users",
          { email: event?.organiser },
          { name: 1 }
        );
      }
    })
    .then((host) => {
      receivers.forEach((email) => {
        promiseArray.push(
          mongoFindOneSpecificField(
            "users",
            { email: email },
            { name: 1, lastname: 1, email: 1, unsubscribedMail: 1 }
          ).then((user) => {
            if (!user.unsubscribedMail) {
              const texts = emailTexts[eventType];

              const html = getHTMLstring(
                getEmailTemplate(eventType),
                texts,
                buildProperties(
                  user,
                  nameOfActionMaker,
                  event,
                  dateIdentifier,
                  host,
                  numberOfTokensToEarn,
                  actionLink
                )
              );

              return sendEmail(
                email,
                emailSubjectLines[eventType],
                "novelty.today",
                html
              );
            }
          })
        );
      });

      return Promise.all(promiseArray);
    });
};

const buildProperties = (
  receiverUserObj,
  nameOfActionMaker,
  event,
  dateIdentifier,
  hostUserObj,
  numberOfTokensToEarn,
  actionLink
) => {
  const dateObject =
    event && dateIdentifier
      ? getDateObjectWithIdentifier(event?.dateObjects, dateIdentifier)
      : null;

  return {
    receiverName: receiverUserObj.name ?? "",
    nameOfActionMaker: nameOfActionMaker ?? "",
    eventName: event?.name ?? "",
    hostName: hostUserObj?.name ?? "",
    eventLocation: event?.location ?? "",
    eventDate: dateObject ? activityDateFormater(dateObject, true) : "",
    eventTime: dateObject ? activityTimeFormater(dateObject) : "",
    numberOfTokensToEarn: numberOfTokensToEarn + "",
    actionLink: actionLink ?? "",
    unsubscribeActionLink: getUnsubscribeEmailLink(receiverUserObj.email),
  };
};

const getUnsubscribeEmailLink = (email) => {
  try {
    const token = jwt.sign({ email: email }, MY_SECRET_KEY);

    return `${baseUrl}unsubscribeEmail/${token}`;
  } catch (error) {
    console.log("Error iaufgatyd6 ", error);
    return "";
  }
};

module.exports = { mailTypes, getDataForMailAndSend, getHTMLstring };

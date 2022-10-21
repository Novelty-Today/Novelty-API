const jwt = require("jsonwebtoken");
const {
  noveltyActionsToAmounts,
  baseUrl,
  MY_SECRET_KEY,
  EMAIL_CONFIRMATION_SECRET_KEY,
  eventAttendanceControlTimes,
} = require("../constants");
const {
  compareTwoDateObjects,
  getDateObjectWithIdentifier,
} = require("../functions/dateComparisons");
const { getDynamicLinkFromData } = require("../functions/dynamicLinkFunctions");
const { getGuest } = require("../functions/guestGetterFunctions");
const {
  mailTypes,
  getDataForMailAndSend,
} = require("../functions/sendMailFunctions");

const sendEventRemainderEmails = (emails, event) => {
  return getDynamicLinkFromData("event", event._id + "").then((actionLink) => {
    return getDataForMailAndSend(
      emails,
      mailTypes.sixHoursLeftTillEvent,
      event,
      null,
      actionLink
    );
  });
};

const sendEventUpdateEmail = (
  emails,
  eventAfterUpdate,
  eventBeforeUpdate,
  dateIdentifier,
  updaterUserObj
) => {
  const locationChanged =
    eventBeforeUpdate?.location !== eventAfterUpdate.location;
  const dateChanged =
    compareTwoDateObjects(
      getDateObjectWithIdentifier(
        eventBeforeUpdate?.dateObjects,
        dateIdentifier
      ),
      getDateObjectWithIdentifier(eventAfterUpdate?.dateObjects, dateIdentifier)
    ) != 0;

  if (locationChanged || dateChanged) {
    return getDynamicLinkFromData("event", eventAfterUpdate._id + "")
      .then((actionLink) => {
        return getDataForMailAndSend(
          emails,
          mailTypes.eventUpdated,
          eventAfterUpdate,
          dateIdentifier,
          actionLink,
          updaterUserObj.username
        );
      })
      .catch((error) => {
        console.log("Error diguatf67t ", error);
      });
  }
};

const sendEventFinishedEmails = (
  emails,
  event,
  dateIdentifier,
  hostEmail,
  isReminder = false
) => {
  let actionLink;
  return getDynamicLinkFromData(
    "writeFeedback",
    `eventId:${event?._id + ""},dateIdentifier:${dateIdentifier}`
  )
    .then((linkTemp) => {
      actionLink = linkTemp;

      if (hostEmail) {
        return getDataForMailAndSend(
          [event.organiser],
          isReminder
            ? mailTypes.feedbackReminderForHost
            : mailTypes.eventFinishedForHost,
          event,
          dateIdentifier,
          actionLink,
          null,
          noveltyActionsToAmounts.writeFeedback
        );
      }
    })
    .then(() => {
      return getDataForMailAndSend(
        emails,
        isReminder
          ? mailTypes.feedbackReminderForGuest
          : mailTypes.eventFinishedForGuest,
        event,
        dateIdentifier,
        actionLink,
        null,
        noveltyActionsToAmounts.writeFeedback
      );
    })
    .catch((error) => {
      console.log("Error adiguadtf6 ", error);
    });
};

const sendVerifyEventEmails = (
  emails,
  eventId,
  dateIdentifier,
  stakeAmount
) => {
  return Promise.all(
    emails.map((email) => {
      return getDynamicLinkFromData(
        "verifyEvent",
        `eventId:${eventId},dateIdentifier:${dateIdentifier},stakeAmount:${stakeAmount},email:${email}`
      )
        .then((link) => {
          return getDataForMailAndSend(
            [email],
            mailTypes.verifyEvent,
            null,
            null,
            link
          );
        })
        .then(() => {
          return "success";
        })
        .catch((error) => {
          console.log("Error godauyga7fat ", error);
          return "fail";
        });
    })
  );
};

const sendEventInvitationEmail = (email, event, dateIdentifier, actionLink) => {
  return getDataForMailAndSend(
    [email],
    mailTypes.eventInvitation,
    event,
    dateIdentifier,
    actionLink
  );
};

const sendRequestAnsweredEmail = (event, dateIdentifier, email, status) => {
  return getDataForMailAndSend(
    [email],
    status == "accepted"
      ? mailTypes.eventRequestApproved
      : mailTypes.eventRequestRejected,
    event,
    dateIdentifier
  );
};

const sendResetPasswordEmail = (email, actionLink) => {
  return getDataForMailAndSend(
    [email],
    mailTypes.resetPassword,
    null,
    null,
    actionLink
  );
};

const sentAttendanceConfirmationEmail = (
  email,
  dateObject,
  leftTime,
  event,
  notificationId,
  extraData
) => {
  const token = jwt.sign(
    { email, notificationId, ...extraData },
    MY_SECRET_KEY
  );

  return Promise.resolve()
    .then(() => {
      if (
        extraData.price > 0 &&
        extraData.type == "participationConfirmation"
      ) {
        return getDynamicLinkFromData("eventPayment", token);
      } else {
        return `${baseUrl}attendanceConfirmation/${email}/${notificationId}`;
      }
    })
    .then((actionLink) => {
      return getDataForMailAndSend(
        [email],
        getMailTypeForAttendanceConfirmation(
          event,
          email,
          dateObject.dateIdentifier,
          leftTime
        ),
        event,
        dateObject.dateIdentifier,
        actionLink
      );
    });
};

const getMailTypeForAttendanceConfirmation = (
  event,
  email,
  dateIdentifier,
  leftTime
) => {
  const guest = getGuest(event, email, dateIdentifier);

  if (leftTime == eventAttendanceControlTimes.notifyGuestBeforeFirst) {
    if (guest.status == "waitlisted" && guest.addedBy != "user") {
      return mailTypes["48HourWaitlistConfirmation"];
    } else {
      return mailTypes["48HourAttendanceConfirmation"];
    }
  } else if (leftTime == eventAttendanceControlTimes.notifyGuestBeforeSecond) {
    if (guest.status == "waitlisted" && guest.addedBy != "user") {
      return mailTypes["24HourWaitlistConfirmation"];
    } else {
      return mailTypes["24HourAttendanceConfirmation"];
    }
  } else if (
    leftTime == eventAttendanceControlTimes.reminderBeforeGuestsRemoval
  ) {
    return mailTypes["1HourKickOutReminder"];
  }
};

const sendConfirmationEmail = (email) => {
  const token = jwt.sign({ email }, EMAIL_CONFIRMATION_SECRET_KEY);
  const actionLink = `${baseUrl}confirm-email/${token}`;

  return getDataForMailAndSend(
    [email],
    mailTypes.welcomeToTheNovelty,
    null,
    null,
    actionLink
  ).catch((error) => {
    console.log("Error in sending confirmation link: ", error);
  });
};

module.exports = {
  sendEventRemainderEmails,
  sendEventUpdateEmail,
  sendEventFinishedEmails,
  sendVerifyEventEmails,
  sendEventInvitationEmail,
  sendRequestAnsweredEmail,
  sendResetPasswordEmail,
  sentAttendanceConfirmationEmail,
  sendConfirmationEmail,
};

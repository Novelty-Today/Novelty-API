const { createNotificationTasks } = require("../Tasks/NotificationTasks");
const { listRelevantUserAboutEvent } = require("./findRelevantUsers");
const { activityDateTimeFormat } = require("./time");
const {
  getGuestEmailsPromise,
  getGuestEmails,
} = require("./guestGetterFunctions");
const {
  sendEventFinishedEmails,
  sendRequestAnsweredEmail,
  sentAttendanceConfirmationEmail,
  sendEventInvitationEmail,
} = require("../services/sendAllEmailTypes");
const { sendSMS } = require("./awsFunctions");
const {
  generateDynamicLinkForInvitation,
} = require("./InvitationDynamicLinkFunctions");
const { createWriteFeedbackAlertTask } = require("../Tasks/WriteFeedbackTask");
const {
  giveTokenText,
} = require("./noveltyTokenFunctions/noveltyTokenHelperFunctions");

const createNotificationActivityInfoUpdated = (event) => {
  const title = event?.name;
  const message = "Event information has been updated.";
  const extraData = {
    type: "activityUpdated",
    eventId: event?._id + "",
    notificationTime: new Date().toUTCString(),
  };

  try {
    getGuestEmailsPromise(event, null, null, false, true)
      .then((notificationRecievers) => {
        return createNotificationTasks(
          notificationRecievers,
          title,
          message,
          extraData
        );
      })
      .catch((error) => {
        console.log("Error adfatbuy6ur ", error);
      });
  } catch (error) {
    console.log("Error aidgftab65 ", error);
  }
};

const createNotificationActivityAdded = (eventData, user, forCommunities) => {
  return listRelevantUserAboutEvent(eventData, user, forCommunities)
    .then((emailList) => {
      const message = `${
        user?.username == "" ? user?.email : user?.username
      } added new event: ${eventData?.name}`;

      const extraData = {
        type: "newEventAdded",
        eventId: eventData?._id,
        notificationTime: new Date().toUTCString(),
      };

      return createNotificationTasks(
        emailList,
        "New event",
        message,
        extraData
      );
    })
    .catch((error) => {
      console.log("error fafafa ", error);
    });
};

const createNotificationInvitationAnswered = (
  event,
  dateIdentifier,
  inviterEmail,
  invitedGuest
) => {
  const extraData = {
    type: "invitationOnActivityAnswered",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    email: invitedGuest?.email,
    notificationTime: new Date().toUTCString(),
    invitedAs: invitedGuest.coHost ? "coHost" : "guest",
  };

  return createNotificationTasks(
    [inviterEmail],
    event?.name,
    `${invitedGuest.username} answered your invitation`,
    extraData
  ).catch((error) => {
    console.log("Error tqw454 ", error);
  });
};

const createNotificationLeftEvent = (
  event,
  dateIdentifier,
  email,
  username
) => {
  const extraData = {
    type: "leftEvent",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    email: email,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [event.organiser],
    event?.name,
    `${username} left the event.`,
    extraData
  ).catch((error) => {
    console.log("Error tqw454 ", error);
  });
};

const createNotificationActivityRequest = (event, dateIdentifier, user) => {
  const title = event?.name;
  const message = `${
    user?.username ? user?.username : user?.email
  } requested to join event ${event?.name}`;
  const extraData = {
    type: "privateEventGuestRequest",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    email: user?.email,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [event.organiser],
    title,
    message,
    extraData
  ).catch((error) => {
    console.log("Error adfatbuy6ur ", error);
  });
};

const createNotificationActivityInvitation = (
  event,
  dateIdentifier,
  invitedAs,
  invitedEmail,
  phone,
  inviterUserObj
) => {
  // send by sms or email
  sendInvitetionByMailOrSms(
    event,
    dateIdentifier,
    invitedEmail,
    phone,
    invitedAs
  );

  const extraData = {
    type: "invitationOnActivity",
    eventId: event?._id + "",
    organiser: event?.organiser,
    email: inviterUserObj?.email,
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
    invitedAs: invitedAs,
  };

  return createNotificationTasks(
    [invitedEmail],
    event?.name,
    invitedAs == "guest"
      ? `${inviterUserObj?.username} invites you to the event`
      : `${inviterUserObj?.username} invites you as co-host to the event`,
    extraData
  ).catch((error) => {
    console.log("Error adfat21buy6ur ", error);
  });
};

const sendInvitetionByMailOrSms = (
  event,
  dateIdentifier,
  email,
  phone,
  invitedAs
) => {
  // send invitation outside the app
  return generateDynamicLinkForInvitation(
    event?._id + "",
    dateIdentifier,
    invitedAs == "coHost" ? "addCoHost" : "addGuest",
    email,
    phone
  )
    .then((link) => {
      if (link) {
        if (email) {
          return sendEventInvitationEmail(
            email,
            event,
            invitedAs == "coHost"
              ? event?.dateObjects[0].dateIdentifier
              : dateIdentifier,
            link
          );
        }
        if (phone) {
          return sendSMS(phone, `You were invited to event ${link}`);
        }
      }
    })
    .catch((error) => {
      console.log("Error aib867v ", error);
    });
};

const createNotificationRemovedFromGuests = (
  event,
  dateIdentifier,
  guestEmail,
  hostData
) => {
  const extraData = {
    type: "removedFromGuests",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [guestEmail],
    event?.name,
    `${hostData?.username} removed you from event participants.`,
    extraData
  ).catch((error) => {
    console.log("Error adfat21buy6ur ", error);
  });
};

const createNotificationCapacityReached = (event, dateIdentifier) => {
  const extraData = {
    type: "eventCapacityReached",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };
  return createNotificationTasks(
    [event.organiser],
    `The event is full`,
    `All spots have been reserved for ${event.name}`,
    extraData
  ).catch((error) => {
    console.log("Error adfatvw45buy6ur ", error);
  });
};

const createNotificationRequestAnswered = (
  event,
  dateIdentifier,
  email,
  status
) => {
  //send email
  sendRequestAnsweredEmail(event, dateIdentifier, email, status);

  //send notification

  const text = `You've been ${
    status == "accepted" ? "accepted" : "declined"
  } to join ${event?.name}!`;

  const extraData = {
    type: "privateEventGuestRequestAnswer",
    status: status,
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    name: event?.name,
    email: event?.organiser,
    description: event?.description,
    price: event?.price,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [email],
    `Request ${status == "accepted" ? "approved" : "declined"}.`,
    text,
    extraData
  ).catch((error) => {
    console.log("Error adfa97atbuy6ur ", error);
  });
};

const createNotificationActivityUploaded = (
  email,
  eventId,
  localEventId,
  eventName,
  dateObjects,
  isSuccess
) => {
  const title = isSuccess
    ? `Your event has been added`
    : `Your event upload failed.`;
  const message = isSuccess
    ? `Your event ${eventName} has been added to system.`
    : `Your event ${eventName} upload has failed. Please try again.`;
  const extraData = {
    type: "eventUploadFinish",
    eventId,
    localEventId,
    eventName,
    isSuccess,
    notificationTime: new Date().toUTCString(),
    dateObjects,
  };

  return createNotificationTasks([email], title, message, extraData).catch(
    (error) => {
      console.log("Error aiyt ", error);
    }
  );
};

const createNotificationLocationSpecified = (
  event,
  locationObject,
  recievers
) => {
  const extraData = {
    type: "activityLocationSpecified",
    eventId: event?._id + "",
    locationObject: locationObject,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    recievers,
    "Event location specified.",
    `${event.name} specified to ${locationObject.address}`,
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createRandomVerifierNotifications = (
  recievers,
  eventId,
  dateIdentifier,
  stakeRequired
) => {
  const extraData = {
    type: "verifyEvent",
    eventId: eventId,
    dateIdentifier: dateIdentifier,
    stakeAmount: stakeRequired,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    recievers,
    "Verify event.",
    `Earn $NC by verifing event.`,
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createNotificationEventFinished = (
  event,
  dateIdentifier,
  notifyHost = false
) => {
  const guestsAndHost = getGuestEmails(event, dateIdentifier, true);
  const onlyGuests = getGuestEmails(event, dateIdentifier);

  return createEventFinishedReminderToSpecificPeople(
    event,
    dateIdentifier,
    notifyHost ? guestsAndHost : onlyGuests,
    guestsAndHost,
    onlyGuests,
    notifyHost,
    false
  );
};

const createEventFinishedReminderToSpecificPeople = (
  event,
  dateIdentifier,
  emailsForPopup = [],
  emailsForNotification = [],
  emailsForMail = [],
  notifyHost = false,
  isReminder = false
) => {
  console.log({
    emailsForPopup,
    emailsForNotification,
    emailsForMail,
    notifyHost,
    isReminder,
  });
  // sending popups
  emailsForPopup.forEach((email) => {
    createWriteFeedbackAlertTask(email, event?._id + "", dateIdentifier);
  });

  // sending emails
  sendEventFinishedEmails(
    emailsForMail,
    event,
    dateIdentifier,
    notifyHost ? event.organiser : null,
    isReminder
  );

  // sending notifications
  const extraData = {
    type: "eventFinished",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    emailsForNotification,
    event?.name,
    isReminder
      ? "Write feedback to earn $NC."
      : "Event finished. Write feedback to earn $NC.",
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createNotificationEventVerified = (
  event,
  dateIdentifier,
  gainedNoveltyTokens = 0
) => {
  const extraData = {
    type: "eventVerified",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    gainedNoveltyTokens: gainedNoveltyTokens,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [event.organiser],
    event?.name,
    `Event verified. You received ${gainedNoveltyTokens} $NC.`,
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createNotificationVerificationStakingFinished = (
  eventId,
  email,
  tokenAmount = 0,
  action
) => {
  const extraData = {
    type: "eventVerificationStakingFinished",
    eventId: eventId,
    tokenAmount: tokenAmount,
    action: action,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [email],
    "Verification finished",
    giveTokenText(action, tokenAmount),
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createNotificationInvitedUserJoined = (
  inviterEmail,
  invitedEmail,
  invitedUsername,
  gainedNoveltyTokens = 0
) => {
  const extraData = {
    type: "invitedUserJoined",
    email: invitedEmail,
    gainedNoveltyTokens: gainedNoveltyTokens,
    notificationTime: new Date().toUTCString(),
  };

  const text = `${invitedUsername}, invited by you joined novelty.`;

  return createNotificationTasks(
    [inviterEmail],
    "Friend invitation",
    text,
    extraData
  ).catch((error) => {
    console.log("Error au8tadgfa ", error);
  });
};

const createNotificationDateSpecified = (
  event,
  dateObject,
  dateObjectBeforeUpdate,
  recievers
) => {
  const extraData = {
    type: "activityDateSpecified",
    eventId: event?._id + "",
    dateIdentifier: dateObject?.dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    recievers,
    "Event date specified.",
    `${event?.name}’s time changed from ${activityDateTimeFormat(
      dateObjectBeforeUpdate
    )} to ${activityDateTimeFormat(dateObject)}.`,
    extraData
  ).catch((error) => {
    console.log("Error 4wb6w4 ", error);
  });
};

const createNotificationCalendarPermission = (event, email) => {
  const extraData = {
    type: "askCalendarPermission",
    eventId: event._id + "",
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [email],
    event?.name,
    "Allow calendar access for better date suggestions",
    extraData
  ).catch((error) => {
    console.log("Error g7and6g8da ", error);
  });
};

const createNotificationPriorityWaitlist = (event, dateObject, user) => {
  const extraData = {
    email: user?.email,
    username: user?.username,
    eventId: event?._id + "",
    dateIdentifier: dateObject?.dateIdentifier,
    name: event?.name,
    dateObject: dateObject,
    miniMedia: event?.miniMediaArray[0],
    type: "placeToPriorityWaitlist",
    notificationTime: new Date().toUTCString(),
  };
  return createNotificationTasks(
    [event?.organiser],
    `${user?.username} is ready to go.`,
    `Accept ${user?.username} to priority waitlist?`,
    extraData
  ).catch((error) => {
    console.log("Error 4wb5w5232 ", error);
  });
};

const createNotificationFeedback = (eventId, dateIdentifier, user, email) => {
  const extraData = {
    type: "feedbackAboutYou",
    eventId: eventId,
    dateIdentifier: dateIdentifier,
    reviewer: user?.email,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [email],
    `Feedback from ${
      user?.username && user?.username != "" ? user?.username : user?.email
    }`,
    `${
      user?.username && user?.username != "" ? user?.username : user?.email
    } left a feedback about you. To read feedback you need to write it back.`,
    extraData
  ).catch((error) => {
    console.log("Error a8na6da ", error);
  });
};

// contains notifications with types: "participationConfirmation", "likeToGoToActivity", "waitlistReadyToGo", "autoDeletedFromGuests"
const createNotificationActivityAttendanceConfirmation = (
  type,
  event,
  dateObject,
  text,
  email
) => {
  const extraData = {
    type,
    eventId: event?._id + "",
    dateIdentifier: dateObject?.dateIdentifier,
    location: event?.location,
    name: event?.name,
    price: event?.price,
    location: event?.location,
    dateObject: dateObject,
    miniMedia: event?.miniMediaArray[0],
    description: event?.description,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks([email], event?.name, text, extraData)
    .then((notifications) => {
      if (type == "participationConfirmation" || type == "likeToGoToActivity") {
        return sentAttendanceConfirmationEmail(
          email,
          dateObject,
          dateObject.notifyTime,
          event,
          notifications?.[0]?.notification?._id + "",
          extraData
        );
      }
    })
    .catch((error) => {
      console.log("Error adfaauitbuy6ur ", error);
    });
};

const createNotificationTicketSold = (event, dateIdentifier, buyerName) => {
  const extraData = {
    type: "ticketSold",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(
    [event?.organiser],
    event?.name,
    `ticket was bought by ${buyerName}`,
    extraData
  ).catch((error) => {
    console.log("Error adfa3322tbuy6ur ", error);
  });
};

const createNotificationEventRemainder = (
  receivers,
  event,
  dateIdentifier,
  text
) => {
  const extraData = {
    type: "eventRemainder",
    eventId: event?._id + "",
    dateIdentifier: dateIdentifier,
    notificationTime: new Date().toUTCString(),
  };

  return createNotificationTasks(receivers, event?.name, text, extraData).catch(
    (error) => {
      console.log("Error adfa3322tbuy6ur ", error);
    }
  );
};

module.exports = {
  createNotificationActivityInfoUpdated,
  createNotificationActivityAdded,
  createNotificationInvitationAnswered,
  createNotificationActivityRequest,
  createNotificationActivityInvitation,
  createNotificationCapacityReached,
  createNotificationRequestAnswered,
  createNotificationActivityUploaded,
  createNotificationLocationSpecified,
  createNotificationDateSpecified,
  createNotificationCalendarPermission,
  createNotificationPriorityWaitlist,
  createNotificationFeedback,
  createNotificationActivityAttendanceConfirmation,
  createNotificationTicketSold,
  createNotificationRemovedFromGuests,
  createNotificationEventFinished,
  createEventFinishedReminderToSpecificPeople,
  createNotificationEventVerified,
  createNotificationVerificationStakingFinished,
  createNotificationInvitedUserJoined,
  createNotificationLeftEvent,
  createRandomVerifierNotifications,
  createNotificationEventRemainder,
};

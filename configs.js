const hourInMs = 60 * 60 * 1000;
const minuteInMs = 60 * 1000;

const getIosPushNotificationsApi = (environment) => {
  return "https://api.push.apple.com:443";
  // if (environment == "debug") {
  //   return "https://api.development.push.apple.com:443";
  // } else {
  //   return "https://api.push.apple.com:443";
  // }
};

const getNoveltyTokenConfigs = (environment) => {
  if (environment == "debug") {
    return {
      stepOneVerification: 0.6, // what part of people should vote same answer to finish verification
      eventAutoFinishTime: 10 * minuteInMs, // if host does not finish event we finish automatically
      stakeFirstReminderTime: 3 * minuteInMs, // after stake if you do not answer final verification question we send email and popup
      stakeSecondReminderTime: 6 * minuteInMs, // after stake if you do not answer final verification question we send popup
      stakeTimeout: 9 * minuteInMs, // after stake if you do not answer final question you will lose tokens after this time
      verificationStartingTime: 20 * minuteInMs, // after event finish we automaticaly start verification after this time
      minimumTokenRequirementForRandomVerifier: 50, // randomly chosen verifier should have at least this number of tokens
      feedbackWriteMaxTime: 25 * minuteInMs, // maximum time user is able to write feedback after event finish
      feedbackReminderTime: 5 * minuteInMs, // after event finish we remind people to write feedback
      randomVerifierLastActiveDate: 15 * minuteInMs, // verifier we chose randomly must be active in last 15 minute
      maxNumberOfVerifiers: 3, // maximum number of verifiers that can participate in verification of one event
      stakeRequiredToVerifyEvent: 8, // stake required from user to submit verification of event
    };
  } else {
    return {
      stepOneVerification: 0.6, // what part of people should vote same answer to finish verification
      eventAutoFinishTime: 6 * hourInMs, // if host does not finish event we finish automatically
      stakeFirstReminderTime: 2 * hourInMs, // after stake if you do not answer final verification question we send email and popup
      stakeSecondReminderTime: 3.5 * hourInMs, // after stake if you do not answer final verification question we send popup
      stakeTimeout: 4 * hourInMs, // after stake if you do not answer final question you will lose tokens after this time
      verificationStartingTime: 24 * hourInMs, // after event finish we automaticaly start verification after this time
      minimumTokenRequirementForRandomVerifier: 8, // randomly chosen verifier should have at least this number of tokens
      feedbackWriteMaxTime: 10 * 24 * hourInMs, // maximum time user is able to write feedback after event finish
      feedbackReminderTime: 6 * hourInMs, // after event finish we remind people to write feedback
      randomVerifierLastActiveDate: 30 * 24 * hourInMs, // verifier we chose randomly must be active in last 30 days
      maxNumberOfVerifiers: 3, // maximum number of verifiers that can participate in verification of one event
      stakeRequiredToVerifyEvent: 8, // stake required from user to submit verification of event
    };
  }
};

const getEventAttendanceControlTimes = (environment) => {
  if (environment == "debug") {
    return {
      notifyGuestBeforeFirst: 20 * minuteInMs, // ask user to confirm attendance if not already confirmed
      notifyGuestBeforeSecond: 17 * minuteInMs, // ask user to confirm attendance if not already confirmed
      reminderBeforeGuestsRemoval: 15 * minuteInMs, // reminder to confirm attendance before removing user
      unconfirmedGuestsRemoval: 13 * minuteInMs, // if user did not confirm attendance we remove him/her from guest
      addingWaitlistedPeople: 10 * minuteInMs, // if event is not full we try to add whitelisted people
      firstRemainder: 6 * minuteInMs, // 6 hours left until event reminder. email and notification
      secondRemainder: 3 * minuteInMs, // 1 hours left until event reminder. only notification
    };
  } else {
    return {
      notifyGuestBeforeFirst: 48 * hourInMs, // ask user to confirm attendance if not already confirmed
      notifyGuestBeforeSecond: 24 * hourInMs, // ask user to confirm attendance if not already confirmed
      reminderBeforeGuestsRemoval: 13 * hourInMs, // reminder to confirm attendance before removing user
      unconfirmedGuestsRemoval: 12 * hourInMs, // if user did not confirm attendance we remove him/her from guest
      addingWaitlistedPeople: 9 * hourInMs, // if event is not full we try to add whitelisted people
      firstRemainder: 6 * hourInMs, // 6 hours left until event reminder. email and notification
      secondRemainder: 1 * hourInMs, // 1 hours left until event reminder. only notification
    };
  }
};

const getNoveltyActionsToAmounts = (environment) => {
  if (environment == "debug") {
    return {
      createActivity: 10,
      fillOnboardingInfo: 15,
      eventVerification: 12,
      writeFeedback: 5,
      invitedUser: 15,
    };
  } else {
    return {
      createActivity: 10,
      fillOnboardingInfo: 15,
      eventVerification: 12,
      writeFeedback: 5,
      invitedUser: 15,
    };
  }
};

const getCloudMediaBuckets = (environment) => {
  if (environment == "debug") {
    return {
      eventMediaBucket: "novelty-event-media",
      userMediaBucket: "novelty-user-profile-media",
      feedbackMediaBucket: "novelty-feedback-media",
      chatMediaBucket: "novelty-messages-media",
      interestsMediaBucket: "novelty-interests-media",
    };
  } else {
    return {
      eventMediaBucket: "novelty-event-media",
      userMediaBucket: "novelty-user-profile-media",
      feedbackMediaBucket: "novelty-feedback-media",
      chatMediaBucket: "novelty-messages-media",
      interestsMediaBucket: "novelty-interests-media",
    };
  }
};

const getNotificationsConfig = (environment) => {
  if (environment == "debug") {
    return {
      timeToIgnoreNotification: 1 * 1000, // 1 sec
    };
  } else {
    return {
      timeToIgnoreNotification: 10 * 60 * 1000, // 10 min
    };
  }
};

module.exports = {
  getIosPushNotificationsApi,
  getNoveltyTokenConfigs,
  getEventAttendanceControlTimes,
  getNoveltyActionsToAmounts,
  getCloudMediaBuckets,
  getNotificationsConfig,
};

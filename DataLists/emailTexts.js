// >> step 1 replace full texts
// headerText;
// bodyText;
// suggestionText;
// footerText;

const { htmlPage } = require("../miniHTMLpages/htmlPagePaths");

// >> step 2 replace variables
// currentYear;
// actionLink;
// eventName
// eventLocation
// receiverName
// nameOfActionMaker
// eventDate
// eventTime

const newLine = "<br>";
const tabSpace = "&ensp;&ensp;&ensp;&ensp;&ensp;";

const emailTexts = {
  //without button
  sixHoursLeftTillEvent: {
    headerText: "⏱ 6 hours until *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}Just a friendly reminder that there is only 6 hours until *|EVENT:eventName|*! The event will take place at *|EVENT:eventLocation|*.`,
    suggestionText: `Make sure to turn on your notifications to be kept in the loop about changes or updates about the event. And keep in mind that any pictures you take and submit pf the event will help verify the event afterwards!`,
    footerText: `Best,${newLine}novelty`,
  },
  eventUpdated: {
    headerText: "Some changes have been made to *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}Some changes have been made to *|EVENT:eventName|* by *|EVENT:nameOfActionMaker|*.${newLine}Here is the updated information:${newLine}${newLine}Date: *|EVENT:eventDate|*${newLine}Time: *|EVENT:eventTime|*${newLine}Location: *|EVENT:eventLocation|*`,
    suggestionText: "",
    footerText: `Best,${newLine}the novelty team.`,
  },
  resetPassword: {
    headerText: "resetting your novelty password",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}We received a request to reset your password for novelty.${newLine}To set a new password, please follow the link below:${newLine}*|EVENT:actionLink|*`,
    suggestionText: "",
    footerText: `Thanks,${newLine}novelty`,
  },
  eventRequestApproved: {
    headerText: "✋ your request to join an event has been approved",
    bodyText: `Hi noveltist,${newLine}Your request to join *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|* has been approved! Make sure to turn on your notifications to be kept in the loop about changes or updates about the event.`,
    suggestionText: "",
    footerText: `Best,${newLine}novelty`,
  },
  eventRequestRejected: {
    headerText: "✋ you’re request to join an event has been denied",
    bodyText: `Hi noveltist,${newLine}You’re request to join *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|* has been denied.`,
    suggestionText: "",
    footerText: `Best,${newLine}novelty`,
  },
  //With Button
  "1HourKickOutReminder": {
    headerText: "⏱ 1 hour left to reserve your spot for *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}Last chance to reserve your spot for *|EVENT:eventName|*! if you don't respond within the next hour, you will lose your spot on the guest list for event. Please confirm your spot here.`,
    buttonTitle: "CONFIRM NOW",
    suggestionText: `Make sure to turn on your notifications to stay in the loop about event changes and reminders. We look forward to seeing you at *|EVENT:eventName|*!`,
    footerText: `Best,${newLine}the novelty team`,
  },
  "24HourAttendanceConfirmation": {
    headerText: "⏱ 24 hours until *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}There’s just 24 hours left until *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|*!${newLine}Please confirm your spot here.`,
    buttonTitle: "CONFIRM NOW",
    suggestionText: `Make sure to turn on your notifications to be kept in the loop about changes or updates about the event. Also, keep in mind that any pictures you take will greatly accelerate the event verification process, so make sure to take and submit some after the event!`,
    footerText: `Best,${newLine}novelty`,
  },
  "24HourWaitlistConfirmation": {
    headerText: "⏱ 24 hours until *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}You have been invited to *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|*! Host is waiting for your answer, Would you like to go?${newLine}Please confirm your spot here.`,
    buttonTitle: "CONFIRM NOW",
    suggestionText: `Make sure to turn on your notifications to be kept in the loop about changes or updates about the event. Also, keep in mind that any pictures you take will greatly accelerate the event verification process, so make sure to take and submit some after the event!`,
    footerText: `Best,${newLine}novelty`,
  },
  "48HourAttendanceConfirmation": {
    headerText: "⏱ 48 hours until *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}There’s just 48 hours left until *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|*!${newLine}Please confirm your spot here.`,
    buttonTitle: "CONFIRM NOW",
    suggestionText: `Make sure to turn on your notifications to be kept in the loop about changes or updates about the event. Also, keep in mind that any pictures you take will greatly accelerate the event verification process, so make sure to take and submit some after the event!`,
    footerText: `Best,${newLine}novelty`,
  },
  "48HourWaitlistConfirmation": {
    headerText: "⏱ 48 hours until *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}You have been invited to *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|*! Host is waiting for your answer, Would you like to go?${newLine}Please confirm your spot here.`,
    buttonTitle: "CONFIRM NOW",
    suggestionText: `Make sure to turn on your notifications to be kept in the loop about changes or updates about the event. Also, keep in mind that any pictures you take will greatly accelerate the event verification process, so make sure to take and submit some after the event!`,
    footerText: `Best,${newLine}novelty`,
  },
  verifyEvent: {
    headerText: "Earn $NC for verifying novelty events!",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}Part of what makes novelty so unique is our mission to decentralization.${newLine}Ultimlately, we want our users to be in control of novelty’s future.${newLine}${newLine}Because novelty is community-based and events-based, we need your help verifying some events that have taken place in your community recently.${newLine}If you have a few minutes on your hands, help us verify some of these events!${newLine}For every event you verify, we will reward you with $NC tokens.`,
    buttonTitle: "Verify Events",
    suggestionText: "",
    footerText: `Best,${newLine}the novelty team.`,
  },
  eventFinishedForHost: {
    headerText: "⏱ Event Finished",
    bodyText: `Hey *|EVENT:hostName|*,${newLine}Thanks for hosting your event, *|EVENT:eventName|* on novelty! Now that you’ve finished the event, we’d like you to complete a post-event form, included in this email. You can also find the form in your notifications box on the novelty app itself. This form will help us quickly finish the event verification process and distribute tokens, so the sooner, the better!`,
    buttonTitle: "Event Host Form",
    suggestionText:
      "We’re excited that you chose to host with us and hope that you’ll continue to create novel experiences.",
    footerText: `See you soon!${newLine}novelty team.`,
  },
  feedbackReminderForGuest: {
    headerText: "⏱ Event Finished",
    bodyText: `Hey *|EVENT:receiverName|*,${newLine}Thanks for attending *|EVENT:receiverName|* hosted by *|EVENT:hostName|*, we hope you enjoyed your experience! If you’d like to earn novelty tokens ($NC) for your attendance at the event, please take a few minutes to fill out the short event feedback form. This helps us with verification of events and makes everything run smoothly!`,
    buttonTitle: "Event attendance form",
    suggestionText:
      "Once again, thanks for using our platform. Here’s to more novel experiences!",
    footerText: `Best wishes,${newLine}novelty team`,
  },
  feedbackReminderForHost: {
    headerText: "⏱ Feedback reminder for *|EVENT:eventName|*",
    bodyText: `Hey *|EVENT:receiverName|*,${newLine}We’re so glad to see that you hosted *|EVENT:eventName|* on our platform. Now that the event is finished, we would love to have you complete a post-event form so that you and your attendees may receive token rewards for using novelty. Please use the button below, or find the form in your notifications box inside the novelty app. Your input is crucial to our verification process, so we would greatly appreciate your help.`,
    buttonTitle: "take to form",
    suggestionText:
      "Once again, thanks for using our platform. Here’s to more novel experiences!",
    footerText: `Best wishes,${newLine}novelty team`,
  },
  eventFinishedForGuest: {
    headerText: "Give feedback on *|EVENT:eventName|* and earn $NC!",
    bodyText: `Hey *|EVENT:receiverName|*,${newLine}We hope you enjoyed your time at *|EVENT:eventName|*! Your feedback is always appreciated.${newLine}Click the button below to give us your take on *|EVENT:eventName|* and earn $NC!`,
    buttonTitle: "Give Feedback",
    suggestionText: "",
    footerText: `Best,${newLine}novelty`,
  },
  eventInvitation: {
    headerText: "You’ve been invited to  *|EVENT:eventName|*",
    bodyText: `Hi *|EVENT:receiverName|*,${newLine}You have been invited to an event: *|EVENT:eventName|* happening on *|EVENT:eventDate|* at *|EVENT:eventTime|*!.`,
    buttonTitle: "Accept invitation",
    suggestionText:
      "Make sure to turn on your notifications to be kept in the loop about changes or updates about the event!",
    footerText: `Best,${newLine}novelty`,
  },
  ///
  welcomeToTheNovelty: {
    headerText: "✋ Welcome to the novelty family!",
    bodyText: `Use novelty to explore upcoming events in your community, share your passion with others, and build long-lasting connections. The best part – be rewarded for all of it. We use cutting edge technology called social tokens to reward users for simply engaging in our community. Long story short, these tokens allow you to participate in the future of novelty and can even be traded in for real money (yup, you heard that right). Learn more about what crypto means to us here.${newLine}${newLine}Before you start exploring:${newLine}${tabSpace}1. finish creating your profile${newLine}${tabSpace}2. let us know your favorite type of events${newLine}${tabSpace}3. sign up for your first event!${newLine}${newLine}If you have any questions or concerns along the way, feel free to respond to this email or ping us in the messages feature of the app.`,
    buttonTitle: "Confirm your email",
    footerText: `Best Wishes,${newLine}novelty`,
  },
};

const emailSubjectLines = {
  // Without button
  sixHoursLeftTillEvent: "Event reminder",
  eventUpdated: "Event info updated",
  resetPassword: "Reset password",
  eventRequestApproved: "Event request approved",
  eventRequestRejected: "Event request denied",
  // With Button
  "1HourKickOutReminder": "1 hour left to confirm attendance",
  "24HourAttendanceConfirmation": "Attendance confirmation",
  "24HourWaitlistConfirmation": "Event invitation",
  "48HourAttendanceConfirmation": "Attendance confirmation",
  "48HourWaitlistConfirmation": "Event invitation",
  verifyEvent: "Verify event and earn $NC",
  eventFinishedForHost: "Write feedback",
  feedbackReminderForGuest: "Feedback reminder",
  feedbackReminderForHost: "Feedback reminder",
  eventFinishedForGuest: "Write feedback and earn $NC",
  eventInvitation: "Event invitation",
  welcomeToTheNovelty: "Confirm email",
};

const getEmailTemplate = (eventType) => {
  const mailsWithoutButton = [
    "sixHoursLeftTillEvent",
    "eventUpdated",
    "resetPassword",
    "eventRequestApproved",
    "eventRequestRejected",
  ];

  const mailsWithButton = [
    "1HourKickOutReminder",
    "24HourAttendanceConfirmation",
    "24HourWaitlistConfirmation",
    "48HourAttendanceConfirmation",
    "48HourWaitlistConfirmation",
    "verifyEvent",
    "eventFinishedForHost",
    "feedbackReminderForGuest",
    "feedbackReminderForHost",
    "eventFinishedForGuest",
    "eventInvitation",
  ];

  const welcomeMail = ["welcomeToTheNovelty"];

  if (mailsWithoutButton.includes(eventType)) {
    return htmlPage.mailTemplateWithoutButton;
  } else if (mailsWithButton.includes(eventType)) {
    return htmlPage.mailTemplateWithButton;
  } else if (welcomeMail.includes(eventType)) {
    return htmlPage.mailTemplateGreeting;
  } else {
    return "";
  }
};

module.exports = { emailTexts, emailSubjectLines, getEmailTemplate };

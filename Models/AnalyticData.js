const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Activity = new Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "platformAndApp", // covered in mainscreenFunctions
      "navigation", // added
      "sendMessage", // added
      "eventAdded",
      "eventUpdated",
      "getEvent",
      "eventReviewed",
      "deleteEvents",
      "sendFeedback",
      "requestedTicket",
      "messagedHost",
      "answeredRequester",
      "userInfoUpdate",
      "updateNotificationSettings",
      "signOut",
      "eventFilterUpdate",
      "accountDeleted",
      "accountRecovered",
      "accountCreated",
      "ticketBottomsheetOpened",
      "ticketBottomsheetClosed",
      "eventBottomsheetOpened",
      "eventBottomsheetClosed",
      "swipeRightMain",
      "swipeLeftMain",
      "navigation",
      "addedToFavorites",
      "removedFromFavorites",
      "cardCharged",
      "customerCardCharged",
      "customerCardCreated",
      "customerCardDeleted",
      "customerCreated",
      "changedNotificationStatus",
      "signIn",
      "accountConnect",
      "sharedEvent",
      "requesterViewOpened",
      "requesterViewClosed",
      "appIsActive",
      "appIsInBackground",
      "moveButDidNotSwipe",
      "appState",
      "notificationClicked",
      "privateRequestPressed",
    ],
  },
  dateTime: { type: String, required: true },
  timeZone: { type: Number, required: false },
  session_id: { type: String, required: false },
  extraData: { type: Object, required: false },
});

const AnalyticDataModel = new Schema({
  email: { type: String, required: true, unique: true },
  activities: [Activity],
});

const AnalyticData = mongoose.model("AnalyticData", AnalyticDataModel);

module.exports = AnalyticData;

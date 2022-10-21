const { mongoFindOneAndUpdate, mongoFindOne } = require("../mongodbDriver");
const ObjectId = require("mongodb").ObjectId;
const {
  updateDateInEvent,
  updateLocationInEvent,
} = require("../eventUpdateFunctions");
const {
  findUpdatedSuggestionAndSendToUsers,
} = require("./suggestionGeneralFunctions");
const {
  createNotificationDateSpecified,
  createNotificationLocationSpecified,
} = require("../createNotificationFunctions");
const { getDateObjectWithIdentifier } = require("../dateComparisons");
const { getGuestEmails } = require("../guestGetterFunctions");
const { sendEventUpdateEmail } = require("../../services/sendAllEmailTypes");

const updateDecidedAnswerInSuggestions = (
  chatUuid,
  messageId,
  type = "suggestedLocation", // suggestedLocation suggestedDate
  chosenItem
) => {
  //
  const update = {};

  if (type == "suggestedDate") {
    update["$set"] = {
      "messages.$.decidedDate": new Date(chosenItem).toUTCString(),
    };
  }
  //
  else {
    update["$set"] = {
      "messages.$.decidedLocation": chosenItem.address,
    };
  }

  return mongoFindOneAndUpdate(
    "chats",
    {
      uuid: chatUuid,
      "messages._id": ObjectId(messageId),
    },
    update,
    { returnDocument: "after" }
  );
};

const decideSuggestion = (
  user,
  chatUuid,
  messageId,
  type,
  chosenItem,
  eventId,
  dateIdentifier
) => {
  let event;
  let updatedDateObj;

  return mongoFindOne("events", { _id: ObjectId(eventId) })
    .then((eventData) => {
      // check if user trying to decide date is host
      if (eventData.organiser !== user.email) throw Error("NOT_AUTHORISED");
      event = eventData;

      // if it is location suggestion we update location and coordinates in event
      if (type == "suggestedLocation") {
        return updateLocationInEvent(
          eventId,
          chosenItem.address,
          chosenItem.location.lng,
          chosenItem.location.lat
        );
      }
      // if it is dates suggestion we update date in event and return new date object
      else {
        return updateDateInEvent(
          eventId,
          dateIdentifier,
          chosenItem,
          "dateTime",
          "morning"
        );
      }
    })
    .then((updateData) => {
      updatedDateObj = type == "suggestedDate" ? updateData : null;
      // update suggestion final decision variable in chat
      return updateDecidedAnswerInSuggestions(
        chatUuid,
        messageId,
        type,
        chosenItem
      );
    })
    .then((chatData) => {
      if (chatData) {
        // sends updated suggestion object to frontend
        findUpdatedSuggestionAndSendToUsers(
          chatData,
          messageId,
          type == "suggestedDate" ? chosenItem : null,
          type == "suggestedLocation" ? chosenItem : null
        );

        // send notifications about date specified // also shows calendar popup
        if (type == "suggestedDate") {
          const oldDateObj = getDateObjectWithIdentifier(
            event.dateObjects,
            dateIdentifier
          );

          createNotificationDateSpecified(
            event,
            updatedDateObj,
            oldDateObj,
            getGuestEmails(event, dateIdentifier, true)
          );
        }
        // send notifications about location specified
        else {
          createNotificationLocationSpecified(
            event,
            chosenItem,
            getGuestEmails(event, dateIdentifier, true)
          );
        }
      }
    })
    .then(() => {
      return mongoFindOne("events", { _id: ObjectId(eventId) });
    })
    .then((updatedEvent) => {
      sendEventUpdateEmail(
        getGuestEmails(updatedEvent, dateIdentifier),
        updatedEvent,
        event,
        dateIdentifier,
        user
      );
    })
    .catch((error) => console.log("error in  hk3f9ee3823: ", error));
};

module.exports = { decideSuggestion };

const { mongoFindOneAndUpdate } = require("../mongodbDriver");
const ObjectId = require("mongodb").ObjectId;
const {
  findUpdatedSuggestionAndSendToUsers,
} = require("./suggestionGeneralFunctions");

const updateVoteOnChatSuggestion = (
  status,
  user,
  chatUuid,
  messageId,
  type = "suggestedLocation", // suggestedLocation suggestedDate
  chosenItem
) => {
  const update = {};

  if (status == "like") {
    update["$addToSet"] = {
      "messages.$[t].choices.$[ch].likedBy": user.email,
    };
  } else {
    update["$pull"] = {
      "messages.$[t].choices.$[ch].likedBy": user.email,
    };
  }

  let itemFilter =
    type == "suggestedLocation"
      ? { "ch.locationObject.address": chosenItem }
      : { "ch.dateTime": new Date(chosenItem).toUTCString() };

  return mongoFindOneAndUpdate(
    "chats",
    {
      uuid: chatUuid,
    },
    update,
    {
      returnDocument: "after",
      arrayFilters: [{ "t._id": ObjectId(messageId) }, itemFilter],
    }
  );
};

const voteOnSuggestion = (
  status,
  user,
  chatUuid,
  messageId,
  type,
  chosenItem
) => {
  // updates liked list
  return updateVoteOnChatSuggestion(
    status,
    user,
    chatUuid,
    messageId,
    type,
    chosenItem
  )
    .then((chatData) => {
      if (chatData) {
        // sends updated suggestion object to frontend
        findUpdatedSuggestionAndSendToUsers(chatData, messageId);
      }
    })
    .catch((error) => console.log("Error socket 68af8fadfoa7t6 ", error));
};

module.exports = { voteOnSuggestion };

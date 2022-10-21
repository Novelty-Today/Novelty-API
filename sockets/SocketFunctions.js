const { mongoUpdateOne } = require("../functions/mongodbDriver");
const { socket: socketRef } = require("./SocketSettings");

const socketEvents = {
  updateMyEvents: "update myActivities",
  updateUpcomings: "update Upcomings",
  updateFavorites: "update favorites",
  updatePastEvents: "update pastActivities",
  updateAttended: "update attendedActivities",
  replaceMyEvents: "replace myActivities specific",
  replaceUpcomings: "replace upcomingActivities specific",
  getData: "getData",
  friendsUpdate: "friendsUpdate",
  addChatToChatlist: "addChatToChatlist",
  runServerCode: "runServerCode",
  showPopup: "showPopup",
  updateNoveltyTokens: "updateNoveltyTokens",
  shouldFillFields: "shouldFillFields",
  newNotification: "new notification",
  addedToCommunity: "added to community",
  updateChatSignal: "updateChatSignal",
  removeChatFromChatlist: "removeChatFromChatlist",
  newMessage: "new message",
  newComment: "new comment",
  deleteMessage: "delete message",
  editMessage: "edit message",
  deleteChatMessages: "deleteChatMessages",
  newChatMember: "new chat member",
  eventUploadFinish: "event upload finished",
  removeEventFromEventRoll: "removeEventFromEventRoll",
  reloadMainScreenEvents: "reloadMainScreenEvents",
  updateMainScreenEvents: "update mainScreenEvents",
  discoverEvents: "discoverEvents",
  searchChats: "searchChats",
  search: "search",
  loadMoreScreenData: "loadMoreScreenData",
  getLikes: "getLikes",
  updateSuggestions: "update suggestion",
  liveTranscript: "live transcript",
  getAvailableVerifications: "getAvailableVerifications",
  getUserData: "getUserData",
  venmoTransactionSuccess: "venmoTransactionSuccess",
  venmoTransactionFail: "venmoTransactionFail",
};

const isUserOnline = async (user) => {
  try {
    // list of all connected socket ids
    const ids = await socketRef.allSockets();
    const validSocketIdList = [...ids];

    // valid ids which are still connected for that user
    const validSocketsForUser = user?.socketIdList?.filter?.((item) =>
      validSocketIdList?.includes?.(item)
    );

    // if there are old unused socket ids in user object we remove them
    if (validSocketsForUser?.length < user?.socketIdList?.length) {
      socketCleanup(user, validSocketsForUser);
    }

    return validSocketsForUser?.length > 0;
  } catch (error) {
    console.log("Error adgyaut ", error);
    return user?.socketIdList?.length > 0;
  }
};

const socketCleanup = (user, validSocketsForUser) => {
  return mongoUpdateOne(
    "users",
    { email: user.email },
    { $set: { socketIdList: validSocketsForUser } }
  ).catch((error) => {
    console.log("Error adigyat76f ", error);
  });
};

const sendSocketEventToUsers = (users, eventName = "", data = {}) => {
  users.forEach((user) => {
    user?.socketIdList?.forEach((socketId) => {
      socketRef.to(socketId).emit(eventName, data);
    });
  });
};

const sendSocketEventToRoom = (uuid, eventName, data = {}) => {
  socketRef.to(uuid).emit(eventName, data);
};

const sendSocketEventToEveryone = (eventName, data = {}) => {
  socketRef.emit(eventName, data);
};

const emitToClient = (clientSocket, eventName, data = {}) => {
  clientSocket.emit(eventName, data);
};

const addUserToSocketRoom = (user, uuid) => {
  user?.socketIdList?.forEach((socketId) => {
    socketRef.in(socketId).socketsJoin(uuid);
  });
};

module.exports = {
  socketEvents,
  isUserOnline,
  sendSocketEventToUsers,
  addUserToSocketRoom,
  sendSocketEventToRoom,
  sendSocketEventToEveryone,
  emitToClient,
};

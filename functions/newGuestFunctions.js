const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const Chat = mongoose.model("Chat");
const {
  askSocketToJoin,
  sendChatUpdateSignal,
} = require("../sockets/chatSockets");
const { newMessageHandler } = require("../sockets/MessageSockets");
const {
  sendNewUpcomingsInSocket,
  modifyMyEventWithSocket,
  sendUpdateMyEventsInSocket,
} = require("../sockets/EventSockets");
const { createRequestAcceptedAlertTask } = require("../Tasks/EventUpdateTasks");
const { buildGroupChatData } = require("../functions/ChatCreationFunctions");
const {
  createNotificationCapacityReached,
  createNotificationRequestAnswered,
  createNotificationInvitationAnswered,
} = require("./createNotificationFunctions");
const { getDateObjectWithIdentifier } = require("./dateComparisons");
const {
  getGuestsCount,
  getGuest,
  getGuestEmails,
} = require("./guestGetterFunctions");
const { createGroupChat } = require("./ChatCreationFunctions");
const { addPaymentPendingMessage } = require("./organiser");
const {
  sendSocketEventToUsers,
  socketEvents,
  sendSocketEventToRoom,
} = require("../sockets/SocketFunctions");

const handleNewGuestAnswer = (
  event,
  dateIdentifier,
  chat,
  status,
  hostUserObj,
  requesterUserObj
) => {
  const increaseCapacity =
    status == "accepted" &&
    getGuestsCount(event, dateIdentifier) == event.capacity;
  const newCapacity = increaseCapacity ? event.capacity + 1 : event.capacity;

  const guest = getGuest(event, requesterUserObj.email, dateIdentifier);

  if (guest?.status == "accepted" && guest?.coHost) {
    throw new Error("You are already a co-host.");
  } else if (guest?.status == "accepted" || guest?.status == "rejected") {
    throw new Error(
      `You have already ${
        guest?.status == "accepted" ? "accepted" : "declined"
      } request.`
    );
  } else if (!guest) {
    throw new Error(`Something went wrong. Please try again.`);
  }

  // 1. Update status in event.
  return eventGuestStatusAndCapacity(
    event._id,
    guest,
    status,
    newCapacity,
    requesterUserObj,
    dateIdentifier
  ).then((eventAfterUpdate) => {
    // 2. Update request status in chat.
    sendChatUpdateSignal([hostUserObj.email, requesterUserObj.email], {
      eventId: event._id + "",
      dateIdentifier: dateIdentifier,
    });

    let promiseArray = [];

    if (status == "accepted") {
      // Add payment pending message if not free
      if (event.price > 0) {
        promiseArray.push(
          addPaymentPendingMessage(
            event,
            dateIdentifier,
            chat.uuid,
            requesterUserObj.email
          )
        );
      }

      // Add new chat member
      promiseArray.push(
        addAsChatMember(event, dateIdentifier, requesterUserObj)
      );

      // Adding to calendar in case we accept
      promiseArray.push(
        createRequestAcceptedAlertTask(
          requesterUserObj.email,
          event._id,
          dateIdentifier,
          guest?.addedBy == "user" ? "joinRequests" : "invitationFromHost"
        )
      );

      // If accepted send transfer to group chat message
      if (newCapacity > 1) {
        promiseArray.push(
          sendTransferToGroupChatMessages(
            eventAfterUpdate,
            dateIdentifier,
            hostUserObj,
            requesterUserObj
          )
        );
      }
    }

    ///// notifications

    // 8. Create request answered notification
    if (guest.addedBy == "user") {
      promiseArray.push(
        createNotificationRequestAnswered(
          event,
          dateIdentifier,
          requesterUserObj.email,
          status
        )
      );
    } else {
      promiseArray.push(
        createNotificationInvitationAnswered(
          event,
          dateIdentifier,
          hostUserObj.email,
          requesterUserObj
        )
      );
    }

    return Promise.all(promiseArray).then(() => {
      if (status == "accepted") {
        // If reached capacity send notification to host
        // we send capacity reached notification after all promises resolve because promises also contain other notification (request/invitation answered)
        // notifications create tasks and if we call them directly with other promises
        // there is a chance that multiple notification tasks will be created and user receives same notifications multiple times
        const guestCount = getGuestsCount(eventAfterUpdate, dateIdentifier);
        if (event.capacity == guestCount) {
          return createNotificationCapacityReached(event, dateIdentifier);
        }
      }
    });
  });
};

const eventGuestStatusAndCapacity = (
  eventId,
  guest,
  status,
  newCapacity,
  requesterUserObj,
  dateIdentifier
) => {
  return Promise.resolve()
    .then(() => {
      if (guest.coHost && status == "accepted") {
        return Event.findOneAndUpdate(
          {
            _id: eventId,
          },
          {
            $pull: {
              guests: { email: guest.email, coHost: false },
            },
          }
        );
      }
    })
    .then(() => {
      return Event.findOneAndUpdate(
        {
          _id: eventId,
          "guests._id": guest._id,
        },
        {
          $set: {
            "guests.$.status": status,
            capacity: newCapacity,
          },
        },
        { new: true }
      );
    })
    .then((event) => {
      if (status == "accepted") {
        // if user is added as cohost we should send event in myevent screen for all dates
        if (guest.coHost == true) {
          sendUpdateMyEventsInSocket(requesterUserObj, eventId, null, true);
        }
        // if user is added as guest we send event in upcomings screen for specific date user was added
        else {
          sendNewUpcomingsInSocket(
            requesterUserObj,
            eventId,
            getDateObjectWithIdentifier(event.dateObjects, dateIdentifier),
            true
          );
        }
      }

      // modifying myevent to the host -> change capacity
      // if added as coHost we should update event on all dates. if added as guest we can update event for that specific date
      if (guest.coHost) {
        modifyMyEventWithSocket(event._id);
      } else {
        modifyMyEventWithSocket(
          event._id,
          getDateObjectWithIdentifier(event.dateObjects, dateIdentifier)
        );
      }

      return event;
    });
};

const addAsChatMember = (event, dateIdentifier, requesterUserObj) => {
  let chatFilter = {
    eventId: event._id,
    dateIdentifier: dateIdentifier,
    "chatMembers.email": { $ne: requesterUserObj.email },
  };

  return Chat.findOneAndUpdate(chatFilter, {
    $addToSet: {
      chatMembers: {
        email: requesterUserObj.email,
        username: requesterUserObj?.username,
        lastMessageSeen: false,
        isRemoved: false,
      },
    },
  })
    .then((chat) => {
      if (chat) {
        return addMemberAndSendChatToChatsList(event, chat, requesterUserObj);
      } else {
        return createGroupChat(event, dateIdentifier);
      }
    })
    .catch((error) => {
      console.log("error idofyua78d ", error);
    });
};

const addMemberAndSendChatToChatsList = (event, chat, requesterUserObj) => {
  //socket emits "add chat member"
  sendSocketEventToRoom(chat?.uuid, socketEvents.newChatMember, {
    email: requesterUserObj.email,
    username: requesterUserObj.username,
    microMedia: requesterUserObj.microMedia,
  });

  return Promise.all([askSocketToJoin([requesterUserObj.email], chat.uuid)])
    .then(([socketJoin]) => {
      return buildGroupChatData(chat, event, false);
    })
    .then((builtChat) => {
      sendSocketEventToUsers(
        [requesterUserObj],
        socketEvents.addChatToChatlist,
        {
          chat: builtChat,
        }
      );
    })
    .catch((error) => {
      console.log("eRROR AIUADYGA ", error);
    });
};

const sendTransferToGroupChatMessages = (
  event,
  dateIdentifier,
  hostUserObj,
  requesterUserObj
) => {
  let promises = [];

  let emails = getMailsForTransferMessage(
    event,
    dateIdentifier,
    requesterUserObj
  );

  emails.forEach((email) => {
    let chatMemberEmails = [email];
    if (requesterUserObj.email == email) {
      chatMemberEmails.push(hostUserObj.email);
    } else {
      chatMemberEmails.push(event.organiser);
    }

    Chat.findOne({
      "chatMembers.email": { $all: chatMemberEmails },
      type: "private",
    }).then((chat) => {
      if (chat) {
        let messageObj = {
          type: "moveToGroupChat",
          email: requesterUserObj.email,
          username: requesterUserObj.username,
          eventId: event._id + "",
          dateIdentifier,
        };

        return newMessageHandler(
          { email: "novelty" },
          chat?.uuid,
          null,
          "",
          null,
          null,
          messageObj
        );
      }
    });
  });

  return Promise.all(promises).catch((error) => {
    console.log("Error difau 65665   ", error);
  });
};

const getMailsForTransferMessage = (
  event,
  dateIdentifier,
  requesterUserObj
) => {
  //if we had 1 guest and now we have 2 we need to let them know to move to group chat
  //else we need to let new guest know to move to group chat
  const acceptedGuestsCount = getGuestsCount(event, dateIdentifier);
  let emails = [];

  if (acceptedGuestsCount == 2) {
    emails = getGuestEmails(event, dateIdentifier);
  } else if (acceptedGuestsCount > 2) {
    emails = [requesterUserObj.email];
  }
  return emails;
};

const getResponseMessage = (
  event,
  dateIdentifier,
  requesterUserObj,
  status
) => {
  const guestCount = getGuestsCount(event, dateIdentifier);
  const requesterName = requesterUserObj?.username
    ? requesterUserObj?.username
    : requesterUserObj?.email;
  let message = "";

  const guest = getGuest(event, requesterUserObj?.email, dateIdentifier);

  if (guest.addedBy == "user") {
    message = `You have ${
      status == "accepted" ? "accepted" : "declined"
    } invitation.`;
  } else {
    if (status == "accepted") {
      message = `You've added ${requesterName} to the event${
        guestCount >= event?.capacity ? " and increaed capacity by 1." : "."
      }`;
    } else if (status == "rejected") {
      message = `You've declined ${requesterName}.`;
    }
  }

  return message;
};

module.exports = { handleNewGuestAnswer, getResponseMessage };

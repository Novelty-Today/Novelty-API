const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Chat = mongoose.model("Chat");
const ObjectId = require("mongodb").ObjectId;
const { mongoFindOne, mongoFind } = require("../functions/mongodbDriver");
const { requireAuth } = require("../middlewares/requireAuth");
const { buildChatData } = require("../functions/chatFunctions");
const { getGuest } = require("../functions/guestGetterFunctions");
const { buildFoundEvent } = require("../functions/buildEvent");

router.post("/startChatMerged", requireAuth, (req, res) => {
  let chatFilter = {};

  if (req.body.uuid) {
    // Case when user got message and chat exists
    chatFilter.uuid = req.body.uuid;
  } else {
    if (req.body.email) {
      // Case when user starts new Private Chat
      chatFilter["chatMembers.email"] = {
        $all: [req.user.email, req.body.email],
      };
      chatFilter.type = "private";
    } else if (req.body.eventId && req.body.dateIdentifier) {
      // Case when user starts new Group Chat
      chatFilter.eventId = req.body.eventId;
      chatFilter.dateIdentifier = req.body.dateIdentifier;
      chatFilter.type = "group";
    }
  }

  let chat;
  let event;
  let user;
  let finalChatData;
  let otherUser;
  let isChatMember = true; // we need to check if user is really chat member because if user requests chat without being member we should not return it
  let eventId = req.body.eventId;
  let dateIdentifier = req.body.dateIdentifier;

  mongoFindOne("chats", chatFilter)
    .then((chatData) => {
      chat = chatData;
      if (chat) {
        eventId = chat.eventId;
        dateIdentifier = chat.dateIdentifier;
      }
      // 1) we need to find an event for the group chat
      if ((eventId && dateIdentifier) || chat?.type == "group") {
        // Two cases in if condition: chat does not exist and chat exists (always exists when we use uuid)
        return mongoFindOne("events", {
          _id: ObjectId(eventId),
        });
      }
      // 2) we need to find a user who we send message for the individual chat
      else if (req.body.email || chat?.type == "private") {
        chat?.chatMembers?.forEach((member) => {
          if (member.email != req.user.email) {
            otherUser = member;
          }
        });

        return mongoFindOne("users", {
          email: req.body.email ? req.body.email : otherUser?.email,
        });
      }
    })
    .then((data) => {
      if ((eventId && dateIdentifier) || chat?.type == "group") {
        event = data;
        isChatMember =
          event?.organiser == req.user.email ||
          getGuest(event, req.user.email, dateIdentifier)?.status == "accepted";
      } else if (req.body.email || chat?.type == "private") {
        user = data;
      }

      if (isChatMember && (user || event)) {
        return buildChatData(req, chat, event, user, dateIdentifier);
      } else {
        return null;
      }
    })
    .then((result) => {
      finalChatData = result;

      res.send({
        status: "success",
        chat: finalChatData,
        message: isChatMember
          ? "success"
          : !event
          ? "Event has been deleted."
          : "You are not a member of this chat.",
      });
    })
    .catch((error) => {
      console.log("Error aoufayf ", error);
      res.send({ status: "fail", message: "Could not start chat." });
    });
});

router.post("/getChatAllMedia", requireAuth, (req, res) => {
  Chat.findOne({ uuid: req.body.uuid })
    .then((chat) => {
      let mediaLinkList = [];
      chat?.messages?.forEach((message) => {
        if (!message.isDeleted && message.media) {
          mediaLinkList.push(message.media);
        }
      });

      res.send({ status: "success", mediaLinkList });
    })
    .catch((error) => {
      console.log("Error jiaff565 ", error);
      res.send({ status: "fail", mediaLinkList });
    });
});

router.get(
  "/loadMorePrivateMessagesNew/:uuid/:localNumber",
  requireAuth,
  (req, res) => {
    Chat.findOne({ uuid: req.params.uuid })
      .then((result) => {
        let dataToSend = [];
        let count = 0;
        let maxNum = 20;
        let noMoreMessages = false;

        if (result?.messages) {
          for (var i = result.messages?.length - 1; i >= 0; i--) {
            if (
              result.messages.length - i > req.params.localNumber &&
              count < maxNum
            ) {
              dataToSend.push(result.messages[i]);
              count++;
              i == 0 ? (noMoreMessages = true) : "";
            }
          }
        }

        res.send({ messages: dataToSend, noMoreMessages });
      })
      .catch((error) => {
        console.log("Error ajcain^%&N%$Y", error);
      });
  }
);

router.post("/getEventsForPrivateChat", requireAuth, (req, res) => {
  const emails = [req.user.email, req.body.email];

  // get user object and events where capacity is one, one of the users is host and other one is guest
  return Promise.all([
    mongoFind("events", {
      capacity: 1,
      isOld: false,
      $and: [
        {
          $or: [{ organiser: req.user.email }, { organiser: req.body.email }],
        },
        {
          $or: [
            {
              guests: {
                $elemMatch: { email: req.user.email, status: "accepted" },
              },
            },
            {
              guests: {
                $elemMatch: { email: req.body.email, status: "accepted" },
              },
            },
          ],
        },
      ],
    }),
    mongoFindOne("users", { email: req.body.email }),
  ])
    .then(([eventsData, userData]) => {
      let events = [];

      eventsData.forEach((event) => {
        event.dateObjects.forEach((dateObject) => {
          // if event on that date is not finished check event
          if (
            !event.finishedDateIdentifiers.includes(dateObject.dateIdentifier)
          ) {
            // if there is guest on this date add in events
            const guest = event.guests.find(
              (item) =>
                emails.includes(item.email) &&
                item.status == "accepted" &&
                (dateObject.dateIdentifier == item.dateIdentifier ||
                  item.coHost)
            );

            if (guest) {
              events.push(
                buildFoundEvent(
                  event,
                  dateObject.dateIdentifier,
                  req.user.email,
                  event.organiser == req.user.email ? req.user : userData
                )
              );
            }
          }
        });
      });

      res.send({ status: "success", events: events });
    })
    .catch((error) => {
      console.log("Error adiaytgfa6 ", error);
      res.send({ status: "fail", events: [] });
    });
});

module.exports = router;

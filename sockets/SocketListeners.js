const { socket: socketRef } = require("./SocketSettings");
const { joinZoomMeeting } = require("./ChatSockets");
const {
  validateTokenAndChangeUserOnlineStatus,
  tokenValidation,
  handleSocketConnect,
} = require("./ValidationSockets");
const {
  newMessageHandler,
  editMessageHandler,
  deleteMessageHandler,
  messageSeenHandler,
  newCommentHandler,
} = require("./MessageSockets");
const { liveTranscriptHandler } = require("./AudioSockets");
const {
  getProfileDataAndEventsHosted,
  updateCalendarAccessInfo,
  updateTagsFilter,
} = require("./UserSockets");
const { getMainScreenEvents } = require("../functions/getEventsForMainScreen");
const { getUsersLikedEvent } = require("./LikeSockets");
const {
  searchEventsAndUsers,
  discoverEvents,
  searchChats,
  searchCommunityUsers,
} = require("./SearchSockets");
const speech = require("@google-cloud/speech").v1p1beta1;
const {
  getPendingVerifications,
} = require("../functions/noveltyTokenFunctions/verifyEvents");
const {
  voteOnSuggestion,
} = require("../functions/chatSuggestionFunctions/suggestionVoteFunctions");
const {
  decideSuggestion,
} = require("../functions/chatSuggestionFunctions/suggestionDecideFunctions");
const {
  sendSuggestion,
} = require("../functions/chatSuggestionFunctions/sendSuggestionFunctions");
const { loadMoreScreenDataHandler } = require("./LoadMoreSockets");
const { emitToClient, socketEvents } = require("./SocketFunctions");

const addingSocketListeners = () => {
  // we change user status and connect to rooms before actual connection happens
  socketRef.use((socket, next) => {
    validateTokenAndChangeUserOnlineStatus(true, socket, "connected")
      .then(() => {
        next();
      })
      .catch((error) => {
        console.log("Error drtruifauigfya ", error);
        next(error);
      });
  });

  // setting listeners
  socketRef.on("connection", (clientSocket) => {
    handleSocketConnect(clientSocket);

    clientSocket.on("disconnect", (reason) => {
      validateTokenAndChangeUserOnlineStatus(
        false,
        clientSocket,
        "disconnected"
      ).catch((error) => {
        console.log("Error dui323fauigfya ", error);
      });
    });

    // used for comments
    clientSocket.on("join specific room", ({ token, roomName }) => {
      tokenValidation(token)
        .then((user) => {
          clientSocket.join([roomName]);
        })
        .catch((error) => console.log("Error socket a98f7a ", error));
    });

    // used for comments
    clientSocket.on("leave specific room", ({ token, roomName }) => {
      tokenValidation(token)
        .then((user) => {
          clientSocket.leave([roomName]);
        })
        .catch((error) => console.log("Error socket 2547af5rerao87i6 ", error));
    });

    // handles new suggestion for both location and dates
    clientSocket.on(
      "new suggestion",
      ({
        token,
        chatUuid,
        messageUuid,
        eventId,
        dateIdentifier,
        type,
        suggestedItems,
      }) => {
        tokenValidation(token)
          .then((user) => {
            return sendSuggestion(
              user,
              chatUuid,
              messageUuid,
              eventId,
              dateIdentifier,
              type,
              suggestedItems
            );
          })
          .catch((error) => console.log("Error socket gaditdayadfa ", error));
      }
    );

    // handles voting for suggestions (both location and dates) status => "like" or "dislike"
    clientSocket.on(
      "vote for suggestion",
      ({ token, messageId, chatUuid, chosenItem, status, type }) => {
        tokenValidation(token)
          .then((user) => {
            return voteOnSuggestion(
              status,
              user,
              chatUuid,
              messageId,
              type,
              chosenItem
            );
          })
          .catch((error) => console.log("Error socket gadyg87aygfad ", error));
      }
    );

    // handles deciding final location or date
    clientSocket.on(
      "decide suggestion answer",
      ({
        token,
        chatUuid,
        messageId,
        type,
        chosenItem,
        eventId,
        dateIdentifier,
      }) => {
        tokenValidation(token)
          .then((user) => {
            return decideSuggestion(
              user,
              chatUuid,
              messageId,
              type,
              chosenItem,
              eventId,
              dateIdentifier
            );
          })
          .catch((error) => console.log("Error socket 68af8fadfoa7t6 ", error));
      }
    );

    clientSocket.on(
      "new message",
      ({
        token,
        chatUuid,
        messageUuid,
        message,
        media = null,
        voice = null,
        extraData,
        replyTo,
      }) => {
        tokenValidation(token).then((user) => {
          newMessageHandler(
            user,
            chatUuid,
            messageUuid,
            message,
            media,
            voice,
            extraData,
            replyTo
          );
        });
      }
    );

    clientSocket.on(
      "edit message",
      ({ token, chatUuid, messageId, message, image, media }) => {
        const finalMedia = media ?? image;
        editMessageHandler(token, chatUuid, messageId, message, finalMedia);
      }
    );

    clientSocket.on("delete message", ({ token, chatUuid, messageId }) => {
      deleteMessageHandler(token, chatUuid, messageId);
    });

    clientSocket.on("messages seen", ({ token, chatUuid }) => {
      messageSeenHandler(token, chatUuid);
    });

    const socketSpecificStream = {
      client: new speech.SpeechClient(),
      recognizeStream: null,
    };
    clientSocket.on("live transcript", ({ chunk, status }) => {
      liveTranscriptHandler(socketSpecificStream, chunk, status, clientSocket);
    });

    clientSocket.on("new comment", ({ eventId, comment, token, uuid }) => {
      newCommentHandler(eventId, comment, token, uuid);
    });

    clientSocket.on(
      "update mainScreenEvents",
      ({ token, selectedTags, updateUniqueId }) => {
        tokenValidation(token)
          .then((user) => {
            getMainScreenEvents(user, selectedTags).then((data) => {
              emitToClient(clientSocket, socketEvents.updateMainScreenEvents, {
                ...data,
                updateUniqueId,
              });
            });
          })
          .catch((error) => {
            console.log("Error dui3242fauigfya ", error);
          });
      }
    );

    clientSocket.on("getUserData", ({ token, email }) => {
      tokenValidation(token)
        .then((user) => {
          getProfileDataAndEventsHosted(email, user.email).then((data) => {
            emitToClient(clientSocket, socketEvents.getUserData, data);
          });
        })
        .catch((error) => {
          console.log("Error duifa32332uigfya ", error);
        });
    });

    clientSocket.on("getLikes", ({ eventId }) => {
      getUsersLikedEvent(eventId, clientSocket);
    });

    clientSocket.on("search", ({ token, searchString, searchUniqueId }) => {
      tokenValidation(token)
        .then((user) => {
          searchEventsAndUsers(
            user,
            searchString,
            clientSocket,
            searchUniqueId
          );
        })
        .catch((error) => {
          console.log("Error erwwrqr ", error);
        });
    });

    clientSocket.on("searchCommunity", (arg, callback) => {
      let { token, searchString, searchUniqueId, offset, limit } = arg;

      tokenValidation(token)
        .then((user) => {
          searchCommunityUsers(
            user,
            searchString,
            searchUniqueId,
            offset,
            limit,
            callback
          );
        })
        .catch((error) => {
          console.log("Error erwwrqr ", error);
        });
    });

    clientSocket.on(
      "searchChats",
      ({ token, searchString, searchUniqueId }) => {
        tokenValidation(token)
          .then((user) => {
            searchChats(user, searchString, clientSocket, searchUniqueId);
          })
          .catch((error) => {
            console.log("Error dufybvg8vavta ", error);
          });
      }
    );

    clientSocket.on("discoverEvents", ({ token, skip }) => {
      tokenValidation(token)
        .then((user) => {
          discoverEvents(user, skip, clientSocket);
        })
        .catch((error) => {
          console.log("Error twtw ", error);
        });
    });

    clientSocket.on(
      "calendarAccess",
      ({ token, enabledCalendarPermissions }) => {
        tokenValidation(token)
          .then((user) => {
            updateCalendarAccessInfo(user, enabledCalendarPermissions);
          })
          .catch((error) => {
            console.log("Error duife3auigfya ", error);
          });
      }
    );

    clientSocket.on(
      "updateTagsFilter",
      ({ token, selectedTags, updateUniqueId }) => {
        tokenValidation(token, true)
          .then((email) => {
            updateTagsFilter(email, selectedTags, clientSocket, updateUniqueId);
          })
          .catch((error) => {
            console.log("Error duifauigfya ", error);
          });
      }
    );
    clientSocket.on("joinZoomMeeting", ({ token, eventId, dateIdentifier }) => {
      tokenValidation(token)
        .then((user) => {
          joinZoomMeeting(user.email, eventId, dateIdentifier);
        })
        .catch((error) => {
          console.log("Error du342ifauigfya ", error);
        });
    });

    clientSocket.on("getAvailableVerifications", ({ token }) => {
      tokenValidation(token)
        .then((user) => {
          return getPendingVerifications(user);
        })
        .then((result) => {
          emitToClient(clientSocket, socketEvents.getAvailableVerifications, {
            avalibleCount: result?.avalibleCount,
            stakedCount: result?.stakedCount,
            earnUpTo: result?.earnUpTo ?? 0,
          });
        })
        .catch((error) => {
          console.log("Error du342ifauigfya ", error);
        });
    });

    clientSocket.on(
      "loadMoreScreenData",
      ({ token, type, offset = 0, limit = 10 }) => {
        loadMoreScreenDataHandler(clientSocket, token, type, offset, limit);
      }
    );
  });
};

module.exports = {
  addingSocketListeners,
};

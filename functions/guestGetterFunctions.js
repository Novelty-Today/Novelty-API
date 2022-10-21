const ObjectId = require("mongodb").ObjectId;
const { userImageUrlWithEmail } = require("./mediaProccessing");
const { mongoFindOneSpecificField, mongoFindOne } = require("./mongodbDriver");

const getGuestsUpdated = (event, dateIdentifier, forHost = false) => {
  let promiseArray = [];
  let emailList = {
    accepted: [],
    waitlist: [],
  };

  for (let i = 0; i < event.guests?.length; i++) {
    if (
      event.guests[i].dateIdentifier == dateIdentifier ||
      event.guests[i].coHost
    ) {
      //accepted
      if (
        event.guests[i].status == "accepted" &&
        !emailList.accepted.includes(event.guests[i].email)
      ) {
        promiseArray.push(
          buildUserObject(event, dateIdentifier, event.guests[i], forHost).then(
            (guestObj) => {
              emailList.accepted.push(guestObj);
            }
          )
        );
      }
      // waitlisted
      else if (!emailList.waitlist.includes(event.guests[i].email) && forHost) {
        if (
          event.guests[i].status == "waitlisted" &&
          event.guests[i].addedBy == "user"
        ) {
          promiseArray.push(
            buildUserObject(event, dateIdentifier, event.guests[i]).then(
              (guestObj) => {
                emailList.waitlist.push(guestObj);
              }
            )
          );
        }
      }
    }
  }

  return Promise.all(promiseArray)
    .then(() => {
      return emailList;
    })
    .catch((error) => {
      console.log("Error a5f+a9f5a+fa5fa", error);
      return { accepted: [], waitlist: [] };
    });
};

const getGuestEmailsPromise = (
  eventData,
  eventId,
  dateIdentifier,
  includeHost = false,
  getAll = false
) => {
  let event = eventData;

  return Promise.resolve()
    .then(() => {
      if (eventId && dateIdentifier) {
        return mongoFindOneSpecificField("events", {
          _id: ObjectId(eventId),
          "dateObjects.dateIdentifier": dateIdentifier,
        });
      }
    })
    .then((foundEvent) => {
      if (foundEvent) event = foundEvent;
      return getGuestEmails(event, dateIdentifier, includeHost, getAll);
    })
    .catch((error) => {
      console.log("Error fadhg ", error);
      return [];
    });
};

const getGuestsDataFromEvent = (event, dateIdentifier) => {
  let guestList = [];
  let guestCount = 0;

  for (var i = 0; i < event.guests.length; i++) {
    if (
      event.guests[i].dateIdentifier == dateIdentifier ||
      event.guests[i].coHost
    ) {
      guestList.push({
        email: event.guests[i].email,
        phone: event.guests[i].phone,
        microMedia: userImageUrlWithEmail(event.guests[i].email),
        dateIdentifier: dateIdentifier,
        addedBy: event.guests[i].addedBy,
        status: event.guests[i].status,
        coHost: event.guests[i].coHost,
      });
      if (event.guests[i].status == "accepted") {
        guestCount++;
      }
    }
  }

  return { guestList, guestCount };
};

const getGuestId = (event, email, dateIdentifier) => {
  let guestId = false;

  event.guests.forEach((guest) => {
    if (
      guest.email == email &&
      (guest.dateIdentifier == dateIdentifier || guest.coHost)
    ) {
      guestId = guest._id;
    }
  });

  return guestId;
};

// only used in app start functions. dont add cohost search here
const getGuestStatus = (
  event,
  email,
  dateIdentifier,
  includingCoHosts = false
) => {
  let status = false;

  event.guests.forEach((guest) => {
    if (
      guest.email == email &&
      (guest.dateIdentifier == dateIdentifier ||
        (includingCoHosts && guest.coHost))
    ) {
      status = guest.status;
    }
  });

  return status;
};

const getGuest = (event, email, dateIdentifier) => {
  let guestData;

  event?.guests.forEach((element) => {
    if (
      element.email == email &&
      (element.dateIdentifier == dateIdentifier || element.coHost)
    ) {
      guestData = element;
    }
  });

  return guestData;
};

const getGuestWithPhone = (event, phone, dateIdentifier) => {
  let guestData;

  event?.guests.forEach((element) => {
    if (
      element.phone == phone &&
      (element.dateIdentifier == dateIdentifier || element.coHost)
    ) {
      guestData = element;
    }
  });

  return guestData;
};

const getGuestsCount = (event, dateIdentifier) => {
  let guestCount = false;

  event.guests.forEach((guest) => {
    if (
      (guest.dateIdentifier == dateIdentifier || guest.coHost) &&
      guest.status == "accepted"
    ) {
      guestCount++;
    }
  });

  return guestCount;
};

const getGuestEmails = (
  event,
  dateIdentifier,
  includeHost = false,
  getAll = false
) => {
  try {
    if (event) {
      let emails = includeHost ? [event.organiser] : [];
      event.guests.forEach((guest) => {
        if (
          guest.status == "accepted" &&
          (guest.dateIdentifier == dateIdentifier || guest.coHost || getAll) &&
          !emails.includes(guest.email)
        ) {
          emails.push(guest.email);
        }
      });
      return emails;
    } else {
      return [];
    }
  } catch (error) {
    console.log("Erroprs auigayg87a ", error);
    return [];
  }
};

const getGuestsIdList = (event, dateIdentifier) => {
  let idList = [];

  event.guests.forEach((guest) => {
    if (guest.dateIdentifier == dateIdentifier) {
      idList.push(guest._id + "");
    }
  });

  return idList;
};

const isAcceptedCoOrganiser = (guests, email) => {
  let isAccepted = false;
  guests.forEach((element) => {
    if (
      element.email == email &&
      element.coHost &&
      element.status == "accepted"
    ) {
      isAccepted = true;
    }
  });
  return isAccepted;
};

const getGuestsAndOrganisers = (event) => {
  let organisers = [event.organiser];
  let guests = [];
  event.guests.forEach((guest) => {
    if (guest.status == "accepted" && !organisers.includes(guest.email)) {
      if (guest.coHost) {
        organisers.push(guest.email);
      } else {
        guests.push(guest.email);
      }
    }
  });

  return { organisers, guests };
};

const buildUserObject = (event, dateIdentifier, guest, forHost = false) => {
  let user;
  return mongoFindOne("users", { email: guest.email })
    .then((userData) => {
      user = userData;

      if (forHost) {
        return mongoFindOne("orders", {
          eventId: event._id + "",
          dateIdentifier: dateIdentifier,
          email: guest.email,
        });
      }
    })
    .then((order) => {
      let isInCoHosts = false;
      event.guests.forEach((element) => {
        if (element.email == guest.email && element.coHost) {
          isInCoHosts = true;
        }
      });

      return {
        email: guest.email,
        eventId: event._id,
        dateIdentifier: dateIdentifier,
        status: guest.status,
        coHost: guest.coHost,
        confirmedWantsToGo: guest.confirmedWantsToGo,
        username: user.username,
        media: user.miniMedia,
        microMedia: user.microMedia,
        description: user.description,
        enabledCalendarPermissions: user.enabledCalendarPermissions,
        isInCoHosts: isInCoHosts,
        paid: order ? true : false,
      };
    });
};

module.exports = {
  getGuestId,
  getGuest,
  getGuestWithPhone,
  getGuestsCount,
  getGuestStatus,
  getGuestsUpdated,
  getGuestEmailsPromise,
  getGuestEmails,
  getGuestsIdList,
  isAcceptedCoOrganiser,
  getGuestsAndOrganisers,
  getGuestsDataFromEvent,
};

const mongoose = require("mongoose");
const { getGuestEmailsPromise } = require("./guestGetterFunctions");
const { mongoFindSpecificField } = require("./mongodbDriver");
const UserCalendar = mongoose.model("UserCalendar");

const getBusySlots = (eventId, dateIdentifier, hostEmail) => {
  let emailsList = [];
  let calendarBusySlots = [];

  return getGuestEmailsPromise(null, eventId, dateIdentifier)
    .then((resultEmails) => {
      emailsList = [hostEmail, ...resultEmails];
    })
    .then(() => {
      return UserCalendar.find({ email: emailsList });
    })
    .then((userCalendars) => {
      userCalendars.forEach((userCalendar) => {
        calendarBusySlots.push(...userCalendar.events);
      });

      return getBusySlotFromActivities(emailsList);
    })
    .then((activityBusySlots) => {
      return [...calendarBusySlots, ...activityBusySlots];
    })
    .catch((error) => {
      console.log("Error adfhab ", error);
      return [hostEmail];
    });
};

const getFreeSlots = (busySlots, timezoneOffset) => {
  const hourInMillisec = 60 * 60 * 1000; // 1 hour in ms
  const hours = 24 * 3; // how much time in future to suggest free slots
  const startingOffset = 2;
  const freeSlotPaddings = hourInMillisec / 2;

  const startTime = new Date(
    new Date().setHours(new Date().getHours() + startingOffset, 0, 0, 0)
  ).getTime();

  let freeSlots = [];

  for (var i = 0; i < hours; i++) {
    // check if time slot is free
    const timeSlot = new Date(startTime + hourInMillisec * i).toUTCString();

    if (
      timeSlotIsFree(
        timeSlot,
        busySlots,
        freeSlotPaddings,
        hourInMillisec,
        timezoneOffset
      )
    ) {
      freeSlots.push(timeSlot);
    }
  }
  return freeSlots;
};

const formatSuggestionDates = (freeSlots, timezoneOffset) => {
  let formatedDataList = [];

  freeSlots.forEach((freeSlot) => {
    let dayAlreadyExists = false;

    formatedDataList.forEach((formatedDataObj) => {
      if (
        compareTwoDaysWithTimeOffset(
          formatedDataObj.title,
          freeSlot,
          timezoneOffset
        )
      ) {
        dayAlreadyExists = true;
        formatedDataObj.data[0].push(freeSlot);
      }
    });

    if (!dayAlreadyExists) {
      formatedDataList.push({
        title: freeSlot,
        data: [[freeSlot]],
      });
    }
  });

  return formatedDataList;
};

compareTwoDaysWithTimeOffset = (date1, date2, timezoneOffset) => {
  dateObject1 = new Date(new Date(date1).getTime() - timezoneOffset * 60000);
  dateObject2 = new Date(new Date(date2).getTime() - timezoneOffset * 60000);

  if (
    dateObject1.getDate() == dateObject2.getDate() &&
    dateObject1.getMonth() == dateObject2.getMonth() &&
    dateObject1.getFullYear() == dateObject2.getFullYear()
  ) {
    return true;
  } else {
    return false;
  }
};

const getBusySlotFromActivities = (emails) => {
  let busySlots = [];

  return mongoFindSpecificField("events", {
    $or: [{ organiser: { $in: emails } }, { "guests.email": { $in: emails } }],
    isOld: false,
  })
    .then((events) => {
      events.forEach((event) => {
        emails.forEach((email) => {
          busySlots.push(...getBusySlotsForEvent(event, email));
        });
      });

      return busySlots;
    })
    .catch((error) => {
      console.log("Error &^$^DF ", error);
      return [];
    });
};

const getBusySlotsForEvent = (event, email) => {
  let busySlots = [];
  let validIdentifiers = [];

  if (event?.organiser != email) {
    event?.guests.forEach((guest) => {
      if (guest.email == email || event?.organiser == email) {
        validIdentifiers.push(guest.dateIdentifier);
      }
    });
  }

  const isValidBusySlot = (dateObject) => {
    return (
      (event?.organiser == email ||
        validIdentifiers.includes(dateObject.dateIdentifier)) &&
      dateObject.onlyHas == "dateTime" &&
      new Date(dateObject.dateString).getTime() > new Date().getTime()
    );
  };

  event?.dateObjects?.forEach((dateObject) => {
    if (isValidBusySlot(dateObject)) {
      busySlots.push({
        startDate: dateObject.dateString,
        endDate: new Date(
          new Date(dateObject.dateString).setHours(
            new Date(dateObject.dateString).getHours() + 1
          )
        ).toUTCString(), // start date plus 1 hour
      });
    }
  });

  return busySlots;
};

const timeSlotIsFree = (
  timeSlot,
  busySlots,
  freeSlotPaddings,
  hourInMilliseconds,
  timezoneOffset
) => {
  const slotInMs = new Date(timeSlot).getTime();
  const startFromHour = 10;

  if (new Date(slotInMs - timezoneOffset * 60000).getHours() < startFromHour) {
    return false;
  } else {
    let isFree = true;

    busySlots.forEach((busySlot) => {
      if (
        isNaN(Date.parse(busySlot.startDate)) == false && // checking if busy slot start date is legit date
        isNaN(Date.parse(busySlot.endDate)) == false && // checking if busy slot end date is legit date
        !(
          slotInMs + hourInMilliseconds + freeSlotPaddings <=
            new Date(busySlot.startDate).getTime() ||
          slotInMs - freeSlotPaddings >= new Date(busySlot.endDate).getTime()
        )
      ) {
        isFree = false;
      }
    });

    return isFree;
  }
};

module.exports = {
  getFreeSlots,
  getBusySlots,
  formatSuggestionDates,
};

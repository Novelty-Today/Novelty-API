const takeDifferenceBetweenDates = (date1, date2) => {
  let difference = date1 - date2;

  if (difference > 0) return 1;
  else if (difference == 0) return 0;
  else if (difference < 0) return -1;
};

const partOfDayIncrement = (part) => {
  switch (part) {
    case "morning":
      return 12 * 60 * 59 * 1000;
    case "day":
      return 17 * 60 * 59 * 1000;
    case "evening":
      return 21 * 60 * 59 * 1000;
    case "night":
      return 23 * 60 * 59 * 1000;
    default:
      break;
  }
};

const compareTwoDateObjects = (date1, date2) => {
  try {
    // undefined or null cases
    if (date1 && !date2) {
      return 1;
    } else if (!date1 && date2) {
      return -1;
    } else if (!date1 && !date2) {
      return 0;
    }
    // 1) case when both of dates is proper datetimes
    else if (date1.onlyHas == "dateTime" && date2.onlyHas == "dateTime") {
      return takeDifferenceBetweenDates(
        getMsFromDateRoundedToMinutes(date1.dateString),
        getMsFromDateRoundedToMinutes(date2.dateString)
      );
    }
    // 2) cases when both of dates has only date
    else if (date1.onlyHas == "date" && date2.onlyHas == "dateTime") {
      return takeDifferenceBetweenDates(
        getMsWithoutHours(date1.dateString) +
          partOfDayIncrement(date2.partOfDay),
        getMsFromDateRoundedToMinutes(date2.dateString)
      );
    } else if (date1.onlyHas == "dateTime" && date2.onlyHas == "date") {
      return takeDifferenceBetweenDates(
        getMsFromDateRoundedToMinutes(date1.dateString),
        getMsWithoutHours(date2.dateString) +
          partOfDayIncrement(date2.partOfDay)
      );
    } else if (date1.onlyHas == "date" && date2.onlyHas == "date") {
      return compareJustDates(date1, date2);
    }
    // case when one of the dates is Flexible date
    else if (date1.onlyHas == "none" && date2.onlyHas != "none") {
      return 1;
    } else if (date1.onlyHas != "none" && date2.onlyHas == "none") {
      return -1;
    } else if (date1.onlyHas == "none" && date2.onlyHas == "none") return 0;
  } catch (error) {
    logErrors("logErrors sfc3tg3we ", error);
    return 0;
  }
};

const isDateObjectOld = (dateObject, offset = 0) => {
  return compareTwoDateObjects(dateObject, {
    dateString: new Date(new Date().getTime() - offset).toUTCString(),
    onlyHas: "dateTime",
    partOfDay: "day",
  }) == 1
    ? false
    : true;
};

const compareJustDates = (dateObject1, dateObject2) => {
  const dateTimeObj1 = new Date(dateObject1.dateString);

  const year1 = dateTimeObj1.getFullYear();
  const month1 = dateTimeObj1.getMonth();
  const date1 = dateTimeObj1.getDate();

  const dateComp1 =
    new Date(year1, month1, date1).getTime() +
    partOfDayIncrement(dateObject1.partOfDay);

  const dateTimeObj2 = new Date(dateObject2.dateString);
  const year2 = dateTimeObj2.getFullYear();
  const month2 = dateTimeObj2.getMonth();
  const date2 = dateTimeObj2.getDate();

  const dateComp2 =
    new Date(year2, month2, date2).getTime() +
    partOfDayIncrement(dateObject2.partOfDay);

  if (dateComp1 == dateComp2) {
    return 0;
  } else if (dateComp1 > dateComp2) {
    return 1;
  } else {
    return -1;
  }
};

const getMsFromDateRoundedToMinutes = (dateString) => {
  return new Date(dateString).setSeconds(0, 0);
};

const getMsWithoutHours = (dateString) => {
  // returns ms from date string by only taking year month and date
  return new Date(new Date(dateString).setHours(0, 0, 0, 0));
};

const findClosestDateObject = (dateObjects = []) => {
  let closestDateObject;
  for (var i = 0; i < dateObjects.length; i++) {
    if (i == 0) {
      closestDateObject = dateObjects[i];
    } else if (
      (compareTwoDateObjects(closestDateObject, dateObjects[i]) == 1 &&
        compareTwoDateObjects(dateObjects[i], {
          dateString: new Date().toUTCString(),
          onlyHas: "dateTime",
        }) == 1) ||
      compareTwoDateObjects(closestDateObject, {
        dateString: new Date().toUTCString(),
        onlyHas: "dateTime",
      }) != 1
    ) {
      closestDateObject = dateObjects[i];
    }
  }
  return closestDateObject;
};

const getDateObjectWithIdentifier = (dateObjects = [], dateIdentifier = "") => {
  let object;
  dateObjects?.forEach((dateObject) => {
    if (dateObject.dateIdentifier == dateIdentifier) {
      object = dateObject;
    }
  });
  return object;
};

module.exports = {
  compareTwoDateObjects,
  findClosestDateObject,
  isDateObjectOld,
  getDateObjectWithIdentifier,
};

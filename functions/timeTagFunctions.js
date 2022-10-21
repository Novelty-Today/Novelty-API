const isToday = (date) => {
  const dateInCal = getDateInCal(new Date());
  return (
    date.date == dateInCal.date &&
    date.month == dateInCal.month &&
    date.year == dateInCal.year
  );
};

const isTommorow = (date) => {
  const dateInCal = getDateInCal(
    new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
  );
  return (
    date.date == dateInCal.date &&
    date.month == dateInCal.month &&
    date.year == dateInCal.year
  );
};

const isThisWeek = (date) => {
  const dateInCal = getDateInCal(new Date());
  const eventDate = new Date(date.year, date.month, date.date).getTime();

  const dateNow = new Date(
    dateInCal.year,
    dateInCal.month,
    dateInCal.date
  ).getTime();

  const weekDay = getDay(dateInCal.year, dateInCal.month, dateInCal.date);
  const endOfWeek = dateNow + (7 - weekDay) * 24 * 60 * 60 * 1000;

  return eventDate >= dateNow && endOfWeek >= eventDate;
};

const isNextWeek = (date) => {
  const dateInCal = getDateInCal(new Date());

  const dateNow = new Date(
    dateInCal.year,
    dateInCal.month,
    dateInCal.date
  ).getTime();

  const weekDay = getDay(dateInCal.year, dateInCal.month, dateInCal.date);

  const startOfNextWeek = dateNow + (8 - weekDay) * 24 * 60 * 60 * 1000;
  const endOfNextWeek = startOfNextWeek + 7 * 24 * 60 * 60 * 1000;

  const eventDate = new Date(date.year, date.month, date.date).getTime();

  return eventDate >= startOfNextWeek && endOfNextWeek >= eventDate;
};

const getDay = (year, month, date) => {
  const day = new Date(year, month, date).getDay();

  return day == 0 ? 7 : day;
};

const getDateInCal = (date) => {
  const dateInCal = date.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });

  return {
    date: dateInCal.split("/")[1],
    month: dateInCal.split("/")[0] - 1,
    year: dateInCal.split("/")[2].split(",")[0],
  };
};

const getClosestDateIdentifierWithTimeFilters = (
  dateObjects,
  timeFilters = []
) => {
  try {
    let dateIdentifier;

    dateObjects.forEach((dateObject) => {
      if (dateObject.onlyHas != "none") {
        timeFilters.forEach((timeFilter) => {
          const date = getDateInCal(new Date(dateObject.dateString));

          if (
            (timeFilter == "Today" && isToday(date)) ||
            (timeFilter == "Tomorrow" && isTommorow(date)) ||
            (timeFilter == "This week" && isThisWeek(date)) ||
            (timeFilter == "Next week" && isNextWeek(date))
          ) {
            dateIdentifier = dateObject.dateIdentifier;
          }
        });
      }
    });

    return dateIdentifier;
  } catch (error) {
    console.log("Error adgyadtad ", error);
    return null;
  }
};

module.exports = {
  isToday,
  isTommorow,
  isThisWeek,
  isNextWeek,
  getDateInCal,
  getClosestDateIdentifierWithTimeFilters,
};

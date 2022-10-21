const moment = require("moment-timezone");

const activityDateTimeFormat = (dateObject) => {
  try {
    if (dateObject.onlyHas == "none") {
      return "Flexible Time";
    } else if (dateObject.onlyHas == "date") {
      return activityDateFormater(dateObject);
    } else {
      return (
        activityDateFormater(dateObject) +
        " " +
        activityTimeFormater(dateObject)
      );
    }
  } catch (error) {
    console.log("Error KLJHJR&%$&% ", error);
    return "";
  }
};

const activityDateFormater = (dateObject, includeDayPart = true) => {
  try {
    if (dateObject.onlyHas == "none" || dateObject.onlyHas == "time") {
      return "Flexible Date";
    } else {
      const newDate = moment(dateObject.dateString).tz("America/Los_Angeles");
      const date = newDate.format("D");
      const month = monthNames[newDate.format("M") - 1];
      const year = newDate.format("YYYY");

      dateToReturn = `${date} ${month} / ${year} ${
        includeDayPart && dateObject.onlyHas == "date"
          ? dateObject.partOfDay
          : ""
      }`;

      return dateToReturn;
    }
  } catch (error) {
    console.log("Error %$I*FTG ", error);
    return "";
  }
};

const activityTimeFormater = (dateObject) => {
  try {
    if (dateObject.onlyHas == "none") {
      return "Flexible Time";
    } else if (dateObject.onlyHas == "date") {
      return dateObject.partOfDay;
    } else if (dateObject.onlyHas == "dateTime") {
      const newDate = moment(dateObject.dateString).tz("America/Los_Angeles");
      const hours = newDate.hours();
      const minutes = newDate.minutes();

      var amOrPm = "";
      var finalHours;
      if (hours >= 12) {
        finalHours = hours == 12 ? 12 : hours - 12;
        amOrPm = " PM";
      } else {
        finalHours = hours;
        amOrPm = " AM";
      }

      let dateToReturn = `${finalHours < 10 ? "0" + finalHours : finalHours}:${
        minutes < 10 ? "0" + minutes : minutes
      }${amOrPm}`;

      return dateToReturn;
    } else {
      return "";
    }
  } catch (error) {
    console.log("Error fjidahf ", error);
    return "";
  }
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

module.exports = {
  activityDateTimeFormat,
  activityDateFormater,
  activityTimeFormater,
};

const {
  getEventAttendanceControlTimes,
  getNoveltyTokenConfigs,
} = require("../configs");

const helperTimes = () => {
  const minInMs = 60 * 1000;
  const hourInMs = 60 * 60 * 1000;

  return `
    test server:<br><br>
    ${getTimes(
      getEventAttendanceControlTimes("debug"),
      getNoveltyTokenConfigs("debug"),
      minInMs,
      "minute"
    )} 

      <br><br><br>
    production server:<br><br>
    ${getTimes(
      getEventAttendanceControlTimes("production"),
      getNoveltyTokenConfigs("production"),
      hourInMs,
      "hour"
    )} 

    `;
};

const getTimes = (attendanceTimes, tokenTimes, devideBy = 0, minOrHour) => {
  return `<b> 
          first attendance confirmation notification : ${
            attendanceTimes.notifyGuestBeforeFirst / devideBy
          } ${minOrHour}<br>
          second attendance confirmation notification : ${
            attendanceTimes.notifyGuestBeforeSecond / devideBy
          } ${minOrHour}<br>
          reminder before moving guests to waitlist : ${
            attendanceTimes.reminderBeforeGuestsRemoval / devideBy
          } ${minOrHour}<br>
          moving guests to waitlist : ${
            attendanceTimes.unconfirmedGuestsRemoval / devideBy
          } ${minOrHour} <br>
          adding waitlisted people : ${
            attendanceTimes.addingWaitlistedPeople / devideBy
          } ${minOrHour}<br>
          first reminder before event : ${
            attendanceTimes.firstRemainder / devideBy
          } ${minOrHour}<br>
          second reminder before event : ${
            attendanceTimes.secondRemainder / devideBy
          } ${minOrHour}<br>
          automatically finish event : ${
            tokenTimes.eventAutoFinishTime / devideBy
          } ${minOrHour}<br>
          feedback reminder : ${
            tokenTimes.feedbackReminderTime / devideBy
          } ${minOrHour}<br>
          feedback write maximum time : ${
            tokenTimes.feedbackWriteMaxTime / devideBy
          } ${minOrHour}<br>
          automatically start verification : ${
            tokenTimes.verificationStartingTime / devideBy
          } ${minOrHour}<br>
          stake first reminder : ${
            tokenTimes.stakeFirstReminderTime / devideBy
          } ${minOrHour}    <br>
          stake second reminder : ${
            tokenTimes.stakeSecondReminderTime / devideBy
          } ${minOrHour}<br>
          stake timeout : ${tokenTimes.stakeTimeout / devideBy} ${minOrHour}<br>
          random verifier must be active for last : ${
            tokenTimes.randomVerifierLastActiveDate / devideBy
          } ${minOrHour} <br>
          stake required to verify : ${
            tokenTimes.stakeRequiredToVerifyEvent
          } $NC<br>
          minimum tokens requirement for chosing random verifier : ${
            tokenTimes.minimumTokenRequirementForRandomVerifier
          }  $NC<br>
          <b>
  `;
};

module.exports = { helperTimes };

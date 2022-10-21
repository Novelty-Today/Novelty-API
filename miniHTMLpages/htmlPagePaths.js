const path = require("path");

const htmlPage = {
  noLongerGuest: path.join(
    __dirname,
    "./requestAnswerHtmls/noLongerGuest.html"
  ),
  somethingWentWrong: path.join(
    __dirname,
    "./requestAnswerHtmls/somethingWentWrong.html"
  ),
  activityAttendanceConfirmed: path.join(
    __dirname,
    "./requestAnswerHtmls/activityAttendanceConfirmed.html"
  ),
  emailUnsubscribed: path.join(
    __dirname,
    "./requestAnswerHtmls/emailUnsubscribed.html"
  ),
  mailTemplateWithoutButton: path.join(
    __dirname,
    "./mailHtmls/mailTemplateWithoutButton.html"
  ),
  mailTemplateWithButton: path.join(
    __dirname,
    "./mailHtmls/mailTemplateWithButton.html"
  ),
  mailTemplateGreeting: path.join(
    __dirname,
    "./mailHtmls/mailTemplateGreeting.html"
  ),
  verifyWork: path.join(__dirname, "./nftMails/workVerify.html"),
};

module.exports = { htmlPage };

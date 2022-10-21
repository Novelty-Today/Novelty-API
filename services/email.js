const nodemailer = require("nodemailer");
const { SUPPORT_GMAIL, SUPPORT_GMAIL_PASSWORD } = require("../constants");

const sendEmail = (receiverEmail, subject, text, html) => {
  let fromMail = SUPPORT_GMAIL;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: fromMail,
      pass: SUPPORT_GMAIL_PASSWORD,
    },
  });
  let mailOptions = {
    from: fromMail,
    to: receiverEmail,
    subject,
    text,
    html,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };

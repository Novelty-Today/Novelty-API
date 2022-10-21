const AWS = require("aws-sdk");

const sendSMS = (phone, message) => {
  const params = {
    Message: message,
    /* required */
    PhoneNumber: phone,
  };
  const sns = new AWS.SNS({ region: "us-west-2" });
  return sns.publish(params).promise();
};

module.exports = { sendSMS };

const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const { MY_SECRET_KEY } = require("../constants");
const {
  getDynamicLinkBody,
  getHttpsRequestOptions,
} = require("./dynamicLinkFunctions");
const { getDynamicLink } = require("./dynamicLinkFunctions");
const { getHashedPassword } = require("./users");
const { mongoFindOneAndUpdate } = require("./mongodbDriver");
const { sendResetPasswordEmail } = require("../services/sendAllEmailTypes");

const handleForgotPassword = (user) => {
  const token = jwt.sign(
    { type: "resetPassword", id: user._id + "" },
    MY_SECRET_KEY
  );
  const body = getDynamicLinkBody(`resetPassword=${token}`);
  const httpsData = new TextEncoder().encode(JSON.stringify(body));
  const options = getHttpsRequestOptions(httpsData);

  return getDynamicLink(httpsData, options).then((dynamicLink) => {
    return sendResetPasswordEmail(user.email, dynamicLink);
  });
};

const resetPassword = (id, newPassword) => {
  return getHashedPassword(newPassword).then((hashedPass) => {
    return mongoFindOneAndUpdate(
      "users",
      { _id: ObjectId(id) },
      { $set: { password: hashedPass } }
    );
  });
};

module.exports = { handleForgotPassword, resetPassword };

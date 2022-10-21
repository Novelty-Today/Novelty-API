const mongoose = require("mongoose");
const User = mongoose.model("User");
const AnalyticData = mongoose.model("AnalyticData");

const getValidSessionId = (email) => {
  return AnalyticData.findOne({ email }).then((data) => {
    const lastActivityDate = data.activity[data.activity.length - 1].dateTime;
    if (new Date().getTime() - new Date(lastActivityDate).getTime() > 300000) {
      const newSessionId = new Date().getTime();
      return User.findOneAndUpdate(
        { email },
        { $set: { sessionId: newSessionId } }
      )
        .then(() => {
          return newSessionId;
        })
        .catch((error) => {
          console.log("Error io897tf6t ", error);
          return new Date().getTime();
        });
    } else {
      return User.findOne({ email })
        .then((user) => {
          return user.sessionId;
        })
        .catch((error) => {
          console.log("Error io897tf6t ", error);
          return new Date().getTime();
        });
    }
  });
};

module.exports = { getValidSessionId };

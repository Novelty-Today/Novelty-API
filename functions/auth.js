const { OAuth2Client } = require("google-auth-library");
const mongoose = require("mongoose");
const User = mongoose.model("User");

const verifyGoogleToken = (token, webClientId) => {
  return new Promise((resolve, reject) => {
    const client = new OAuth2Client(webClientId);

    client
      .verifyIdToken({
        idToken: token,
        audience: webClientId,
      })
      .then((ticket) => {
        const payload = ticket.getPayload();
        resolve(payload);
      })
      .catch((error) => {
        console.log("Error aof;sjgsria;gs;maa", error);
        reject(error);
      });
  });
};

const getUserAuthInfo = (data) => {
  return new Promise((resolve, reject) => {
    if (data.service == "Google") {
      verifyGoogleToken(data.info.idToken, data.webClientId).then(
        (userdata) => {
          if (userdata.email_verified) {
            const finalData = {
              id: userdata.sub,
              email: userdata.email,
            };
            resolve(finalData);
          } else {
            reject("Google email not verified >>>>>>>>>>>>><>>>>>>");
          }
        }
      );
    } else if (data.service == "Apple") {
      if (data.email) {
        resolve({
          id: data.id,
          email: data.email,
        });
      } else {
        User.findOne({ "connectedAccounts.id": data.id }).then((userdata) => {
          resolve({
            id: data.id,
            email: userdata ? userdata.email : "",
          });
        });
      }
    } else {
      reject("Google email not verified or other error,>>>>>>>>>>>>>>> ");
    }
  });
};

module.exports = { getUserAuthInfo };

const fetch = require("node-fetch");
const mongoose = require("mongoose");
const { ZOOM_CONFIG } = require("../constants");
const User = mongoose.model("User");
const jwt = require("jsonwebtoken");

const createZoomJWTToken = () => {
  const tokenExpiration = 60000; // 1 min
  return jwt.sign(
    {
      iss: ZOOM_CONFIG.JWT_API_KEY,
      exp: new Date().getTime() + tokenExpiration,
    },
    ZOOM_CONFIG.JWT_API_SECRET_KEY
  );
};

const scheduleMeeting = (email, token) => {
  const params = {
    method: "POST",
    body: getScheduleMeetingBody(),
    headers: {
      "User-Agent": "Zoom-api-Jwt-Request",
      "content-type": "application/json",
      Authorization: "Bearer " + token,
    },
    json: true,
  };

  return fetch("https://api.zoom.us/v2/users/" + email + "/meetings", params)
    .then((result) => {
      return result.json();
    })
    .then((result) => {
      return result?.join_url?.toString();
    });
};

const createZoomUser = (user, email) => {
  let zoomUserData;

  const token = createZoomJWTToken();

  return fetch("https://api.zoom.us/v2/users", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      user_info: {
        email: email,
        type: 1,
        first_name: user.name,
        last_name: user.lastname,
      },
    }),
    headers: {
      "User-Agent": "Zoom-api-Jwt-Request",
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    json: true,
  })
    .then((result) => {
      return result.json();
    })
    .then((result) => {
      zoomUserData = result;
      return Promise.all([
        giveZoomUserAdminPrivileges(email, token),
        User.findOneAndUpdate(
          { email: user.email },
          {
            $set: {
              "zoomConnection.zoomEmail": email,
              accessToken: null,
              refreshToken: null,
            },
          }
        ),
      ]);
    })
    .then(() => {
      return zoomUserData;
    })
    .catch((error) => {
      console.log("Error fjah ", error);
      return null;
    });
};

const removeZoomUser = (email) => {
  return User.findOneAndUpdate(
    { email: email },
    {
      $set: {
        zoomConnection: {
          zoomEmail: null,
          accessToken: null,
          refreshToken: null,
        },
      },
    }
  );
};

const giveZoomUserAdminPrivileges = (email, token) => {
  return fetch("https://api.zoom.us/v2/roles/1/members", {
    method: "POST",
    body: JSON.stringify({ members: [{ email: email }] }),
    headers: {
      "User-Agent": "Zoom-api-Jwt-Request",
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    json: true,
  });
};

const refreshZoomToken = (refreshToken, email) => {
  const url = `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${refreshToken}&redirect_uri=${ZOOM_CONFIG.redirect_uri}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          ZOOM_CONFIG.clientId + ":" + ZOOM_CONFIG.clientSecret
        ).toString("base64"),
    },
  })
    .then((result) => {
      return result.json();
    })
    .then((result) => {
      return User.findOneAndUpdate(
        { email: email },
        {
          $set: {
            "zoomConnection.accessToken": result.access_token,
            "zoomConnection.refreshToken": result.refresh_token,
          },
        }
      ).then(() => {
        return result.access_token;
      });
    });
};

const getScheduleMeetingBody = () => {
  // see all props on link https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
  return JSON.stringify({
    type: 3,
    settings: {
      alternative_hosts: "",
      waiting_room: true,
    },
  });
};

module.exports = {
  scheduleMeeting,
  createZoomUser,
  refreshZoomToken,
  removeZoomUser,
};

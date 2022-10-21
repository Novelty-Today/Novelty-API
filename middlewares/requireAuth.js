const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const { MY_SECRET_KEY } = require("../constants");

const requireAuth = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).send({ error: "You must be logged in." });
  }

  const token = authorization.replace("Bearer ", "");
  if (token) {
    jwt.verify(token, MY_SECRET_KEY, async (error, payload) => {
      if (error) {
        console.log("Auth Error", req.originalUrl, error);
        return res.status(401).send({ error: "You must be logged in." });
      }
      const { userId } = payload;

      if (userId) {
        User.findById(userId).then((user) => {
          if (!user) {
            return res.status(401).send({ message: "Token is not valid." });
          } else {
            req.user = user;
            next();
          }
        });
      } else {
        return res.status(401).send({ message: "Token is not valid." });
      }
    });
  } else {
    return res.status(401).send({ message: "There is no token." });
  }
};

module.exports = { requireAuth };

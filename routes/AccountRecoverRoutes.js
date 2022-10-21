const express = require("express");
const router = express.Router();
const { decodeToken } = require("../functions/handleInvitationToken");
const { mongoFindOne } = require("../functions/mongodbDriver");
const {
  handleForgotPassword,
  resetPassword,
} = require("../functions/accountRecoverFunctions");

router.post("/forgotPassword", (req, res) => {
  mongoFindOne("users", { email: req.body.email.toLowerCase()?.trim?.() })
    .then((user) => {
      if (user) {
        return handleForgotPassword(user).then(() => {
          res.send({ status: "success" });
        });
      } else {
        res.send({
          status: "fail",
          message: "Could not find account associated with that email.",
        });
      }
    })
    .catch((error) => {
      console.log("Error aifgay76t ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

router.post("/resetPassword", (req, res) => {
  decodeToken(req.body.recoveryToken)
    .then((payload) => {
      if (payload.type == "resetPassword" && payload.id) {
        return resetPassword(payload.id, req.body.newPassword).then((user) => {
          res.send({
            status: "success",
            message: "Password was reset successfuly.",
            email: user.email,
          });
        });
      } else {
        res.send({
          status: "fail",
          message: "Could not reset password. Please use correct reset link.",
        });
      }
    })
    .catch((error) => {
      console.log("Error aifdyautuygay76t ", error);
      res.send({
        status: "fail",
        message: "Something went wrong. Please try again.",
      });
    });
});

module.exports = router;

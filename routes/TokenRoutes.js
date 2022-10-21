const express = require("express");
const router = express.Router();
const { noveltyActionsToAmounts } = require("../constants");

router.get("/noveltyActionsToAmounts", (req, res) => {
  res.send({ status: "success", noveltyActionsToAmounts });
});

module.exports = router;

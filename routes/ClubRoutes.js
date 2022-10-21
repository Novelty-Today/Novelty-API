const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/requireAuth");
const { stanfordClubsList } = require("../DataLists/stanfordClubsList");

router.get("/getAllClubs", requireAuth, (req, res) => {
  res.send({ status: "success", clubs: stanfordClubsList });
});

module.exports = router;

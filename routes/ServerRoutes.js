const express = require("express");
const router = express.Router();
const path = require("path");
const { validEmails } = require("../DataLists/emails");
const { parseDynamicLink } = require("../functions/dynamicLinkFunctions");

router.get("/.well-known/assetlinks.json", (req, res) => {
  res.sendFile(path.join(__dirname.split("routes")[0], "assetlinks.json"));
});

router.get("/assetlinks.json", (req, res) => {
  res.sendFile(path.join(__dirname.split("routes")[0], "assetlinks.json"));
});

router.get("/.well-known/apple-app-site-association", (req, res) => {
  res.sendFile(
    path.join(__dirname.split("routes")[0], "apple-app-site-association.json")
  );
});

router.get("/apple-app-site-association", (req, res) => {
  res.sendFile(
    path.join(__dirname.split("routes")[0], "apple-app-site-association.json")
  );
});

router.get("/utcTime", (req, res) => {
  const dateString = new Date(new Date().toUTCString());
  res.send({ dateString });
});

router.get("/port", (req, res) => {
  var ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(req.headers);
  res.send({
    process: process?.env?.NODE_APP_INSTANCE,
    ip,
    cookies: req.headers.cookie,
  });
});

router.get("/toNoveltyApp", (req, res) => {
  if (
    req.headers["user-agent"].includes("iPhone") ||
    req.headers["user-agent"].includes("iphone") ||
    req.headers["user-agent"].includes("android") ||
    req.headers["user-agent"].includes("Android")
  ) {
    res.redirect(`novelty://${req.query.event}`);
  } else {
    if (req.query.event) {
      res.redirect(`https://app.novelty.today/events/${req.query.event}`);
    } else if (req.query.writeFeedback) {
      const params = parseDynamicLink(req.query.writeFeedback);
      res.redirect(
        `https://app.novelty.today/events/${params.eventId}/feedback?dateIdentifier=${params?.dateIdentifier}`
      );
    } else if (req.query.verifyEvent) {
      const params = parseDynamicLink(req.query.verifyEvent);
      res.redirect(
        `https://app.novelty.today/verification/${params.eventId}/${params?.dateIdentifier}`
      );
    } else if (req.query.resetPassword) {
      res.redirect(
        `https://app.novelty.today/reset-password?token=${req.query.resetPassword}`
      );
    } else {
      res.redirect(`https://novelty.today`);
    }
  }
});

router.get("/downloadApp", (req, res) => {
  if (
    req.headers["user-agent"].includes("iPhone") ||
    req.headers["user-agent"].includes("iphone")
  ) {
    res.redirect("https://apps.apple.com/us/app/novelty-today/id1563260378");
  } else if (
    req.headers["user-agent"].includes("android") ||
    req.headers["user-agent"].includes("Android")
  ) {
    res.redirect(
      "https://play.google.com/store/apps/details?id=com.test.novelty"
    );
  } else {
    res.redirect("https://novelty.today");
  }
});

router.get("/sockets", (req, res) => {
  let clients = [];
  clients = Object.keys(ioPrivate.engine.clients);

  res.send({ clients, count: clients.length });
});

router.get("/validEmails", (req, res) => {
  res.send(validEmails);
});

router.get("/test", (req, res) => {
  res.send("success");
});

router.get("/*", (req, res) => {
  res.send({ message: "Page not found" });
});

module.exports = router;

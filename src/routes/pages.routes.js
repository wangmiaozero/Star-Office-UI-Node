"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");

const config = require("../config");

const router = express.Router();

router.get("/", (req, res) => {
  const html = fs.readFileSync(path.join(config.FRONTEND_DIR, "index.html"), "utf-8");
  res.type("html").send(html.replaceAll("{{VERSION_TIMESTAMP}}", config.VERSION_TIMESTAMP));
});

router.get("/join", (req, res) => {
  const html = fs.readFileSync(path.join(config.FRONTEND_DIR, "join.html"), "utf-8");
  res.type("html").send(html);
});

router.get("/invite", (req, res) => {
  const html = fs.readFileSync(path.join(config.FRONTEND_DIR, "invite.html"), "utf-8");
  res.type("html").send(html);
});

module.exports = router;

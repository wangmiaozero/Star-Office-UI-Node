"use strict";

const express = require("express");

const memoService = require("../services/memo.service");

const router = express.Router();

router.get("/yesterday-memo", (req, res) => {
  try {
    const result = memoService.getYesterdayMemo();
    if (result.success) return res.json(result);
    return res.json({ success: false, msg: result.msg });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message });
  }
});

module.exports = router;

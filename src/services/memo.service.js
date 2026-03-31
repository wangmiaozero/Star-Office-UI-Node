"use strict";

const fs = require("fs");
const path = require("path");

const config = require("../config");
const { sanitizeContent } = require("../utils/sanitize");

function extractMemoFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const corePoints = [];
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith("#")) continue;
      if (line.startsWith("- ")) corePoints.push(line.slice(2).trim());
      else if (line.length > 10) corePoints.push(line);
    }

    if (!corePoints.length) {
      return "「昨日无事记录」\n\n若有恒，何必三更眠五更起；最无益，莫过一日曝十日寒。";
    }

    const selectedPoints = corePoints.slice(0, 3);
    const wisdomQuotes = [
      "「工欲善其事，必先利其器。」",
      "「不积跬步，无以至千里；不积小流，无以成江海。」",
      "「知行合一，方可致远。」",
      "「业精于勤，荒于嬉；行成于思，毁于随。」",
      "「路漫漫其修远兮，吾将上下而求索。」",
      "「昨夜西风凋碧树，独上高楼，望尽天涯路。」",
      "「衣带渐宽终不悔，为伊消得人憔悴。」",
      "「众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。」",
      "「世事洞明皆学问，人情练达即文章。」",
      "「纸上得来终觉浅，绝知此事要躬行。」"
    ];
    const quote = wisdomQuotes[Math.floor(Math.random() * wisdomQuotes.length)];
    const result = [];

    for (const pointRaw of selectedPoints) {
      let point = sanitizeContent(pointRaw);
      if (point.length > 40) point = `${point.slice(0, 37)}...`;
      if (point.length <= 20) result.push(`· ${point}`);
      else {
        for (let i = 0; i < point.length; i += 20) {
          const chunk = point.slice(i, i + 20);
          result.push(i === 0 ? `· ${chunk}` : `  ${chunk}`);
        }
      }
    }

    if (quote.length <= 20) result.push(`\n${quote}`);
    else {
      for (let i = 0; i < quote.length; i += 20) {
        const chunk = quote.slice(i, i + 20);
        result.push(i === 0 ? `\n${chunk}` : chunk);
      }
    }

    return result.join("\n").trim();
  } catch (err) {
    console.error("提取 memo 失败:", err.message);
    return "「昨日记录加载失败」\n\n「往者不可谏，来者犹可追。」";
  }
}

function getYesterdayMemo() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
  const yesterdayFile = path.join(config.MEMORY_DIR, `${yesterdayStr}.md`);

  let targetFile = null;
  let targetDate = yesterdayStr;

  if (fs.existsSync(yesterdayFile)) {
    targetFile = yesterdayFile;
  } else if (fs.existsSync(config.MEMORY_DIR)) {
    const files = fs
      .readdirSync(config.MEMORY_DIR)
      .filter((f) => f.endsWith(".md") && /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    for (const f of files) {
      if (f !== `${todayStr}.md`) {
        targetFile = path.join(config.MEMORY_DIR, f);
        targetDate = f.replace(".md", "");
        break;
      }
    }
  }

  if (targetFile && fs.existsSync(targetFile)) {
    return { success: true, date: targetDate, memo: extractMemoFromFile(targetFile) };
  }

  return { success: false, msg: "没有找到昨日日记" };
}

module.exports = { extractMemoFromFile, getYesterdayMemo };

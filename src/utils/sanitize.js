"use strict";

function sanitizeContent(text) {
  let out = String(text || "");
  out = out.replace(/ou_[a-f0-9]+/g, "[用户]");
  out = out.replace(/user_id="[^"]+"/g, 'user_id="[隐藏]"');
  out = out.replace(/\/root\/[^"\s]+/g, "[路径]");
  out = out.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[IP]");
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[邮箱]");
  out = out.replace(/1[3-9]\d{9}/g, "[手机号]");
  return out;
}

module.exports = { sanitizeContent };

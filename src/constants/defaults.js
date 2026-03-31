"use strict";

const DEFAULT_STATE = {
  state: "idle",
  detail: "等待任务中...",
  progress: 0,
  updated_at: new Date().toISOString()
};

const DEFAULT_AGENTS = [
  {
    agentId: "star",
    name: "Star",
    isMain: true,
    state: "idle",
    detail: "待命中，随时准备为你服务",
    updated_at: new Date().toISOString(),
    area: "breakroom",
    source: "local",
    joinKey: null,
    authStatus: "approved",
    authExpiresAt: null,
    lastPushAt: null
  },
  {
    agentId: "npc1",
    name: "NPC 1",
    isMain: false,
    state: "writing",
    detail: "在整理热点日报...",
    updated_at: new Date().toISOString(),
    area: "writing",
    source: "demo",
    joinKey: null,
    authStatus: "approved",
    authExpiresAt: null,
    lastPushAt: null
  }
];

module.exports = { DEFAULT_STATE, DEFAULT_AGENTS };

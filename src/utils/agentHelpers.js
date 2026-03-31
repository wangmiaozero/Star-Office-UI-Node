"use strict";

function normalizeAgentState(s) {
  if (!s) return "idle";
  const v = String(s).trim().toLowerCase();
  if (["working", "busy", "write"].includes(v)) return "writing";
  if (["run", "running", "execute", "exec"].includes(v)) return "executing";
  if (["sync"].includes(v)) return "syncing";
  if (["research", "search"].includes(v)) return "researching";
  if (["idle", "writing", "researching", "executing", "syncing", "error"].includes(v)) return v;
  return "idle";
}

function stateToArea(state) {
  const areaMap = {
    idle: "breakroom",
    writing: "writing",
    researching: "writing",
    executing: "writing",
    syncing: "writing",
    error: "error"
  };
  return areaMap[state] || "breakroom";
}

function randomAvatar() {
  const pool = ["guest_role_1", "guest_role_2", "guest_role_3", "guest_role_4", "guest_role_5", "guest_role_6"];
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { normalizeAgentState, stateToArea, randomAvatar };

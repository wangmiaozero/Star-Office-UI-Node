"use strict";

/**
 * 启动前校验：Node 最低版本 + 须通过 pnpm 调用（或显式跳过）。
 * 与 package.json engines 保持一致。
 */

const MIN_NODE = [20, 0, 0];

function parseNodeVersion(versionString) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(versionString || ""));
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function versionGte(current, minimum) {
  for (let i = 0; i < 3; i += 1) {
    if (current[i] > minimum[i]) return true;
    if (current[i] < minimum[i]) return false;
  }
  return true;
}

function isPnpmInvocation() {
  if (process.env.SKIP_PNPM_CHECK === "1") return true;

  const ua = process.env.npm_config_user_agent || "";
  if (ua.includes("pnpm")) return true;

  const execPath = process.env.npm_execpath || "";
  if (execPath.includes("pnpm")) return true;

  return false;
}

function enforce() {
  const current = parseNodeVersion(process.version);
  if (!current || !versionGte(current, MIN_NODE)) {
    console.error(
      `[star-office-ui] 需要 Node.js >= ${MIN_NODE.join(".")}，当前: ${process.version}`
    );
    process.exit(1);
  }

  if (!isPnpmInvocation()) {
    console.error("[star-office-ui] 必须使用 pnpm 安装与启动本项目。");
    console.error("[star-office-ui] 示例: pnpm install && pnpm start");
    console.error("[star-office-ui] 若在无 pnpm 的环境（仅调试用），可设置 SKIP_PNPM_CHECK=1");
    process.exit(1);
  }
}

enforce();

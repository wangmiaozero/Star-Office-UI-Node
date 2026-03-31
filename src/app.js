"use strict";

const express = require("express");
const cors = require("cors");

const config = require("./config");
const cacheHeaders = require("./middleware/cacheHeaders");
const pagesRoutes = require("./routes/pages.routes");
const healthRoutes = require("./routes/health.routes");
const stateRoutes = require("./routes/state.routes");
const agentsRoutes = require("./routes/agents.routes");
const memoRoutes = require("./routes/memo.routes");

function createApp() {
  const app = express();

  if (config.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(cacheHeaders);

  app.use(
    "/static",
    express.static(config.FRONTEND_DIR, {
      etag: false,
      lastModified: false,
      maxAge: 0
    })
  );

  app.use(pagesRoutes);
  app.use(healthRoutes);
  app.use(stateRoutes);
  app.use(agentsRoutes);
  app.use(memoRoutes);

  return app;
}

module.exports = { createApp };

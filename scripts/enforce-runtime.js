#!/usr/bin/env node
"use strict";

const { assertNodeVersion, assertPnpmToolchain } = require("./runtime-common");
assertNodeVersion();
assertPnpmToolchain();

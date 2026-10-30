#!/usr/bin/env node

import('../dist/cli.js')
  .then((m) => {
    if (m.runCLI) {
      m.runCLI();
    }
  })
  .catch((err) => {
    console.error('DriveKit CLI Error:', err);
    process.exit(1);
  });


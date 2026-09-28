#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--test', 'tests/battery.test.mjs'], { stdio: 'inherit' });
process.exit(r.status ?? 1);

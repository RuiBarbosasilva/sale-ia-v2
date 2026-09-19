#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const mode = process.argv[2] || 'verify';
const targets = { verify:'verify.js', repair:'repair.js', transaction:'transaction.js' };
if (!targets[mode]) { console.error('Guardian: modo inválido. Use verify, repair ou transaction.'); process.exit(2); }
const r = spawnSync(process.execPath,[path.join(__dirname,targets[mode]),...process.argv.slice(3)],{stdio:'inherit',env:process.env});
process.exit(r.status == null ? 1 : r.status);

#!/usr/bin/env node

// ABOUTME: Main entry point for the private journal CLI
// ABOUTME: Delegates process arguments to the shared CLI dispatcher

import { runCli } from './cli';

async function main(): Promise<void> {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(2);
});

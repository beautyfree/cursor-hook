#!/usr/bin/env node

/**
 * Cursor Hook CLI - Main entry point
 */

import { Command } from 'commander';
import { installHooks } from './commands/install';

const program = new Command();

program
  .name('cursor-hook')
  .description('CLI tool to install Cursor hooks from Git repositories')
  .version('0.1.0');

program
  .command('install')
  .description('Install hooks from a Git repository or local directory')
  .argument('<repository>', 'Repository reference (e.g., owner/repo, full Git URL) or local directory path')
  .action(async (repo: string) => {
    await installHooks({ repo });
  });

// Parse command line arguments
program.parse();

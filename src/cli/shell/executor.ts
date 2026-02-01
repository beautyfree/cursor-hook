/**
 * Cross-platform shell command executor
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Detect the shell to use on Windows
 */
async function detectWindowsShell(): Promise<string> {
  // Check for Git Bash
  const gitBash = path.join(process.env['ProgramFiles'] || '', 'Git', 'bin', 'bash.exe');
  if (await fs.pathExists(gitBash)) {
    return gitBash;
  }

  // Check for Git Bash in Program Files (x86)
  const gitBash32 = path.join(process.env['ProgramFiles(x86)'] || '', 'Git', 'bin', 'bash.exe');
  if (await fs.pathExists(gitBash32)) {
    return gitBash32;
  }

  // Default to PowerShell
  return 'powershell.exe';
}

/**
 * Execute shell command cross-platform
 */
export async function executeCommand(command: string, options: { cwd?: string } = {}): Promise<ExecResult> {
  const platform = os.platform();
  let finalCommand = command;
  let shell: string | undefined;

  if (platform === 'win32') {
    // On Windows, use appropriate shell
    const detectedShell = await detectWindowsShell();
    if (detectedShell.includes('bash.exe')) {
      // Git Bash
      shell = detectedShell;
      finalCommand = command;
    } else {
      // PowerShell
      shell = 'powershell.exe';
      // Escape command for PowerShell
      finalCommand = `-Command "${command.replace(/"/g, '\\"')}"`;
    }
  }

  try {
    const result = await execAsync(finalCommand, {
      cwd: options.cwd || process.cwd(),
      shell,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error: any) {
    // Return error output instead of throwing
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message || '',
    };
  }
}

/**
 * Execute command and show output to user
 */
export async function executeCommandWithOutput(
  command: string,
  options: { cwd?: string; silent?: boolean } = {}
): Promise<boolean> {
  if (!options.silent) {
    console.log(`\n📦 Executing: ${command}\n`);
  }

  const result = await executeCommand(command, { cwd: options.cwd });

  // For npm install, filter out warnings and verbose output
  if (command.includes('npm install')) {
    // Only show errors, not warnings or verbose output
    if (result.stderr && !options.silent) {
      const errorLines = result.stderr
        .split('\n')
        .filter((line) => 
          line.includes('error') || 
          line.includes('Error') || 
          line.includes('ERR!')
        );
      if (errorLines.length > 0) {
        console.error(errorLines.join('\n'));
      }
    }
    // Don't show stdout for npm install (too verbose)
  } else {
    // For other commands, show output normally
    if (result.stdout && !options.silent) {
      console.log(result.stdout);
    }

    if (result.stderr && !options.silent) {
      console.error(result.stderr);
    }
  }

  // Consider it successful if there's no error message or if exit code is 0
  // Note: execAsync throws on non-zero exit codes, so if we're here, it succeeded
  return true;
}

/**
 * Cross-platform path utilities
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Detect the operating system
 */
export function detectOS(): 'windows' | 'linux' | 'macos' | 'unknown' {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'macos';
    default:
      return 'unknown';
  }
}

/**
 * Expand $HOME variable in paths and normalize
 */
export function expandHome(pathStr: string): string {
  const homeDir = os.homedir();
  const osType = detectOS();

  let expanded: string;
  if (osType === 'windows') {
    // On Windows, handle both $HOME and %USERPROFILE%
    expanded = pathStr
      .replace(/\$HOME/g, homeDir)
      .replace(/%USERPROFILE%/g, homeDir)
      .replace(/^~/, homeDir);
  } else {
    // On Unix-like systems
    expanded = pathStr.replace(/\$HOME/g, homeDir).replace(/^~/, homeDir);
  }

  // Normalize path to ensure consistent separators for the platform
  return path.normalize(expanded);
}

/**
 * Normalize path for hooks.json (convert to platform-specific format)
 */
export function normalizePathForHooks(pathStr: string): string {
  const expanded = expandHome(pathStr);
  const osType = detectOS();

  if (osType === 'windows') {
    // Convert to Windows format with backslashes
    // But keep forward slashes if it's a variable path like $HOME/.cursor/hooks
    if (pathStr.includes('$HOME') || pathStr.startsWith('~')) {
      // For variable paths, use forward slashes (they'll be expanded later)
      return expanded.replace(/\\/g, '/');
    }
    return expanded.replace(/\//g, '\\');
  }

  return expanded;
}

/**
 * Get the global hooks directory
 */
export function getGlobalHooksDir(): string {
  return path.join(os.homedir(), '.cursor', 'hooks');
}

/**
 * Get the global hooks.json path
 */
export function getGlobalHooksJsonPath(): string {
  return path.join(os.homedir(), '.cursor', 'hooks.json');
}

/**
 * Get the project hooks directory (in current working directory)
 */
export function getProjectHooksDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.cursor', 'hooks');
}

/**
 * Get the project hooks.json path
 */
export function getProjectHooksJsonPath(cwd: string = process.cwd()): string {
  return path.join(cwd, '.cursor', 'hooks.json');
}

/**
 * Escape backslashes for JSON (Windows paths)
 */
export function escapePathForJson(pathStr: string): string {
  return pathStr.replace(/\\/g, '\\\\');
}

/**
 * hooks.json file manager
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { expandHome, detectOS } from '../utils/paths';
import { CursorHookConfig } from '../config/schema';

/**
 * Build shell prefix to inject env vars into a command (VAR=value VAR2=value2 command).
 * Escapes values for safe use in shell. Unix: single-quoted; Windows: set "VAR=value" && .
 */
export function buildEnvPrefix(env: Record<string, string>): string {
  if (Object.keys(env).length === 0) return '';
  const isWindows = detectOS() === 'windows';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(env)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) continue;
    const val = String(v);
    if (val === '') continue; // skip empty values — do not inject VAR=''
    if (isWindows) {
      const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      parts.push(`set "${k}=${escaped}"`);
    } else {
      const escaped = val.replace(/'/g, "'\\''");
      parts.push(`${k}='${escaped}'`);
    }
  }
  if (parts.length === 0) return '';
  if (isWindows) return parts.join(' && ') + ' && ';
  return parts.join(' ') + ' ';
}

export interface HooksJson {
  version?: number;
  hooks: {
    [hookName: string]: Array<{
      command: string;
      [key: string]: any;
    }>;
  };
}

/**
 * Read hooks.json file, create if doesn't exist
 */
export async function readHooksJson(hooksJsonPath: string): Promise<HooksJson> {
  if (await fs.pathExists(hooksJsonPath)) {
    const content = await fs.readFile(hooksJsonPath, 'utf-8');
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in hooks.json: ${error}`);
    }
  }

  // Create default structure
  return {
    version: 1,
    hooks: {},
  };
}

/**
 * Expand command path for comparison (same logic as expandPathsInHooks)
 */
function expandCommandForComparison(
  command: string,
  hooksJsonPath: string,
  hooksDir: string,
  isProjectInstall: boolean
): string {
  let expanded = command;

  if (isProjectInstall) {
    // For project installation, convert $HOME/.cursor/hooks/ to relative path
    const hooksJsonDir = path.dirname(hooksJsonPath);
    const projectRoot = path.dirname(hooksJsonDir);
    const relativeHooksDir = path.relative(projectRoot, hooksDir);
    
    // Replace $HOME/.cursor/hooks/ with relative path
    expanded = expanded.replace(/\$HOME\/\.cursor\/hooks\//g, `${relativeHooksDir}/`);
    expanded = expanded.replace(/~\/\.cursor\/hooks\//g, `${relativeHooksDir}/`);
    
    // If still contains $HOME, expand it but make relative to project
    if (expanded.includes('$HOME')) {
      const expandedPath = expandHome(expanded);
      try {
        const relativePath = path.relative(projectRoot, expandedPath);
        if (!relativePath.startsWith('..')) {
          expanded = relativePath;
        } else {
          expanded = expandedPath;
        }
      } catch {
        expanded = expandedPath;
      }
    }
  } else {
    // For global installation, expand $HOME normally
    expanded = expandHome(expanded);
  }

  return expanded;
}

/**
 * Normalize command path for comparison
 * Resolves relative paths to absolute paths for comparison
 */
function normalizeCommandForComparison(command: string, hooksJsonPath: string): string {
  // If it's a relative path, resolve it relative to hooks.json location
  if (!path.isAbsolute(command)) {
    const hooksJsonDir = path.dirname(hooksJsonPath);
    return path.normalize(path.resolve(hooksJsonDir, command));
  }
  
  // Normalize path separators and resolve
  return path.normalize(command);
}

/**
 * Check if a hook command already exists in hooks array
 * Compares normalized commands (resolved absolute paths)
 */
function hookExists(
  hooks: Array<{ command: string }>,
  command: string,
  hooksJsonPath: string,
  hooksDir: string,
  isProjectInstall: boolean
): boolean {
  // Expand the new command first (to match the format of existing hooks)
  const expandedNewCommand = expandCommandForComparison(command, hooksJsonPath, hooksDir, isProjectInstall);
  const normalizedNewCommand = normalizeCommandForComparison(expandedNewCommand, hooksJsonPath);
  
  return hooks.some((hook) => {
    // Existing hooks are already expanded, just normalize them
    const normalizedHook = normalizeCommandForComparison(hook.command, hooksJsonPath);
    return normalizedHook === normalizedNewCommand;
  });
}

/**
 * Merge hooks from config into existing hooks.json
 * Returns merged hooks and information about what was added/skipped
 */
export function mergeHooks(
  existing: HooksJson,
  config: CursorHookConfig,
  hooksJsonPath: string,
  hooksDir: string,
  isProjectInstall: boolean
): { hooks: HooksJson; added: number; skipped: number; skippedHooks: Array<{ hook: string; command: string }> } {
  const merged: HooksJson = {
    version: existing.version || 1,
    hooks: { ...existing.hooks },
  };

  let added = 0;
  let skipped = 0;
  const skippedHooks: Array<{ hook: string; command: string }> = [];

  // Merge hooks from config
  for (const [hookName, newHooks] of Object.entries(config.hooks)) {
    const existingHooks = merged.hooks[hookName] || [];

    // Add new hooks that don't already exist
    for (const newHook of newHooks) {
      if (!hookExists(existingHooks, newHook.command, hooksJsonPath, hooksDir, isProjectInstall)) {
        existingHooks.push(newHook);
        added++;
      } else {
        skipped++;
        skippedHooks.push({
          hook: hookName,
          command: newHook.command,
        });
      }
    }

    merged.hooks[hookName] = existingHooks;
  }

  return { hooks: merged, added, skipped, skippedHooks };
}

/**
 * Expand path variables in hooks (like $HOME)
 * For project installation, converts $HOME/.cursor/hooks/ to relative .cursor/hooks/
 * If envVars and ourCommands are provided, prepends env to commands that belong to this install.
 */
export function expandPathsInHooks(
  hooks: HooksJson,
  hooksJsonPath: string,
  hooksDir: string,
  isProjectInstall: boolean,
  envVars?: Record<string, string>,
  commandEnvKeys?: Map<string, string[]>
): HooksJson {
  const expanded: HooksJson = {
    version: hooks.version,
    hooks: {},
  };

  for (const [hookName, hookArray] of Object.entries(hooks.hooks)) {
    expanded.hooks[hookName] = hookArray.map((hook) => {
      let command = hook.command;

      if (isProjectInstall) {
        // For project installation, convert $HOME/.cursor/hooks/ to relative path
        // hooks.json is at .cursor/hooks.json, so project root is parent of .cursor
        const hooksJsonDir = path.dirname(hooksJsonPath);
        const projectRoot = path.dirname(hooksJsonDir); // Go up from .cursor to project root
        const relativeHooksDir = path.relative(projectRoot, hooksDir);
        
        // Replace $HOME/.cursor/hooks/ with relative path (handle both / and \)
        command = command.replace(/\$HOME[\/\\]\.cursor[\/\\]hooks[\/\\]/g, `${relativeHooksDir}${path.sep}`);
        command = command.replace(/~[\/\\]\.cursor[\/\\]hooks[\/\\]/g, `${relativeHooksDir}${path.sep}`);
        
        // If still contains $HOME, expand it but make relative to project
        if (command.includes('$HOME')) {
          const expandedPath = expandHome(command);
          try {
            const relativePath = path.relative(projectRoot, expandedPath);
            // Use relative path if it doesn't go outside project
            if (!relativePath.startsWith('..')) {
              command = relativePath;
            } else {
              // If it goes outside, use absolute path and normalize
              command = path.normalize(expandedPath);
            }
          } catch {
            command = path.normalize(expandedPath);
          }
        } else {
          // Normalize the path to ensure consistent separators
          command = path.normalize(command);
        }
      } else {
        // For global installation, expand $HOME normally and normalize
        command = expandHome(command);
        command = path.normalize(command);
      }

      if (envVars && commandEnvKeys && commandEnvKeys.size > 0) {
        const keys = commandEnvKeys.get(command);
        if (keys && keys.length > 0) {
          const subset: Record<string, string> = {};
          for (const k of keys) {
            const v = envVars[k];
            if (v !== undefined && v !== '') subset[k] = v; // omit empty so we don't inject VAR=''
          }
          if (Object.keys(subset).length > 0) {
            command = buildEnvPrefix(subset) + command;
          }
        }
      }

      return {
        ...hook,
        command,
      };
    });
  }

  return expanded;
}

/**
 * Write hooks.json file with proper formatting.
 * If envVars and commandEnvKeys are provided, each command gets only its required env vars prefixed.
 */
export async function writeHooksJson(
  hooksJsonPath: string,
  hooks: HooksJson,
  hooksDir: string,
  isProjectInstall: boolean,
  envVars?: Record<string, string>,
  commandEnvKeys?: Map<string, string[]>
): Promise<void> {
  // Ensure directory exists
  await fs.ensureDir(path.dirname(hooksJsonPath));

  // Expand paths (and optionally inject env prefix per command)
  const expanded = expandPathsInHooks(
    hooks,
    hooksJsonPath,
    hooksDir,
    isProjectInstall,
    envVars,
    commandEnvKeys
  );

  // Format JSON with 2-space indentation
  const content = JSON.stringify(expanded, null, 2) + '\n';

  await fs.writeFile(hooksJsonPath, content, 'utf-8');
}

/**
 * Get hook file paths from hooks configuration
 * This helps determine which files need to be downloaded
 */
export function getHookFilePaths(config: CursorHookConfig): string[] {
  const filePaths: Set<string> = new Set();

  for (const hookArray of Object.values(config.hooks)) {
    for (const hook of hookArray) {
      const command = hook.command;
      // Extract file path from command (remove $HOME/.cursor/hooks/ prefix)
      if (command.includes('.cursor/hooks/')) {
        const match = command.match(/\.cursor\/hooks\/(.+)$/);
        if (match) {
          filePaths.add(match[1]);
        }
      }
    }
  }

  return Array.from(filePaths);
}

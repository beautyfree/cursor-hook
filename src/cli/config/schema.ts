/**
 * Configuration schema for cursor-hook.config.json
 */

export type Platform = 'linux' | 'macos' | 'windows' | 'default';

export interface PlatformCommands {
  /**
   * Command for Linux
   */
  linux?: string;
  /**
   * Command for macOS
   */
  macos?: string;
  /**
   * Command for Windows
   */
  windows?: string;
  /**
   * Default command for other platforms
   */
  default?: string;
}

/**
 * Required env var: name only, or name + optional description for the prompt
 */
export type RequiredEnvEntry = string | { name: string; description?: string };

export interface CursorHookConfig {
  /**
   * Run once from hooks dir (e.g. apt-get, brew). Use for system-wide dependencies.
   * Can be a string or platform-specific object. Runs before installCommand.
   */
  systemInstallCommand?: string | PlatformCommands;

  /**
   * Run in each hook folder (e.g. npm i && npm run build). Can be a string or platform-specific object.
   * For system deps run once, use systemInstallCommand instead.
   */
  installCommand?: string | PlatformCommands;

  /**
   * Environment variable names (or name + description) that the user must provide during install.
   * Applied to all hooks that don't define their own requiredEnv. Values are injected into each hook command in hooks.json.
   */
  requiredEnv?: RequiredEnvEntry[];

  /**
   * Files to download: hooks and rules paths from the repo.
   * Each list is copied into the corresponding .cursor area.
   */
  files?: {
    /** Paths (files or dirs) to copy into .cursor/hooks */
    hooks?: string[];
    /** Paths (files or dirs) to copy into .cursor/rules */
    rules?: string[];
  };

  /**
   * Hooks configuration to merge into hooks.json
   * Each hook entry may specify its own requiredEnv (overrides top-level requiredEnv for that hook).
   */
  hooks: {
    [hookName: string]: Array<{
      command: string;
      /**
       * Env vars required for this hook only. If omitted, top-level requiredEnv is used (if any).
       */
      requiredEnv?: RequiredEnvEntry[];
      [key: string]: any;
    }>;
  };
}

/**
 * Validates a config object
 */
export function validateConfig(config: any): config is CursorHookConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object');
  }

  const validatePlatformCommands = (value: any, field: string) => {
    if (typeof value !== 'string' && typeof value !== 'object') {
      throw new Error(`${field} must be a string or object if provided`);
    }
    if (typeof value === 'object') {
      const validPlatforms = ['linux', 'macos', 'windows', 'default'];
      for (const key of Object.keys(value)) {
        if (!validPlatforms.includes(key)) {
          throw new Error(
            `Invalid platform in ${field}: ${key}. Valid platforms: ${validPlatforms.join(', ')}`
          );
        }
        if (typeof value[key] !== 'string') {
          throw new Error(`${field}.${key} must be a string`);
        }
      }
    }
  };

  if (config.systemInstallCommand !== undefined) {
    validatePlatformCommands(config.systemInstallCommand, 'systemInstallCommand');
  }

  if (config.installCommand !== undefined) {
    validatePlatformCommands(config.installCommand, 'installCommand');
  }

  if (config.requiredEnv !== undefined) {
    if (!Array.isArray(config.requiredEnv)) {
      throw new Error('requiredEnv must be an array if provided');
    }
    for (let i = 0; i < config.requiredEnv.length; i++) {
      const entry = config.requiredEnv[i];
      if (typeof entry === 'string') {
        if (!entry.trim()) {
          throw new Error(`requiredEnv[${i}] must be a non-empty string`);
        }
      } else if (entry && typeof entry === 'object' && typeof (entry as any).name === 'string') {
        if (!(entry as any).name.trim()) {
          throw new Error(`requiredEnv[${i}].name must be a non-empty string`);
        }
      } else {
        throw new Error(
          `requiredEnv[${i}] must be a string or an object with "name" (and optional "description")`
        );
      }
    }
  }

  if (config.files !== undefined) {
    if (!config.files || typeof config.files !== 'object' || Array.isArray(config.files)) {
      throw new Error('files must be an object if provided');
    }
    if (config.files.hooks !== undefined) {
      if (!Array.isArray(config.files.hooks)) {
        throw new Error('files.hooks must be an array if provided');
      }
      if (!config.files.hooks.every((f: any) => typeof f === 'string')) {
        throw new Error('All files.hooks entries must be strings');
      }
    }
    if (config.files.rules !== undefined) {
      if (!Array.isArray(config.files.rules)) {
        throw new Error('files.rules must be an array if provided');
      }
      if (!config.files.rules.every((f: any) => typeof f === 'string')) {
        throw new Error('All files.rules entries must be strings');
      }
    }
  }

  if (!config.hooks || typeof config.hooks !== 'object') {
    throw new Error('hooks must be an object');
  }

  // Validate hooks structure
  const validateRequiredEnv = (arr: any, ctx: string) => {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
      const entry = arr[i];
      if (typeof entry === 'string') {
        if (!entry.trim()) throw new Error(`${ctx}[${i}] must be a non-empty string`);
      } else if (entry && typeof entry === 'object' && typeof (entry as any).name === 'string') {
        if (!(entry as any).name.trim()) throw new Error(`${ctx}[${i}].name must be a non-empty string`);
      } else {
        throw new Error(`${ctx}[${i}] must be a string or an object with "name" (and optional "description")`);
      }
    }
  };

  for (const [hookName, hookArray] of Object.entries(config.hooks)) {
    if (!Array.isArray(hookArray)) {
      throw new Error(`Hook "${hookName}" must be an array`);
    }
    for (let i = 0; i < hookArray.length; i++) {
      const hook = hookArray[i];
      if (!hook || typeof hook !== 'object') {
        throw new Error(`Hook entry in "${hookName}" must be an object`);
      }
      if (!hook.command || typeof hook.command !== 'string') {
        throw new Error(`Hook entry in "${hookName}" must have a "command" string property`);
      }
      if (hook.requiredEnv !== undefined) {
        validateRequiredEnv(hook.requiredEnv, `hooks.${hookName}[${i}].requiredEnv`);
      }
    }
  }

  return true;
}

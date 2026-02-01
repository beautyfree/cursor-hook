/**
 * Configuration schema for cursor-hook.config.json
 */

export type Platform = 'linux' | 'macos' | 'windows' | 'default'

export interface PlatformCommands {
  /**
   * Command for Linux
   */
  linux?: string
  /**
   * Command for macOS
   */
  macos?: string
  /**
   * Command for Windows
   */
  windows?: string
  /**
   * Default command for other platforms
   */
  default?: string
}

export interface CursorHookConfig {
  /**
   * Optional shell command(s) to execute for installing system dependencies
   * Can be a string (applies to all platforms) or an object with platform-specific commands
   */
  installCommand?: string | PlatformCommands

  /**
   * Files to download: hooks and rules paths from the repo.
   * Each list is copied into the corresponding .cursor area.
   */
  files?: {
    /** Paths (files or dirs) to copy into .cursor/hooks */
    hooks?: string[]
    /** Paths (files or dirs) to copy into .cursor/rules */
    rules?: string[]
  }

  /**
   * Hooks configuration to merge into hooks.json
   */
  hooks: {
    [hookName: string]: Array<{
      command: string
      [key: string]: any
    }>
  }
}

/**
 * Validates a config object
 */
export function validateConfig(config: any): config is CursorHookConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Config must be an object')
  }

  if (config.installCommand !== undefined) {
    if (
      typeof config.installCommand !== 'string' &&
      typeof config.installCommand !== 'object'
    ) {
      throw new Error('installCommand must be a string or object if provided')
    }
    if (typeof config.installCommand === 'object') {
      const validPlatforms = ['linux', 'macos', 'windows', 'default']
      for (const key of Object.keys(config.installCommand)) {
        if (!validPlatforms.includes(key)) {
          throw new Error(
            `Invalid platform in installCommand: ${key}. Valid platforms: ${validPlatforms.join(
              ', '
            )}`
          )
        }
        if (typeof (config.installCommand as any)[key] !== 'string') {
          throw new Error(`installCommand.${key} must be a string`)
        }
      }
    }
  }

  if (config.files !== undefined) {
    if (
      !config.files ||
      typeof config.files !== 'object' ||
      Array.isArray(config.files)
    ) {
      throw new Error('files must be an object if provided')
    }
    if (config.files.hooks !== undefined) {
      if (!Array.isArray(config.files.hooks)) {
        throw new Error('files.hooks must be an array if provided')
      }
      if (!config.files.hooks.every((f: any) => typeof f === 'string')) {
        throw new Error('All files.hooks entries must be strings')
      }
    }
    if (config.files.rules !== undefined) {
      if (!Array.isArray(config.files.rules)) {
        throw new Error('files.rules must be an array if provided')
      }
      if (!config.files.rules.every((f: any) => typeof f === 'string')) {
        throw new Error('All files.rules entries must be strings')
      }
    }
  }

  if (!config.hooks || typeof config.hooks !== 'object') {
    throw new Error('hooks must be an object')
  }

  // Validate hooks structure
  for (const [hookName, hookArray] of Object.entries(config.hooks)) {
    if (!Array.isArray(hookArray)) {
      throw new Error(`Hook "${hookName}" must be an array`)
    }
    for (const hook of hookArray) {
      if (!hook || typeof hook !== 'object') {
        throw new Error(`Hook entry in "${hookName}" must be an object`)
      }
      if (!hook.command || typeof hook.command !== 'string') {
        throw new Error(
          `Hook entry in "${hookName}" must have a "command" string property`
        )
      }
    }
  }

  return true
}

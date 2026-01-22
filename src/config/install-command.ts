/**
 * Install command utilities for platform-specific commands
 */

import { PlatformCommands } from './schema';
import { detectOS } from '../utils/paths';

/**
 * Get the install command for the current platform
 */
export function getInstallCommand(
  installCommand: string | PlatformCommands | undefined
): string | undefined {
  if (!installCommand) {
    return undefined;
  }

  // If it's a string, return as-is (backward compatibility)
  if (typeof installCommand === 'string') {
    return installCommand;
  }

  // If it's an object, get platform-specific command
  const os = detectOS();
  const platformCommands = installCommand as PlatformCommands;

  // Try platform-specific command first
  switch (os) {
    case 'linux':
      if (platformCommands.linux && platformCommands.linux.trim() !== '') {
        return platformCommands.linux;
      }
      break;
    case 'macos':
      if (platformCommands.macos && platformCommands.macos.trim() !== '') {
        return platformCommands.macos;
      }
      break;
    case 'windows':
      if (platformCommands.windows && platformCommands.windows.trim() !== '') {
        return platformCommands.windows;
      }
      break;
  }

  // Fall back to default if platform-specific command not found
  if (platformCommands.default && platformCommands.default.trim() !== '') {
    return platformCommands.default;
  }

  // Return undefined if no valid command found
  return undefined;
}

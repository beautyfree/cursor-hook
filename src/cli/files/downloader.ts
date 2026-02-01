/**
 * File downloader from repository to .cursor/hooks directory
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

/**
 * Resolve target paths for a list of source paths (relative to repo).
 * Each target is targetDir + basename(sourcePath).
 */
export function getTargetPaths(
  files: string[],
  targetDir: string
): { sourcePath: string; targetPath: string }[] {
  return files.map((file) => ({
    sourcePath: file,
    targetPath: path.join(targetDir, path.basename(file)),
  }));
}

/**
 * Check which target paths already exist on disk.
 * Returns list of existing target paths.
 */
export async function findExistingPaths(files: string[], targetDir: string): Promise<string[]> {
  const pairs = getTargetPaths(files, targetDir);
  const existing: string[] = [];
  for (const { targetPath } of pairs) {
    if (await fs.pathExists(targetPath)) {
      existing.push(targetPath);
    }
  }
  return existing;
}

/**
 * Copy files from repository to hooks directory
 */
export async function downloadFiles(
  repoDir: string,
  files: string[],
  targetHooksDir: string
): Promise<void> {
  // Ensure target directory exists
  await fs.ensureDir(targetHooksDir);

  for (const file of files) {
    const sourcePath = path.join(repoDir, file);
    const targetPath = path.join(targetHooksDir, path.basename(file));

    // Check if source exists
    if (!(await fs.pathExists(sourcePath))) {
      throw new Error(`File not found in repository: ${file}`);
    }

    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      // Copy directory recursively
      await fs.copy(sourcePath, targetPath, {
        overwrite: true,
        preserveTimestamps: false,
      });
    } else if (stats.isFile()) {
      // Copy file
      await fs.copy(sourcePath, targetPath, {
        overwrite: true,
        preserveTimestamps: false,
      });

      // Make scripts executable on Unix-like systems
      if (os.platform() !== 'win32') {
        // Check if file looks like a script (has shebang or is script file)
        const content = await fs.readFile(targetPath, 'utf-8');
        const isScript =
          content.startsWith('#!') ||
          file.endsWith('.sh') ||
          file.endsWith('.bash') ||
          file.endsWith('.zsh') ||
          file.endsWith('.js');

        if (isScript) {
          await fs.chmod(targetPath, 0o755); // rwxr-xr-x
        }
      }
    } else {
      throw new Error(`Unsupported file type: ${file}`);
    }
  }
}

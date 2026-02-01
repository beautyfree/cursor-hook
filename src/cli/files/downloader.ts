/**
 * File downloader from repository to .cursor/hooks directory
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

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

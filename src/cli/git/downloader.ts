/**
 * Git repository downloader
 */

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface RepoInfo {
  url: string;
  branch: string;
}

/**
 * Parse repository reference into Git URL
 * Supports:
 * - owner/repo (GitHub, defaults to main branch)
 * - github.com/owner/repo
 * - gitlab.com/owner/repo
 * - Full Git URLs
 */
export function parseRepoReference(repoRef: string): RepoInfo {
  // Full Git URL
  if (repoRef.startsWith('http://') || repoRef.startsWith('https://') || repoRef.startsWith('git@')) {
    return {
      url: repoRef,
      branch: 'main', // Default branch, could be enhanced to detect
    };
  }

  // GitHub owner/repo format
  if (!repoRef.includes('/')) {
    throw new Error(`Invalid repository format: ${repoRef}. Expected "owner/repo" or full Git URL`);
  }

  const parts = repoRef.split('/');
  if (parts.length === 2) {
    // owner/repo format - assume GitHub
    return {
      url: `https://github.com/${parts[0]}/${parts[1]}.git`,
      branch: 'main',
    };
  }

  // github.com/owner/repo or gitlab.com/owner/repo format
  if (parts.length >= 3) {
    const host = parts[0];
    const owner = parts[1];
    const repo = parts[2].replace(/\.git$/, '');

    if (host === 'github.com' || host.includes('github')) {
      return {
        url: `https://github.com/${owner}/${repo}.git`,
        branch: 'main',
      };
    }

    if (host === 'gitlab.com' || host.includes('gitlab')) {
      return {
        url: `https://gitlab.com/${owner}/${repo}.git`,
        branch: 'main',
      };
    }

    // Generic Git URL
    return {
      url: repoRef.startsWith('http') ? repoRef : `https://${repoRef}.git`,
      branch: 'main',
    };
  }

  throw new Error(`Invalid repository format: ${repoRef}`);
}

/**
 * Check if a path is a local directory
 */
export async function isLocalPath(pathStr: string): Promise<boolean> {
  try {
    const stats = await fs.stat(pathStr);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a string looks like a Git URL or repository reference
 */
export function isGitRepository(repoRef: string): boolean {
  // Check for Git URL patterns
  if (
    repoRef.startsWith('http://') ||
    repoRef.startsWith('https://') ||
    repoRef.startsWith('git@') ||
    repoRef.startsWith('github.com/') ||
    repoRef.startsWith('gitlab.com/') ||
    repoRef.includes('/') // owner/repo format
  ) {
    return true;
  }
  return false;
}

/**
 * Clone repository to temporary directory and return path
 * Or return local path if it's a local directory
 */
export async function downloadRepository(repoRef: string): Promise<string> {
  // Check if it's a local path first
  const localPath = path.isAbsolute(repoRef) ? repoRef : path.resolve(process.cwd(), repoRef);
  if (await isLocalPath(localPath)) {
    return localPath;
  }

  // If it doesn't look like a Git repository, try resolving as local path
  if (!isGitRepository(repoRef)) {
    const resolvedPath = path.isAbsolute(repoRef) ? repoRef : path.resolve(process.cwd(), repoRef);
    if (await isLocalPath(resolvedPath)) {
      return resolvedPath;
    }
    throw new Error(
      `Path "${repoRef}" is not a valid local directory or Git repository reference`
    );
  }

  // It's a Git repository, clone it
  const repoInfo = parseRepoReference(repoRef);
  const tempDir = path.join(os.tmpdir(), `cursor-hook-${Date.now()}-${Math.random().toString(36).substring(7)}`);

  // Create temp directory
  await fs.ensureDir(tempDir);

  try {
    const git: SimpleGit = simpleGit();
    await git.clone(repoInfo.url, tempDir, ['--depth', '1', '--branch', repoInfo.branch]);
  } catch (error: any) {
    // Try main branch if master fails, or vice versa
    try {
      const git: SimpleGit = simpleGit();
      const alternateBranch = repoInfo.branch === 'main' ? 'master' : 'main';
      await git.clone(repoInfo.url, tempDir, ['--depth', '1', '--branch', alternateBranch]);
    } catch (retryError: any) {
      // If branch-specific clone fails, try without branch specification
      try {
        const git: SimpleGit = simpleGit();
        await git.clone(repoInfo.url, tempDir, ['--depth', '1']);
      } catch (finalError: any) {
        await fs.remove(tempDir);
        throw new Error(
          `Failed to clone repository: ${repoInfo.url}\n${error.message}\n${retryError.message}\n${finalError.message}`
        );
      }
    }
  }

  return tempDir;
}

/**
 * Load cursor-hook.config.json from repository directory
 */
export async function loadConfigFromRepo(repoDir: string): Promise<any> {
  const configPath = path.join(repoDir, 'cursor-hook.config.json');

  if (!(await fs.pathExists(configPath))) {
    throw new Error(`cursor-hook.config.json not found in repository root`);
  }

  const configContent = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(configContent);
}

/**
 * Check if a directory is a temporary directory (should be cleaned up)
 */
export function isTempDir(dir: string): boolean {
  return dir.includes(os.tmpdir()) && dir.includes('cursor-hook-');
}

/**
 * Clean up temporary directory (only if it's actually a temp dir)
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  // Only cleanup if it's a temporary directory, not a local path
  if (!isTempDir(tempDir)) {
    return;
  }

  try {
    await fs.remove(tempDir);
  } catch (error) {
    // Ignore cleanup errors
    console.warn(`Warning: Failed to cleanup temp directory: ${tempDir}`);
  }
}

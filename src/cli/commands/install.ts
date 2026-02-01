/**
 * Install command implementation
 */

import {
  downloadRepository,
  loadConfigFromRepo,
  cleanupTempDir,
  isTempDir,
} from '../git/downloader'
import { validateConfig, CursorHookConfig } from '../config/schema'
import { getInstallCommand } from '../config/install-command'
import { downloadFiles } from '../files/downloader'
import { executeCommandWithOutput } from '../shell/executor'
import { readHooksJson, mergeHooks, writeHooksJson } from '../hooks/manager'
import { promptHooksLocation } from '../utils/prompts'
import {
  getGlobalHooksDir,
  getGlobalHooksJsonPath,
  getGlobalRulesDir,
  getProjectHooksDir,
  getProjectHooksJsonPath,
  getProjectRulesDir,
} from '../utils/paths'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as os from 'os'

export interface InstallOptions {
  repo: string
}

/**
 * Install hooks from repository
 */
export async function installHooks(options: InstallOptions): Promise<void> {
  console.log(`🚀 Installing Cursor hooks from: ${options.repo}\n`)

  let tempDir: string | null = null

  try {
    // Step 1: Download repository or use local path
    // downloadRepository handles both cases automatically
    const resolvedPath = path.isAbsolute(options.repo)
      ? options.repo
      : path.resolve(process.cwd(), options.repo)

    // Check if it's a local path first
    try {
      const stats = await fs.stat(resolvedPath)
      if (stats.isDirectory()) {
        console.log('📁 Using local directory...')
        tempDir = resolvedPath
        console.log(`✓ Local directory: ${tempDir}\n`)
      } else {
        throw new Error('Path is not a directory')
      }
    } catch {
      // Not a local path, try as repository
      console.log('📥 Downloading repository...')
      tempDir = await downloadRepository(options.repo)
      console.log('✓ Repository downloaded\n')
    }

    // Step 2: Load config
    console.log('📋 Loading configuration...')
    const configData = await loadConfigFromRepo(tempDir)
    validateConfig(configData)
    const config: CursorHookConfig = configData
    console.log('✓ Configuration loaded\n')

    // Step 3: Prompt for hooks location (before copying files and installing)
    const location = await promptHooksLocation()
    const hooksDir =
      location === 'global' ? getGlobalHooksDir() : getProjectHooksDir()
    const hooksJsonPath =
      location === 'global'
        ? getGlobalHooksJsonPath()
        : getProjectHooksJsonPath()

    // Step 4: Download files (hooks and rules)
    const rulesDir =
      location === 'global' ? getGlobalRulesDir() : getProjectRulesDir()
    const hooksPaths = config.files?.hooks ?? []
    const rulesPaths = config.files?.rules ?? []

    if (hooksPaths.length > 0) {
      console.log('📁 Downloading hooks...')
      await downloadFiles(tempDir, hooksPaths, hooksDir)
      console.log(`✓ Hooks downloaded to: ${hooksDir}\n`)
    }
    if (rulesPaths.length > 0) {
      console.log('📁 Downloading rules...')
      await downloadFiles(tempDir, rulesPaths, rulesDir)
      console.log(`✓ Rules downloaded to: ${rulesDir}\n`)
    }

    // Step 5: Execute install command if present (after files are copied, so package.json is available)
    const installCommand = getInstallCommand(config.installCommand)
    if (installCommand) {
      console.log('⚙️  Installing dependencies...')

      // Determine the directory where activate-window is located
      const activateWindowDir = path.join(hooksDir, 'activate-window')

      // Execute command in the activate-window directory (where package.json is)
      await executeCommandWithOutput(installCommand, { cwd: activateWindowDir })
      console.log('✓ Dependencies installed\n')
    }

    // Step 6: Create backup of hooks.json if it exists
    if (await fs.pathExists(hooksJsonPath)) {
      const backupPath = `${hooksJsonPath}.backup`
      await fs.copy(hooksJsonPath, backupPath)
      console.log(`💾 Backup created: ${backupPath}\n`)
    }

    // Step 7: Merge hooks into hooks.json
    console.log('🔗 Merging hooks configuration...')
    const existingHooks = await readHooksJson(hooksJsonPath)
    const isProjectInstall = location === 'project'
    const mergeResult = mergeHooks(
      existingHooks,
      config,
      hooksJsonPath,
      hooksDir,
      isProjectInstall
    )

    if (mergeResult.skipped > 0) {
      console.log(
        `⚠️  Skipped ${mergeResult.skipped} hook(s) that already exist:`
      )
      for (const skipped of mergeResult.skippedHooks) {
        console.log(`   - ${skipped.hook}: ${skipped.command}`)
      }
      console.log('')
    }

    if (mergeResult.added > 0) {
      console.log(`✓ Added ${mergeResult.added} new hook(s)`)
    } else if (mergeResult.skipped > 0) {
      console.log('ℹ️  All hooks already exist, no changes made')
    }

    await writeHooksJson(
      hooksJsonPath,
      mergeResult.hooks,
      hooksDir,
      isProjectInstall
    )
    console.log(`✓ Hooks configuration updated: ${hooksJsonPath}\n`)

    console.log('✅ Installation complete!')
    console.log('\n📌 Important: Restart Cursor for hooks to take effect\n')
  } catch (error: any) {
    console.error('\n❌ Installation failed:')
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await cleanupTempDir(tempDir)
    }
  }
}

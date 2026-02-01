# Cursor Hook CLI

A TypeScript CLI tool to install Cursor hooks from Git repositories.

## Installation

```bash
npm install -g cursor-hook
# or
npx cursor-hook install <repository>
```

## Usage

```bash
cursor-hook install <repository-or-path>
```

### Repository Formats

The tool supports multiple repository reference formats and local paths:

**Git Repositories:**
- **GitHub owner/repo**: `beautyfree/cursor-window-activate-hook`
- **Full GitHub URL**: `github.com/beautyfree/cursor-window-activate-hook`
- **GitLab**: `gitlab.com/owner/repo`
- **Full Git URL**: `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`

**Local Paths:**
- **Absolute path**: `/path/to/local/repo`
- **Relative path**: `./local-repo` or `../parent/repo`

### Examples

```bash
# Install from GitHub repository
npx cursor-hook install beautyfree/cursor-window-activate-hook

# Install from local directory
npx cursor-hook install ./cursor-window-activate-hook
npx cursor-hook install /Users/me/projects/my-hook
```

## Configuration File

Repositories must include a **`cursor-hook.config.json`** file in the **repository root**. The CLI loads it after cloning or when using a local path.

### Simple Example (single command for all platforms)

When the installation command is the same across all platforms, use a simple string:

```json
{
  "installCommand": "npm install --production --no-save --silent --no-audit --no-fund || true",
  "files": {
    "hooks": ["activate-window"],
    "rules": []
  },
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "node $HOME/.cursor/hooks/activate-window/activate-window.js"
      }
    ]
  }
}
```

### Platform-Specific Commands (system deps only)

For system-wide dependencies only (e.g. `xdotool`), use **systemInstallCommand** (runs once):

```json
{
  "systemInstallCommand": {
    "linux": "sudo apt-get install -y xdotool || sudo yum install -y xdotool || true",
    "macos": "",
    "windows": "",
    "default": "echo 'No installation needed for this platform'"
  },
  "files": { "hooks": ["file1.sh"], "rules": [] },
  "hooks": { ... }
}
```

### System + per-hook (both)

When you need **both** system deps (run once) and per-hook build (e.g. npm i && npm run build in each hook folder), use **systemInstallCommand** and **installCommand**:

```json
{
  "systemInstallCommand": {
    "linux": "sudo apt-get install -y xdotool || sudo yum install -y xdotool || true",
    "macos": "",
    "windows": "",
    "default": "echo 'No system install needed'"
  },
  "installCommand": "npm i --no-save --silent && npm run build || true",
  "files": {
    "hooks": ["hooks/docs", "hooks/activate"],
    "rules": []
  },
  "hooks": {
    "afterFileEdit": [{ "command": "node $HOME/.cursor/hooks/docs/dist/docs.js" }],
    "stop": [{ "command": "node $HOME/.cursor/hooks/activate/dist/activate.js" }]
  }
}
```

Order: 1) `systemInstallCommand` runs once from hooks dir. 2) `installCommand` runs in each hook folder (docs, activate).

### Configuration Fields

- **systemInstallCommand** (optional): Run **once** from the hooks directory (e.g. apt-get, brew). String or platform object. Runs before `installCommand`.
- **installCommand** (optional): Run in **each** hook folder (e.g. npm i && npm run build). String or platform object. For system deps run once, use **systemInstallCommand**.
- **files** (optional): Object with:
  - **hooks**: Array of paths (files or directories) to copy into `.cursor/hooks`
  - **rules**: Array of paths (files or directories) to copy into `.cursor/rules` (Cursor Rules for AI)
- **hooks** (required): Object mapping hook names to arrays of hook configurations. Each entry must have a **command** (string). Example: `"afterFileEdit": [{ "command": "node $HOME/.cursor/hooks/docs/dist/docs.js" }]`

**Path behavior:** Paths in `files.hooks` and `files.rules` are relative to the repository root. Each item is copied into the target dir using its **last path segment** (e.g. `hooks/docs` → `.../.cursor/hooks/docs`). If a target path already exists, the CLI will prompt before overwriting.

**Install command cwd:** `installCommand` runs with the current working directory set to each hook folder (or to the hooks dir if there are no hook folders). Do not put `cd <path>` in the command—use only the build steps (e.g. `npm i && npm run build || true`).

## Installation Flow

1. Downloads the repository to a temporary directory (or uses local path if provided)
2. Loads `cursor-hook.config.json` from the repository root
3. Prompts user to choose installation location:
   - **Global**: `~/.cursor/hooks.json` (applies to all projects)
   - **Project**: `.cursor/hooks.json` (applies to current project only)
4. Downloads files: `files.hooks` → `.cursor/hooks`, `files.rules` → `.cursor/rules` (if present)
5. Executes commands: **systemInstallCommand** once (if set), then **installCommand** in each hook folder (or once from hooks dir if no hook folders)
6. Creates backup of existing `hooks.json` (if present)
7. Merges hooks configuration into `hooks.json` (preserves existing hooks, prevents duplicates)

## Cross-Platform Support

The tool works on:
- **macOS**
- **Linux**
- **Windows** (PowerShell, CMD, Git Bash)

Path variables like `$HOME` are automatically expanded on all platforms.

## Types for hook authors

If you are implementing a hook script (e.g. in Node.js) and want typed payloads, install the package and import types:

```bash
npm install cursor-hook
```

```ts
import type { AfterFileEditPayload, HookEventName } from 'cursor-hook';
```

See [Cursor Hooks documentation](https://cursor.com/docs/agent/hooks) for payload and response schemas. The package re-exports TypeScript types that match those schemas.

## Examples

### Example Repository

See [cursor-window-activate-hook](https://github.com/beautyfree/cursor-window-activate-hook) for a complete example of a hook repository with:
- `cursor-hook.config.json` configuration file
- Platform-specific install commands
- Hook scripts and configuration

This repository demonstrates:
- How to structure a hook package
- Platform-specific dependency installation
- Proper hook configuration

### Notes

- **Backup:** Before merging, the CLI creates `hooks.json.backup` if `hooks.json` exists. To restore: copy the backup over `hooks.json`.
- **Overwrite:** If target paths (e.g. `.../hooks/docs`) already exist, the CLI asks for confirmation before overwriting.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev install <repository>
```

## License

MIT

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

Repositories must include a `cursor-hook.config.json` file in the root with the following structure:

### Simple Example (single command for all platforms)

```json
{
  "installCommand": "sudo apt-get install -y xdotool",
  "files": [
    "activate-window.sh"
  ],
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "$HOME/.cursor/hooks/activate-window.sh"
      }
    ]
  }
}
```

### Platform-Specific Commands

```json
{
  "installCommand": {
    "linux": "sudo apt-get install -y xdotool || sudo yum install -y xdotool || sudo dnf install -y xdotool || sudo pacman -S --noconfirm xdotool || true",
    "macos": "",
    "windows": "",
    "default": "echo 'No installation needed for this platform'"
  },
  "files": [
    "file1.sh",
    "directory/"
  ],
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "$HOME/.cursor/hooks/file1.sh"
      }
    ],
    "afterAgentResponse": [
      {
        "command": "$HOME/.cursor/hooks/file1.sh"
      }
    ]
  }
}
```

### Configuration Fields

- **installCommand** (optional): 
  - Can be a **string** (applies to all platforms) for backward compatibility
  - Or an **object** with platform-specific commands:
    - `linux` - Command for Linux
    - `macos` - Command for macOS
    - `windows` - Command for Windows
    - `default` - Fallback command for other platforms
  - Empty strings or missing platform keys will skip installation for that platform
- **files** (optional): Array of files or directories to download and place in `.cursor/hooks`
- **hooks** (required): Object mapping hook names to arrays of hook configurations

## Installation Flow

1. Downloads the repository to a temporary directory
2. Loads `cursor-hook.config.json` from the repository root
3. Executes platform-specific `installCommand` if present (for system dependencies)
4. Prompts user to choose installation location:
   - **Global**: `~/.cursor/hooks.json` (applies to all projects)
   - **Project**: `.cursor/hooks.json` (applies to current project only)
5. Downloads specified files to `.cursor/hooks` directory
6. Creates backup of existing `hooks.json` (if present)
7. Merges hooks configuration into `hooks.json` (preserves existing hooks)

## Cross-Platform Support

The tool works on:
- **macOS**
- **Linux**
- **Windows** (PowerShell, CMD, Git Bash)

Path variables like `$HOME` are automatically expanded on all platforms.

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

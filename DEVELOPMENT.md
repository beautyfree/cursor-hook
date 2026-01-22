# Testing Cursor Hook CLI Locally

## Method 1: Using npm run dev (Recommended for development)

This runs TypeScript directly without building:

```bash
cd cursor-hook-cli
npm run dev install ../cursor-window-activate-hook
```

## Method 2: Using npm link (Global command)

Create a global symlink to test the CLI as if it were installed:

```bash
cd cursor-hook-cli
npm run build
npm link

# Now you can use it from anywhere:
cursor-hook install ../cursor-window-activate-hook
cursor-hook install beautyfree/cursor-window-activate-hook

# To unlink later:
npm unlink -g cursor-hook
```

## Method 3: Using node directly

Run the compiled JavaScript directly:

```bash
cd cursor-hook-cli
npm run build
node dist/index.js install ../cursor-window-activate-hook
```

## Method 4: Using npx with local path

If you want to test as if it were published:

```bash
cd cursor-hook-cli
npm pack  # Creates a .tgz file
npm install -g ./cursor-hook-0.1.0.tgz
cursor-hook install ../cursor-window-activate-hook
```

## Testing with local repository

Test with the local `cursor-window-activate-hook` directory:

```bash
# From cursor-hook-cli directory
npm run dev install ../cursor-window-activate-hook

# Or with absolute path
npm run dev install /Users/devall/Projects/orgs/beautyfree/cursor-window-activate-hook
```

## Testing with remote repository

Test with a GitHub repository:

```bash
npm run dev install beautyfree/cursor-window-activate-hook
```

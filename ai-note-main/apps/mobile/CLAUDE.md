# AI-Note Mobile App

## Overview
React Native (Expo) mobile app for AI-Note. Android-first, full feature port from desktop.

## Tech Stack
- **Framework**: Expo SDK 52 + Expo Router (file-based routing)
- **UI**: React Native Paper (Material Design 3)
- **State**: Zustand (same pattern as desktop)
- **Storage**: expo-file-system (files), expo-sqlite (metadata), AsyncStorage (config)
- **Editor**: @10play/tentap-editor (WYSIWYG), TextInput (source mode)
- **Git**: isomorphic-git with fs-adapter
- **Search**: FlexSearch (same as desktop)

## Architecture
- `app/` — Expo Router file-based routes
- `src/services/` — Data layer (ported from desktop main process)
- `src/stores/` — Zustand stores (adapted from desktop renderer)
- `src/components/` — UI components
- `src/i18n/` — Internationalization (zh primary + en)

## Key Differences from Desktop
- No IPC bridge — services called directly from stores
- Single-note editor (no multi-tab)
- Bottom tab navigation instead of sidebar
- expo-file-system instead of Node.js fs
- expo-sqlite (async) instead of better-sqlite3 (sync)
- No chokidar file watching — state-driven updates

## Commands
```bash
pnpm start          # Start Expo dev server
pnpm android        # Run on Android device/emulator
```

## Development Notes
- fs-adapter.ts wraps expo-file-system to provide fs/promises-like interface
- isomorphic-git accepts custom fs via constructor: `git.init({ fs: { promises: fsAdapter }, dir })`
- gray-matter and flexsearch work as-is (pure JS)

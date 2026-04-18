#!/usr/bin/env node

/**
 * Growth browser launcher — launches Chrome with remote debugging
 * for automated social media outreach.
 *
 * Usage:
 *   node scripts/growth-browser.mjs <platform> [action]
 *
 * Platforms: xhs, twitter, wechat
 * Actions:
 *   launch   — Start Chrome with platform profile (default)
 *   kill     — Kill Chrome instance
 *   status   — Check if Chrome is running
 *
 * Examples:
 *   node scripts/growth-browser.mjs xhs
 *   node scripts/growth-browser.mjs twitter launch
 *   node scripts/growth-browser.mjs xhs kill
 */

import { execSync, spawn } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs'

const PLATFORM_CONFIG = {
  xhs: {
    name: 'Xiaohongshu',
    url: 'https://www.xiaohongshu.com',
    searchUrl: (q) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}&type=1`,
  },
  twitter: {
    name: 'Twitter/X',
    url: 'https://x.com',
    searchUrl: (q) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`,
  },
  wechat: {
    name: 'WeChat Channels',
    url: 'https://channels.weixin.qq.com',
    searchUrl: () => 'https://channels.weixin.qq.com',
  },
}

const PORT = 9223
const PROFILE_BASE = path.join(
  os.homedir(),
  'Library/Application Support/@ai-note/desktop/publish-profiles'
)

function getProfileDir(platform) {
  return path.join(PROFILE_BASE, platform)
}

function isRunning() {
  try {
    execSync(`lsof -i :${PORT}`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function killChrome() {
  try {
    execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`, { stdio: 'pipe' })
    console.log('Chrome killed.')
  } catch {
    console.log('No Chrome instance running on port', PORT)
  }
}

function launchChrome(platform) {
  const config = PLATFORM_CONFIG[platform]
  if (!config) {
    console.error(`Unknown platform: ${platform}. Use: ${Object.keys(PLATFORM_CONFIG).join(', ')}`)
    process.exit(1)
  }

  if (isRunning()) {
    console.log(`Chrome already running on port ${PORT}. Kill it first with: node scripts/growth-browser.mjs ${platform} kill`)
    process.exit(1)
  }

  const profileDir = getProfileDir(platform)
  fs.mkdirSync(profileDir, { recursive: true })

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  const args = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-blink-features=AutomationControlled',
    config.url,
  ]

  console.log(`Launching Chrome for ${config.name}...`)
  console.log(`Profile: ${profileDir}`)
  console.log(`URL: ${config.url}`)

  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  console.log(`Chrome launched (PID: ${child.pid}). Remote debugging on port ${PORT}.`)
  console.log('')
  console.log('Next steps:')
  console.log(`  1. Wait for Chrome to open and login to ${config.name} if needed`)
  console.log(`  2. Run: node scripts/xhs-browser.mjs screenshot /tmp/growth-screen.png`)
  console.log(`  3. Check the screenshot to verify login status`)
}

// ---- CLI ----
const [,, platform, action = 'launch'] = process.argv

if (!platform) {
  console.log('Usage: node scripts/growth-browser.mjs <platform> [action]')
  console.log('Platforms:', Object.keys(PLATFORM_CONFIG).join(', '))
  console.log('Actions: launch (default), kill, status')
  process.exit(0)
}

switch (action) {
  case 'launch':
    launchChrome(platform)
    break
  case 'kill':
    killChrome()
    break
  case 'status':
    console.log(isRunning() ? `Chrome running on port ${PORT}` : 'Chrome not running')
    break
  default:
    console.error(`Unknown action: ${action}`)
    process.exit(1)
}

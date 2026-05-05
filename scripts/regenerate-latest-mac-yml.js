#!/usr/bin/env node
/**
 * Regenerate `latest-mac.yml` from the DMG/ZIP artifacts in /tmp/ils-crm-release/.
 *
 * Defensive fallback for when `electron-builder`'s post-build publish step
 * dies before writing the yml (observed: exit 144 mid-publish, leaving DMGs +
 * ZIPs but no manifest — breaks electron-updater for existing installs).
 *
 * The yml schema below mirrors what electron-builder produces. Verified against
 * a known-good v3.6.2 yml. Computes SHA-512 (base64) of each artifact and writes
 * the manifest electron-updater fetches from GitHub Releases.
 *
 * Usage:
 *   node scripts/regenerate-latest-mac-yml.js [output-dir]
 *
 * Defaults output-dir to /tmp/ils-crm-release/. Reads version from package.json.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const OUTPUT_DIR = process.argv[2] || '/tmp/ils-crm-release'
const PROJECT_ROOT = path.resolve(__dirname, '..')

const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'))
const VERSION = pkg.version

function sha512Base64(filePath) {
  const buf = fs.readFileSync(filePath)
  return crypto.createHash('sha512').update(buf).digest('base64')
}

function entry(filename) {
  const fullPath = path.join(OUTPUT_DIR, filename)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing artifact: ${fullPath}`)
  }
  const stat = fs.statSync(fullPath)
  return {
    url: filename,
    sha512: sha512Base64(fullPath),
    size: stat.size,
  }
}

const expectedFiles = [
  `ILS-CRM-${VERSION}-arm64-mac.zip`,
  `ILS-CRM-${VERSION}-mac.zip`,
  `ILS-CRM-${VERSION}-arm64.dmg`,
  `ILS-CRM-${VERSION}.dmg`,
]

const files = expectedFiles.map(entry)
const primary = files[0] // arm64 zip — what electron-updater downloads first

const lines = [
  `version: ${VERSION}`,
  'files:',
  ...files.flatMap(f => [
    `  - url: ${f.url}`,
    `    sha512: ${f.sha512}`,
    `    size: ${f.size}`,
  ]),
  `path: ${primary.url}`,
  `sha512: ${primary.sha512}`,
  `releaseDate: '${new Date().toISOString()}'`,
  '',
]

const ymlPath = path.join(OUTPUT_DIR, 'latest-mac.yml')
fs.writeFileSync(ymlPath, lines.join('\n'))
console.log(`Wrote ${ymlPath}`)
console.log(lines.join('\n'))

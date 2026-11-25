#!/usr/bin/env node
/**
 * Fail the build if the production site would load anything from another host.
 *
 * Hospital networks often block CDNs and font services, so every stylesheet,
 * script, font and image must come from the site itself. Ordinary <a href>
 * links (credits, references) are navigation, not loads, and are allowed.
 *
 * Usage: node scripts/check-no-external.mjs <dist-dir>
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const HTML_PATTERNS = [
  /<link\b[^>]*\bhref=["']https?:\/\/[^"']+/gi,
  /<script\b[^>]*\bsrc=["']https?:\/\/[^"']+/gi,
]

const CSS_PATTERNS = [
  /url\(\s*["']?https?:\/\/[^)"']+/gi,
  /@import\s+(url\()?\s*["']?https?:\/\/[^"')]+/gi,
]

/**
 * @param {string} html Contents of index.html
 * @param {string[]} cssFiles Contents of each built CSS file
 * @returns {string[]} Every snippet that loads from another host
 */
export function findExternalLoads(html, cssFiles) {
  const found = []
  for (const pattern of HTML_PATTERNS) {
    found.push(...(html.match(pattern) ?? []))
  }
  for (const css of cssFiles) {
    for (const pattern of CSS_PATTERNS) {
      found.push(...(css.match(pattern) ?? []))
    }
  }
  return found
}

function main(dir) {
  const htmlPath = join(dir, 'index.html')
  if (!existsSync(htmlPath)) {
    console.error(`No ${htmlPath}; run the build first.`)
    process.exit(2)
  }
  const assetsDir = join(dir, 'assets')
  const cssFiles = existsSync(assetsDir)
    ? readdirSync(assetsDir)
        .filter(name => name.endsWith('.css'))
        .map(name => readFileSync(join(assetsDir, name), 'utf8'))
    : []
  const found = findExternalLoads(readFileSync(htmlPath, 'utf8'), cssFiles)
  if (found.length > 0) {
    console.error('External loads found:')
    for (const snippet of found) console.error(`  ${snippet}`)
    process.exit(1)
  }
  console.log('No external loads')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2] ?? 'dist')
}

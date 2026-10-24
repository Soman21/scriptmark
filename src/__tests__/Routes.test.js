import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Static guard: every hard coded navigate()/Link/Navigate target must match a
// route defined in App.jsx. Catches stale flat paths like navigate('/results')
// after routes moved under /sessions/:id/.
const SRC = path.resolve(__dirname, '..')

const GLOBAL_ROUTES = ['/', '/login', '/forgotPassword', '/signup', '/guides', '/assistant', '/settings', '/contact', '/privacy']
const SESSION_CHILDREN = ['scan', 'marking', 'claim-questions', 'my-queue', 'coordinator', 'results', 'analytics', 'export']

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) return d.name === '__tests__' ? [] : walk(p)
    return /\.(jsx?|tsx?)$/.test(d.name) ? [p] : []
  })
}

function isValid(target) {
  const t = target.split('?')[0].split('#')[0]
  if (GLOBAL_ROUTES.includes(t)) return true
  const m = t.match(/^\/sessions\/(?:\$\{[^}]+\}|[^/]+)(?:\/([^/]+))?$/)
  if (!m) return false
  return !m[1] || SESSION_CHILDREN.includes(m[1])
}

describe('navigation targets', () => {
  it('App.jsx defines the routes this guard assumes', () => {
    const app = fs.readFileSync(path.join(SRC, 'App.jsx'), 'utf8')
    for (const r of GLOBAL_ROUTES.filter((r) => r !== '/')) expect(app).toContain(`path="${r}"`)
    for (const c of SESSION_CHILDREN) expect(app).toContain(`path="${c}"`)
  })

  it('every hard coded target matches a defined route', () => {
    const pattern = /(?:navigate\(\s*|\bto=\{?\s*|<Navigate\s+to=)(['"`])(\/[^'"`]*)\1/g
    const bad = []
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8')
      for (const m of text.matchAll(pattern)) {
        if (!isValid(m[2])) bad.push(`${path.relative(SRC, file)}: ${m[2]}`)
      }
    }
    expect(bad).toEqual([])
  })
})
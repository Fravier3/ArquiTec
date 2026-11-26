import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kitchenModule, presets } from '../src/catalog.js'
import { project, validProject } from '../src/model.js'

test('kitchen presets create valid assemblies and survive a local backup', () => {
  for (const [type, p] of Object.entries(presets)) {
    const items = kitchenModule({
      type,
      width: p.width / 1000,
      height: p.height / 1000,
      depth: p.depth / 1000,
      thickness: 0.018,
      shelves: p.shelves,
      material: 'Roble',
    })
    assert.ok(items.length >= 7)
    assert.ok(items.every((item) => item.w > 0 && item.d > 0 && item.h > 0))
    assert.equal(new Set(items.map((item) => item.group)).size, 1)
    const saved = validProject(JSON.parse(JSON.stringify(project(p.name, items))))
    assert.equal(saved.items[0].group, items[0].group)
    if (type === 'wall') assert.ok(items.every((item) => item.y >= 1.45))
    if (type === 'sink') assert.ok(!items.some((item) => item.name === 'Tapa'))
    if (type !== 'open') assert.ok(items.some((item) => item.name.startsWith('Tirador')))
  }
})

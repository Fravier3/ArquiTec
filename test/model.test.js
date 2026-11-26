import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cabinet, cutPlans, part, project, simplePolygon, validProject } from '../src/model.js'

test('a cabinet fits its stated width and produces individually cuttable boards', () => {
  const boards = cabinet({
    width: 0.9,
    height: 0.85,
    depth: 0.56,
    thickness: 0.018,
    shelves: 2,
    material: 'Roble',
  })
  assert.equal(boards.length, 7)
  assert.equal(
    boards.every((p) => p.board),
    true,
  )
  assert.equal(boards[0].x - boards[0].w / 2, -0.45)
  assert.equal(boards[1].x + boards[1].w / 2, 0.45)
  assert.throws(() =>
    cabinet({ width: 0.02, height: 0.3, depth: 0.4, thickness: 0.02, shelves: 2, material: 'Roble' }),
  )
  const { sheets, oversize } = cutPlans(boards, 1220, 2440, 3)
  assert.deepEqual(oversize, [])
  assert.equal(sheets.flatMap((s) => s.pieces).length, boards.length)
  for (const { pieces } of sheets)
    for (const [i, a] of pieces.entries()) {
      assert.ok(a.x + a.w <= 1220 && a.y + a.h <= 2440)
      for (const b of pieces.slice(i + 1))
        assert.ok(
          a.x + a.w + 3 <= b.x || b.x + b.w + 3 <= a.x || a.y + a.h + 3 <= b.y || b.y + b.h + 3 <= a.y,
        )
    }
  assert.equal(cutPlans(boards, 500, 700, 3).oversize.length, boards.length)
})

test('a project backup round trips and duplicate object identifiers are repaired', () => {
  const p = part('Lateral', 0, 0, 0, 0.018, 1, 0.5, 'Roble', { board: true, hidden: true })
  const original = project('Taller', [p, p])
  const result = validProject(JSON.parse(JSON.stringify(original)))
  assert.equal(result.id, original.id)
  assert.equal(result.items[0].id, p.id)
  assert.notEqual(result.items[1].id, p.id)
  assert.equal(result.items[0].hidden, true)
  assert.equal(result.items[0].board, true)
  assert.throws(() => validProject({ ...original, schema: 99 }))
})

test('closed outlines accept a concave footprint and reject a crossing', () => {
  const points = (values) => values.map(([x, z]) => ({ x, z }))
  assert.equal(
    simplePolygon(
      points([
        [0, 0],
        [2, 0],
        [1, 1],
        [2, 2],
        [0, 2],
      ]),
    ),
    true,
  )
  assert.equal(
    simplePolygon(
      points([
        [0, 0],
        [2, 3],
        [1, 0],
        [0, 2],
      ]),
    ),
    false,
  )
})

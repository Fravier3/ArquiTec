export const colors = {
  Yeso: '#e9e6dd',
  Roble: '#a87048',
  Grafito: '#273744',
  Vidrio: '#649aa5',
  Concreto: '#a6a8a2',
  Óxido: '#a34b3e',
  Oliva: '#747c54',
  Azul: '#4862ce',
}
const maxDimension = 1000
const kindList = ['rect', 'circle', 'polygon']
export const uid = () => crypto.randomUUID()
export const clone = globalThis.structuredClone
export const round = (n) => Math.round(n * 1000) / 1000
export const format = (n) => new Intl.NumberFormat('es-PR', { maximumFractionDigits: 3 }).format(n)
const clamp = (n, lo, hi, fallback) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback

export function part(name, x, y, z, w, h, d, material, extra = {}) {
  return { id: uid(), name, x, y, z, w, h, d, material, rotation: 0, kind: 'rect', ...extra }
}

export function project(name, items = []) {
  return { schema: 1, id: uid(), name, updated: Date.now(), items }
}

export function validProject(raw) {
  if (
    !raw ||
    raw.schema !== 1 ||
    typeof raw.name !== 'string' ||
    !Array.isArray(raw.items) ||
    raw.items.length > 1500
  ) {
    throw new Error('El archivo no es un proyecto ArquiTec compatible.')
  }
  const ids = new Set()
  const items = raw.items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('El proyecto contiene una pieza inválida.')
    const id = typeof item.id === 'string' && !ids.has(item.id) ? item.id : uid()
    ids.add(id)
    const points =
      item.kind === 'polygon' && Array.isArray(item.points)
        ? item.points
            .slice(0, 256)
            .filter((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))
            .map(([x, z]) => [clamp(x, -0.5, 0.5, 0), clamp(z, -0.5, 0.5, 0)])
        : []
    const kind =
      kindList.includes(item.kind) && (item.kind !== 'polygon' || points.length >= 3)
        ? item.kind
        : 'rect'
    return part(
      (typeof item.name === 'string' && item.name.trim().slice(0, 80)) || 'Pieza',
      clamp(item.x, -maxDimension, maxDimension, 0),
      clamp(item.y, -maxDimension, maxDimension, 0),
      clamp(item.z, -maxDimension, maxDimension, 0),
      clamp(item.w, 0.001, maxDimension, 1),
      clamp(item.h, 0, maxDimension, 0),
      clamp(item.d, 0.001, maxDimension, 1),
      Object.hasOwn(colors, item.material) ? item.material : 'Yeso',
      {
        id,
        kind,
        points,
        rotation: clamp(item.rotation, -3600, 3600, 0),
        board: item.board === true,
        hidden: item.hidden === true,
      },
    )
  })
  return {
    schema: 1,
    name: raw.name.trim().slice(0, 80) || 'Sin título',
    items,
    id: typeof raw.id === 'string' ? raw.id : uid(),
    revision: typeof raw.revision === 'string' ? raw.revision : null,
    updated: clamp(raw.updated, 0, Date.now(), Date.now()),
  }
}

export function demo() {
  const items = []
  const add = (...args) => items.push(part(...args))
  add('Plataforma', 0, 0, 0, 10.8, 0.27, 7.8, 'Concreto')
  add('Losa principal', 0, 0.27, -0.35, 8.9, 0.17, 5.45, 'Yeso')
  add('Muro posterior', 0, 0.44, -2.94, 8.8, 2.85, 0.24, 'Yeso')
  add('Muro oeste', -4.25, 0.44, -0.6, 0.26, 2.85, 4.6, 'Yeso')
  add('Muro lateral', 4.25, 0.44, -0.6, 0.25, 2.85, 4.6, 'Yeso')
  add('Cubierta · ala oeste', -2.85, 3.29, -0.6, 3.55, 0.23, 5.08, 'Yeso')
  add('Cubierta · ala este', 2.78, 3.29, -0.6, 3.7, 0.23, 5.08, 'Grafito')
  add('Viga frontal', 0, 3.02, 1.93, 9.16, 0.27, 0.29, 'Grafito')
  add('Viga posterior', 0, 3.02, -2.91, 9.16, 0.27, 0.29, 'Grafito')
  add('Cristal central', -0.02, 0.48, 1.72, 3.49, 2.51, 0.055, 'Vidrio')
  add('Cristal lateral', 4.09, 0.48, 0.62, 0.06, 2.46, 2.13, 'Vidrio')
  add('Jardinera', 3.14, 0.27, 2.5, 2.48, 0.45, 0.7, 'Yeso')
  add('Vegetación', 3.14, 0.69, 2.5, 2.34, 0.12, 0.59, 'Oliva')
  add('Banco de terraza', 1.92, 0.27, 3.2, 1.35, 0.34, 0.37, 'Roble')
  for (let i = 0; i < 13; i++)
    add('Listón ' + (i + 1), -4.08 + 0.205 * i, 0.44, 1.69, 0.091, 2.64, 0.17, 'Roble')
  for (const x of [-1.81, -0.64, 0.53, 1.7, 4.14])
    add('Perfil frontal', x, 0.44, 1.73, 0.08, 2.62, 0.11, 'Grafito')
  for (let i = 0; i < 13; i++)
    add('Tabla de terraza ' + (i + 1), -0.07, 0.27, 2 + 0.101 * i, 4.1, 0.15, 0.095, 'Roble')
  for (let i = 0; i < 3; i++)
    add('Escalón ' + (i + 1), -0.03, 0.03, 3.98 + i * -0.23, 2.65, 0.08 + i * 0.07, 0.24, 'Concreto')
  return project('Pabellón Roble', items)
}

export function cabinet({ width, height, depth, thickness, shelves, material }, x = 0, z = 0) {
  const gap = width - 2 * thickness
  if (
    [width, height, depth, thickness].some((n) => !Number.isFinite(n) || n <= 0 || n > 100) ||
    gap <= 0 ||
    height <= 2 * thickness ||
    depth <= thickness ||
    !Number.isInteger(shelves) ||
    shelves < 0 ||
    shelves > 20 ||
    height <= (shelves + 2) * thickness
  ) {
    throw new Error(
      'Revisa las medidas. El espesor y la cantidad de repisas deben caber en el gabinete.',
    )
  }
  const board = (name, bx, by, bz, w, h, d) =>
    part(name, x + bx, by, z + bz, w, h, d, material, { board: true })
  return [
    board('Lateral izquierdo', -(width - thickness) / 2, 0, 0, thickness, height, depth),
    board('Lateral derecho', (width - thickness) / 2, 0, 0, thickness, height, depth),
    board('Base', 0, 0, thickness / 2, gap, thickness, depth - thickness),
    board('Tapa', 0, height - thickness, thickness / 2, gap, thickness, depth - thickness),
    board('Trasera', 0, 0, -(depth - thickness) / 2, gap, height, thickness),
    ...Array.from({ length: shelves }, (_, i) =>
      board(
        'Repisa ' + (i + 1),
        0,
        thickness + ((i + 1) * (height - 2 * thickness)) / (shelves + 1) - thickness / 2,
        thickness / 2,
        gap,
        thickness,
        depth - thickness,
      ),
    ),
  ]
}

export function cutPlans(items, width, height, kerf) {
  if (
    ![width, height, kerf].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    kerf < 0 ||
    kerf >= Math.min(width, height)
  ) {
    throw new Error('Verifica el tamaño de la plancha y el ancho del corte.')
  }
  const batches = new Map()
  const oversize = []
  for (const item of items.filter((i) => i.board && i.kind === 'rect' && i.h > 0)) {
    const [t, w, h] = [item.w, item.h, item.d].sort((a, b) => a - b)
    const stock = item.material + ' · ' + format(t * 1000) + ' mm'
    const piece = { name: item.name, stock, w: w * 1000, h: h * 1000 }
    if (Math.min(width, height) < piece.w || Math.max(width, height) < piece.h) oversize.push(piece)
    else {
      if (!batches.has(stock)) batches.set(stock, [])
      batches.get(stock).push(piece)
    }
  }
  const sheets = []
  for (const [stock, pieces] of batches) {
    const group = []
    pieces.sort((a, b) => b.h - a.h || b.w - a.w)
    for (const piece of pieces) {
      const options = [
        [piece.w, piece.h],
        [piece.h, piece.w],
      ]
      let space
      for (const sheet of group) {
        for (const row of sheet.rows) {
          const dims = options.find(([w, h]) => row.x + w <= width && h <= row.h)
          if (dims) {
            space = { sheet, row, dims }
            break
          }
        }
        if (space) break
        const dims = options.find(([w, h]) => w <= width && sheet.y + h <= height)
        if (dims) {
          const row = { x: 0, y: sheet.y, h: dims[1] }
          sheet.rows.push(row)
          sheet.y += row.h + kerf
          space = { sheet, row, dims }
          break
        }
      }
      if (!space) {
        const dims = options.find(([w, h]) => w <= width && h <= height)
        const row = { x: 0, y: 0, h: dims[1] }
        const sheet = { stock, rows: [row], pieces: [], y: row.h + kerf }
        group.push(sheet)
        space = { sheet, row, dims }
      }
      const {
        sheet,
        row,
        dims: [w, h],
      } = space
      sheet.pieces.push({ ...piece, x: row.x, y: row.y, w, h })
      row.x += w + kerf
    }
    sheets.push(...group)
  }
  return { sheets, oversize, width, height }
}

export function simplePolygon(points) {
  const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
  const overlaps = (a, b, c, d) =>
    ['x', 'z'].every(
      (k) =>
        Math.max(Math.min(a[k], b[k]), Math.min(c[k], d[k])) <=
        Math.min(Math.max(a[k], b[k]), Math.max(c[k], d[k])),
    )
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length]
    area += a.x * b.z - b.x * a.z
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue
      const c = points[j],
        d = points[(j + 1) % points.length]
      if (
        overlaps(a, b, c, d) &&
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return false
    }
  }
  return Math.abs(area) > 0.00001
}

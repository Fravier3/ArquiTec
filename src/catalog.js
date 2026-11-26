import { cabinet, part, uid } from './model.js'

export const presets = {
  open: {
    name: 'Estantería abierta',
    width: 900,
    height: 850,
    depth: 560,
    shelves: 2,
  },
  base: {
    name: 'Gabinete de cocina · dos puertas',
    width: 900,
    height: 850,
    depth: 600,
    shelves: 1,
  },
  wall: {
    name: 'Gabinete aéreo',
    width: 800,
    height: 700,
    depth: 350,
    shelves: 2,
  },
  drawers: {
    name: 'Módulo de tres gavetas',
    width: 600,
    height: 850,
    depth: 600,
    shelves: 0,
  },
  sink: {
    name: 'Gabinete para fregadero',
    width: 900,
    height: 850,
    depth: 600,
    shelves: 0,
  },
  pantry: {
    name: 'Despensa alta',
    width: 600,
    height: 2100,
    depth: 600,
    shelves: 5,
  },
}

export function kitchenModule(opts, x = 0, z = 0) {
  const type = opts.type || 'open'
  const preset = presets[type]
  if (!preset) throw new Error('Selecciona un módulo de la biblioteca.')
  const { width: w, height: h, depth: d, thickness: t, material } = opts
  const elevation = type === 'wall' ? 1.45 : 0
  const plinth = ['base', 'drawers', 'sink', 'pantry'].includes(type) ? 0.1 : 0
  const bodyHeight = h - plinth
  const group = uid()
  const items = cabinet({ ...opts, height: bodyHeight }, x, z).filter(
    (p) => type !== 'sink' || p.name !== 'Tapa',
  )
  items.forEach((p) => {
    p.y += elevation + plinth
  })
  const add = (name, bx, by, bz, bw, bh, bd, mat = material, board = true) =>
    items.push(part(name, x + bx, elevation + by, z + bz, bw, bh, bd, mat, { board }))
  if (plinth) add('Zócalo', 0, 0, d / 2 - 0.08, w, plinth, t)
  const fronts = type === 'drawers' ? 3 : 2
  if (type !== 'open') {
    if (w <= 0.08 || bodyHeight < 0.12 || d <= 0.08)
      throw new Error('Aumenta las medidas para alojar frentes y herrajes.')
    for (let i = 0; i < fronts; i++) {
      const drawer = type === 'drawers'
      const fw = drawer ? w - 0.006 : (w - 0.009) / 2
      const fh = drawer ? bodyHeight / 3 - 0.004 : bodyHeight - 0.006
      const fx = drawer ? 0 : (i ? 1 : -1) * (fw / 2 + 0.0015)
      const fy = plinth + 0.003 + (drawer ? (i * bodyHeight) / 3 : 0)
      const faceZ = d / 2 + t / 2 + 0.002
      add(drawer ? 'Frente de gaveta ' + (i + 1) : 'Puerta ' + (i + 1), fx, fy, faceZ, fw, fh, t)
      add(
        'Tirador ' + (i + 1),
        drawer ? 0 : fx + (i ? -1 : 1) * (fw / 2 - 0.045),
        fy + fh - 0.06,
        faceZ + t,
        drawer ? Math.min(0.16, fw * 0.5) : 0.012,
        drawer ? 0.012 : 0.12,
        0.025,
        'Grafito',
        false,
      )
      if (drawer) {
        add('Fondo de gaveta ' + (i + 1), 0, fy + 0.025, 0, w - 2 * t - 0.025, t, d - 2 * t - 0.04)
      }
    }
  }
  if (['base', 'drawers'].includes(type))
    add('Encimera', 0, h, 0.012, w + 0.025, 0.03, d + 0.05, 'Concreto')
  if (type === 'sink') {
    // The opening remains empty between four countertop strips.
    add('Encimera izquierda', -(w * 0.375), h, 0.012, w * 0.25, 0.03, d + 0.05, 'Concreto')
    add('Encimera derecha', w * 0.375, h, 0.012, w * 0.25, 0.03, d + 0.05, 'Concreto')
    add('Encimera posterior', 0, h, -d * 0.38, w * 0.5, 0.03, d * 0.24, 'Concreto')
    add('Encimera frontal', 0, h, d * 0.38, w * 0.5, 0.03, d * 0.24, 'Concreto')
  }
  return items.map((p) => ({ ...p, group, assembly: preset.name }))
}

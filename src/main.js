import './style.css'
import { $, esc, icon, icons, layout, tools, download } from './ui.js'
import {
  colors,
  cabinet,
  clone,
  demo,
  format,
  part,
  project,
  round,
  simplePolygon,
  uid,
  validProject,
} from './model.js'
import * as storage from './storage.js'
import { createViewport } from './viewport.js'
import { cabinetDialog, close, cutsDialog, guide, modal, nameDialog, projectsModal } from './dialogs.js'
import { registerUpdates } from './pwa.js'

layout($('app'))
const host = $('viewport')
const editor = host.parentElement
const mobile = matchMedia('(max-width:710px)')
const screen = (event) => ({ x: event.clientX, y: event.clientY })
const selectedItem = () => current.items.find((p) => p.id === selected)
const toolInfo = Object.fromEntries(tools.map((tool) => [tool[0], tool]))
const keys = Object.fromEntries(tools.map(([id, i, name, key]) => [key.toLowerCase(), id]))
let viewport
let current
let selected
let activeTool = 'select'
let activeTab = 'geometry'
let guides = true
let past = []
let future = []
let anchor
let vertices = []
let pointer
let zoomTouch = false
const touch = new Set()
let saveQueue = Promise.resolve(true)
let saveSequence = 0
let toastTimer
let operation = Promise.resolve()
let storageFault = false
let persisted

function notify(message) {
  const output = $('toast')
  output.hidden = false
  output.textContent = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    output.hidden = true
  }, 3400)
}

function queueSave(openOnly = false) {
  const snapshot = clone(current)
  const expected = persisted
  snapshot.revision = uid()
  const seq = ++saveSequence
  $('save-state').textContent = 'Guardando…'
  saveQueue = saveQueue.then(async () => {
    try {
      if (openOnly) await storage.markActive(snapshot.id)
      else {
        await storage.save(snapshot, expected)
        expected.exists = true
        expected.revision = snapshot.revision
      }
      if (seq === saveSequence) {
        $('save-state').innerHTML = icon('check') + ' Guardado en el dispositivo'
        icons()
      }
      storageFault = false
      return true
    } catch (error) {
      if (seq === saveSequence) $('save-state').textContent = 'No se pudo guardar'
      if (!storageFault)
        notify(
          error.message?.includes('otra pestaña')
            ? error.message
            : 'El almacenamiento local no está disponible. Exporta un respaldo desde Proyectos.',
        )
      storageFault = true
      return false
    }
  })
}

function run(task) {
  operation = operation
    .then(task)
    .catch((error) => notify(error.message || 'No se pudo completar la operación.'))
  return operation
}

function activeProject(p, exists = false) {
  current = p
  persisted = { exists, revision: exists ? (p.revision ?? null) : null }
  past = []
  future = []
  selected = undefined
  activeTab = 'geometry'
  changeTool('select')
  refresh()
  viewport?.view($('view').value, true)
  queueSave(exists)
}

function change(update, selection = selected, refreshPanel = true) {
  const previous = { name: current.name, items: clone(current.items), selected }
  update()
  if (previous.name === current.name && JSON.stringify(previous.items) === JSON.stringify(current.items))
    return
  past.push(previous)
  if (past.length > 50) past.shift()
  future = []
  selected = selection
  current.updated = Math.max(Date.now(), current.updated + 1)
  refresh(refreshPanel)
  queueSave()
}

function history(direction) {
  const [from, to] = direction === 'undo' ? [past, future] : [future, past]
  if (!from.length) return
  cancel()
  to.push({ name: current.name, items: clone(current.items), selected })
  const state = from.pop()
  current.name = state.name
  current.items = state.items
  current.updated = Math.max(Date.now(), current.updated + 1)
  selected = state.selected
  refresh()
  queueSave()
}

function panel(open) {
  editor.classList.toggle('panel-closed', !open)
  $('toggle-inspector').setAttribute('aria-expanded', String(open))
}

function changeTool(tool) {
  cancel()
  activeTool = tool
  viewport?.tool(tool)
  document
    .querySelectorAll('[data-tool]')
    .forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.tool === tool)))
  status()
}

function status(message) {
  $('tool-status').textContent = message || toolInfo[activeTool][4]
  $('tool-status').title = $('tool-status').textContent
}

function refresh(refreshPanel = true) {
  $('project-name').textContent = current.name
  $('undo').disabled = !past.length
  $('redo').disabled = !future.length
  $('object-count').textContent = current.items.length
  $('tab-geometry').setAttribute('aria-pressed', String(activeTab === 'geometry'))
  $('tab-objects').setAttribute('aria-pressed', String(activeTab === 'objects'))
  viewport?.sync(current.items, selected)
  if (!refreshPanel) return
  const item = selectedItem()
  const target = $('panel-body')
  const scroll = target.scrollTop
  if (activeTab === 'objects') {
    target.innerHTML = current.items.length
      ? '<div class="object-list">' +
        current.items
          .map(
            (p, i) => `
      <div class="object-row"><button data-select="${i}" aria-pressed="${p.id === selected}" title="${esc(p.name)}"><span class="dot" style="background:${colors[p.material]}"></span><span>${esc(p.name)}</span></button>
      <button data-hide="${i}" title="${p.hidden ? 'Mostrar' : 'Ocultar'} ${esc(p.name)}">${p.hidden ? 'Mostrar' : 'Ocultar'}</button></div>`,
          )
          .join('') +
        '</div>'
      : '<p class="empty">El proyecto está vacío. Dibuja una cara o inserta un gabinete.</p>'
  } else if (item) {
    const input = (key, label, limits = '') =>
      `<label class="field">${label}<input type="number" inputmode="decimal" step="any" data-field="${key}" value="${round(item[key])}" ${limits}></label>`
    target.innerHTML = `
      <section class="panel-section"><h3>Selección</h3><label class="field">Nombre<input maxlength="80" data-field="name" value="${esc(item.name)}"></label></section>
      <section class="panel-section"><h3>Dimensiones · m</h3><div class="fields">
      ${input('w', 'Ancho', 'min="0.001" max="1000"')}${input('h', 'Altura', 'min="0" max="1000"')}${input('d', 'Fondo', 'min="0.001" max="1000"')}</div></section>
      <section class="panel-section"><h3>Posición · m</h3><div class="fields">
      ${input('x', 'X', 'min="-1000" max="1000"')}${input('y', 'Elevación', 'min="-1000" max="1000"')}${input('z', 'Z', 'min="-1000" max="1000"')}</div>
      <div class="field-full">${input('rotation', 'Giro · °', 'min="-3600" max="3600"')}</div></section>
      <section class="panel-section"><h3>Materiales</h3>${swatches(item.material)}
      ${item.kind === 'rect' && item.h > 0 ? `<label class="check"><input type="checkbox" data-field="board" ${item.board ? 'checked' : ''}> Incluir como tablero en el corte</label>` : ''}</section>
      <section class="panel-section inline-actions"><button id="duplicate" class="secondary">${icon('copy')} Duplicar</button><button id="delete" class="ghost danger">${icon('trash-2')} Borrar</button></section>`
  } else {
    target.innerHTML = `<section class="panel-section"><h3>Selección</h3><div class="selection-heading">Ninguna pieza seleccionada</div><p>Toca una pieza para ajustar sus medidas, posición o material.</p></section>
      <section class="panel-section"><h3>Materiales</h3>${swatches(null)}<p>Selecciona una pieza para aplicarle un acabado.</p></section>
      <section class="panel-section"><h3>Proyecto</h3><button id="backup-current" class="secondary wide">${icon('download')} Exportar respaldo</button></section>`
  }
  target.scrollTop = scroll
  icons()
}

function swatches(currentMaterial) {
  return (
    '<div class="swatches">' +
    Object.entries(colors)
      .map(
        ([name, color]) =>
          '<button ' +
          (currentMaterial ? '' : 'disabled ') +
          'data-material="' +
          name +
          '" style="--sample:' +
          color +
          '" title="' +
          name +
          '" aria-label="' +
          name +
          '" aria-pressed="' +
          (name === currentMaterial) +
          '"></button>',
      )
      .join('') +
    '</div>'
  )
}

function select(id) {
  selected = id
  refresh()
}

function changeItem(p, next) {
  change(() => Object.assign(p, next), p.id)
}

function dropSelected() {
  const p = selectedItem()
  if (!p) return
  change(() => {
    current.items = current.items.filter((item) => item.id !== p.id)
  }, undefined)
  selected = undefined
  refresh()
}

function insert(items) {
  if (current.items.length + items.length > 1500)
    throw new Error('El proyecto admite hasta 1500 piezas.')
  change(() => current.items.push(...items), items[0].id)
}

function exportProject(p) {
  const filename =
    p.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'proyecto'
  download(JSON.stringify(p, null, 2), filename + '.arquitec', 'application/json')
}

async function library() {
  await saveQueue
  let items
  try {
    items = await storage.list()
  } catch {
    items = []
  }
  const fresh = new Map(items.map((p) => [p.id, p]))
  if (!fresh.has(current.id) || storageFault) fresh.set(current.id, current)
  const ordered = [...fresh.values()].sort((a, b) => b.updated - a.updated)
  projectsModal(ordered, current.id, {
    open: (p) => {
      close()
      if (p.id === current.id && !storageFault) return
      void run(async () => {
        await saveQueue
        const stored = (await storage.list()).find((item) => item.id === p.id)
        if (!stored) throw new Error('El proyecto ya no está en el dispositivo.')
        activeProject(validProject(stored), true)
      })
    },
    backup: (p) => exportProject(p.id === current.id ? current : p),
    remove: (p) => {
      modal(
        'Borrar proyecto',
        `<p class="guide-intro">¿Quieres borrar «${esc(p.name)}» de este dispositivo?</p>
        <div class="dialog-actions"><button id="cancel-delete" class="secondary">Cancelar</button><button id="confirm-delete" class="secondary danger">Borrar proyecto</button></div>`,
      )
      $('cancel-delete').onclick = () => void library()
      $('confirm-delete').onclick = () =>
        void run(async () => {
          await saveQueue
          await storage.remove(p.id)
          if (p.id === current.id) {
            const next = (await storage.list()).sort((a, b) => b.updated - a.updated)[0]
            if (next) activeProject(validProject(next), true)
            else activeProject(project('Sin título'))
          }
          await library()
        })
    },
    example: () => {
      close()
      void run(async () => {
        await saveQueue
        activeProject(demo())
      })
    },
  })
}

function ground(e, y = 0) {
  const point = viewport.ground(e, y)
  if (!point) return null
  const snap = $('snap').checked
  const n = (v) => (snap ? Math.round(v * 10) / 10 : round(v))
  $('coordinate').textContent = 'X ' + point.x.toFixed(2) + ' · Z ' + point.z.toFixed(2)
  return { x: n(point.x), z: n(point.z) }
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
function shape(a, b, tool) {
  if (!a || !b) return null
  const isCircle = tool === 'circle'
  const radius = distance(a, b)
  const w = isCircle ? 2 * radius : Math.abs(a.x - b.x),
    d = isCircle ? 2 * radius : Math.abs(a.z - b.z)
  if (w < 0.001 || d < 0.001 || w > 1000 || d > 1000) return null
  return {
    x: isCircle ? a.x : (a.x + b.x) / 2,
    y: 0,
    z: isCircle ? a.z : (a.z + b.z) / 2,
    w: round(w),
    h: 0,
    d: round(d),
    rotation: 0,
    kind: tool,
    material: 'Yeso',
  }
}
function commitShape(candidate, name) {
  if (!candidate) return
  insert([{ ...candidate, id: uid(), name }])
}

function finishPolygon() {
  if (vertices.length < 3) {
    status('Añade al menos tres vértices.')
    return
  }
  const xs = vertices.map((p) => p.x),
    zs = vertices.map((p) => p.z)
  const w = Math.max(...xs) - Math.min(...xs),
    d = Math.max(...zs) - Math.min(...zs)
  if (w < 0.001 || d < 0.001 || w > 1000 || d > 1000 || !simplePolygon(vertices)) {
    status('Traza un contorno simple sin cruces.')
    return
  }
  const x = Math.min(...xs) + w / 2,
    z = Math.min(...zs) + d / 2
  commitShape(
    {
      x,
      y: 0,
      z,
      w,
      h: 0,
      d,
      kind: 'polygon',
      points: vertices.map((p) => [(p.x - x) / w, (p.z - z) / d]),
      rotation: 0,
      material: 'Yeso',
    },
    'Polígono',
  )
  cancel()
  status()
}

function cancel() {
  anchor = undefined
  vertices = []
  pointer = undefined
  $('cancel-tool').hidden = true
  $('measurement').hidden = true
  viewport?.preview(null)
}

function bindView() {
  if (!viewport) return
  const { canvas } = viewport
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      touch.add(e.pointerId)
      if (touch.size > 1) {
        cancel()
        zoomTouch = true
        return
      }
    }
    if (e.button !== 0 || zoomTouch || ['orbit', 'pan'].includes(activeTool)) return
    const item = current.items.find((p) => p.id === viewport.pick(e))
    pointer = {
      id: e.pointerId,
      start: screen(e),
      startGround: ground(e, activeTool === 'move' ? item?.y : 0),
      item,
    }
    canvas.setPointerCapture(e.pointerId)
    if (['push', 'move', 'rotate'].includes(activeTool) && item) select(item.id)
  })

  function transform(e) {
    const p = pointer
    const item = p.item
    const dx = e.clientX - p.start.x,
      dy = e.clientY - p.start.y
    if (activeTool === 'push') {
      const n = item.h - dy * viewport.verticalScale()
      return { h: Math.max(0, Math.min(1000, $('snap').checked ? Math.round(n * 20) / 20 : round(n))) }
    }
    if (activeTool === 'rotate') {
      const n = item.rotation + dx * 0.65
      const angle = $('snap').checked ? Math.round(n / 5) * 5 : round(n)
      return { rotation: ((angle % 360) + 360) % 360 }
    }
    const pos = ground(e, item.y)
    return pos && p.startGround
      ? {
          x: round(Math.max(-1000, Math.min(1000, item.x + pos.x - p.startGround.x))),
          z: round(Math.max(-1000, Math.min(1000, item.z + pos.z - p.startGround.z))),
        }
      : null
  }

  canvas.addEventListener('pointermove', (e) => {
    if (zoomTouch) return
    const p = ground(e)
    if (!p) return
    if (['rect', 'circle'].includes(activeTool)) {
      const start = anchor || pointer?.startGround
      if (start) viewport.preview(shape(start, p, activeTool))
    }
    if (activeTool === 'polygon' && vertices.length) viewport.preview(null, [...vertices, p])
    if (activeTool === 'measure' && anchor) viewport.preview(null, [anchor, p])
    if (
      pointer?.item &&
      ['push', 'move', 'rotate'].includes(activeTool) &&
      Math.hypot(e.clientX - pointer.start.x, e.clientY - pointer.start.y) > 4
    ) {
      const next = transform(e)
      if (next) viewport.preview({ ...pointer.item, ...next })
    }
  })

  canvas.addEventListener('pointerup', (e) => {
    touch.delete(e.pointerId)
    if (zoomTouch) {
      if (!touch.size) zoomTouch = false
      return
    }
    if (pointer?.id !== e.pointerId) return
    const p = ground(e)
    const moved = Math.hypot(e.clientX - pointer.start.x, e.clientY - pointer.start.y) > 6
    try {
      if (activeTool === 'select' && !moved) select(pointer.item?.id)
      if (['push', 'move', 'rotate'].includes(activeTool)) {
        if (moved && pointer.item) {
          const next = transform(e)
          if (next) changeItem(pointer.item, next)
        }
        viewport.preview(null)
      }
      if (!p) return
      if (['rect', 'circle'].includes(activeTool)) {
        const start = anchor || (moved ? pointer.startGround : null)
        if (start) {
          const candidate = shape(start, p, activeTool)
          if (candidate) {
            commitShape(candidate, activeTool === 'rect' ? 'Rectángulo' : 'Círculo')
            cancel()
            status()
          }
        } else {
          anchor = p
          status(activeTool === 'rect' ? 'Marca la segunda esquina.' : 'Marca el borde.')
        }
      }
      if (activeTool === 'polygon' && !moved) {
        if (
          vertices.length >= 3 &&
          distance(vertices[0], p) < Math.max(0.12, viewport.verticalScale() * 11)
        )
          finishPolygon()
        else if (vertices.length < 256 && (!vertices.length || distance(vertices.at(-1), p) > 0.001)) {
          vertices.push(p)
          viewport.preview(null, vertices)
          status(
            vertices.length < 3 ? 'Añade vértices.' : 'Toca el primer punto o pulsa Intro para cerrar.',
          )
        }
      }
      if (activeTool === 'measure' && !moved) {
        if (!anchor) {
          $('measurement').hidden = true
          anchor = p
          status('Marca el segundo punto.')
        } else {
          viewport.preview(null, [anchor, p])
          $('measurement').textContent = format(distance(anchor, p)) + ' m'
          $('measurement').hidden = false
          anchor = undefined
          status()
        }
      }
    } catch (error) {
      notify(error.message)
      cancel()
      status()
    } finally {
      pointer = undefined
      $('cancel-tool').hidden = !(anchor || vertices.length || !$('measurement').hidden)
    }
  })
  canvas.addEventListener('pointercancel', (e) => {
    touch.delete(e.pointerId)
    if (!touch.size) zoomTouch = false
    cancel()
    status()
  })
}

function events() {
  document.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => changeTool(b.dataset.tool)))
  $('cancel-tool').onclick = () => {
    cancel()
    status()
  }
  $('open-guide').onclick = () => guide(__APP_VERSION__)
  $('open-projects').onclick = () => void run(library)
  $('new-project').onclick = () =>
    nameDialog(
      'Nuevo proyecto',
      'Crear proyecto',
      'Sin título',
      (name) =>
        void run(async () => {
          await saveQueue
          activeProject(project(name))
        }),
    )
  $('project-title').onclick = () =>
    nameDialog('Cambiar nombre', 'Guardar', current.name, (name) =>
      change(() => {
        current.name = name
      }),
    )
  $('close-dialog').onclick = close
  $('undo').onclick = () => history('undo')
  $('redo').onclick = () => history('redo')
  $('fit').onclick = () => viewport?.view($('view').value, true)
  $('view').onchange = (e) => viewport?.view(e.currentTarget.value)
  $('grid').setAttribute('aria-pressed', 'true')
  $('grid').onclick = () => {
    guides = !guides
    viewport?.guides(guides)
    $('grid').setAttribute('aria-pressed', String(guides))
  }
  $('toggle-inspector').onclick = () => panel(editor.classList.contains('panel-closed'))
  $('close-inspector').onclick = () => panel(false)
  mobile.addEventListener('change', () => panel(!mobile.matches))
  panel(!mobile.matches)
  $('tab-geometry').onclick = () => {
    activeTab = 'geometry'
    refresh()
  }
  $('tab-objects').onclick = () => {
    activeTab = 'objects'
    refresh()
  }
  $('insert-cabinet').onclick = () =>
    cabinetDialog((opts) => {
      const start = selectedItem()
      insert(cabinet(opts, start ? start.x + start.w / 2 + opts.width / 2 + 0.15 : 0, start?.z || 0))
      viewport?.view($('view').value, true)
      notify('Gabinete insertado. El plan de corte incluye sus tableros.')
    })
  $('open-cuts').onclick = () => cutsDialog(current.items)
  $('import-file').onchange = (e) => {
    const file = e.currentTarget.files[0]
    e.currentTarget.value = ''
    if (!file) return
    void run(async () => {
      if (file.size > 12_000_000) throw new Error('El archivo supera el límite de 12 MB.')
      const imported = validProject(JSON.parse(await file.text()))
      await saveQueue
      imported.id = uid()
      imported.updated = Date.now()
      close()
      activeProject(imported)
      notify('Proyecto importado.')
    })
  }
  $('panel-body').addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.select !== undefined) select(current.items[+b.dataset.select].id)
    if (b.dataset.hide !== undefined) {
      const p = current.items[+b.dataset.hide]
      changeItem(p, { hidden: !p.hidden })
    }
    if (b.id === 'backup-current') exportProject(current)
    const p = selectedItem()
    if (!p) return
    if (b.dataset.material) changeItem(p, { material: b.dataset.material })
    if (b.id === 'delete') dropSelected()
    if (b.id === 'duplicate') {
      try {
        insert([
          {
            ...clone(p),
            id: uid(),
            name: (p.name + ' · copia').slice(0, 80),
            x: Math.min(1000, p.x + 0.3),
            z: Math.min(1000, p.z + 0.3),
          },
        ])
      } catch (error) {
        notify(error.message)
      }
    }
  })
  $('panel-body').addEventListener('change', (e) => {
    const field = e.target
    const key = field.dataset.field
    if (!key) return
    const p = selectedItem()
    if (!p) return
    if (key === 'board') {
      changeItem(p, { board: field.checked })
      return
    }
    if (!field.checkValidity() || !field.value.trim()) {
      field.value = p[key]
      return
    }
    const value = key === 'name' ? field.value.trim() : field.valueAsNumber
    field.value = String(value)
    change(
      () => {
        p[key] = value
      },
      p.id,
      key === 'h' && p.kind === 'rect' && Boolean(value) !== Boolean(p.h),
    )
  })
  document.addEventListener('keydown', (e) => {
    if ($('dialog').open || e.target.closest('input,select,textarea,[contenteditable]')) return
    const key = e.key.toLowerCase(),
      mod = e.ctrlKey || e.metaKey
    if (mod && key === 'z') {
      e.preventDefault()
      history(e.shiftKey ? 'redo' : 'undo')
    }
    if (mod && key === 'y') {
      e.preventDefault()
      history('redo')
    }
    if (mod || e.altKey) return
    if (keys[key] && !e.repeat) changeTool(keys[key])
    if (key === 'escape') {
      cancel()
      status()
    }
    if (key === 'enter' && activeTool === 'polygon' && vertices.length) {
      e.preventDefault()
      try {
        finishPolygon()
      } catch (error) {
        notify(error.message)
      }
    }
    if (key === 'delete' || key === 'backspace') {
      e.preventDefault()
      dropSelected()
    }
  })
}

async function start() {
  let first
  try {
    const projects = await storage.list()
    const id = await storage.active()
    const recent = projects.find((p) => p.id === id) || projects.sort((a, b) => b.updated - a.updated)[0]
    if (recent) first = validProject(recent)
  } catch {
    notify('No se pudo abrir el almacenamiento local.')
  }
  try {
    viewport = createViewport(host)
  } catch {
    host.insertAdjacentHTML(
      'afterbegin',
      '<p class="render-error">El visor 3D necesita WebGL 2. Puedes abrir, editar medidas y respaldar tus proyectos desde el Inspector.</p>',
    )
  }
  activeProject(first || demo(), Boolean(first))
  events()
  bindView()
  requestAnimationFrame(() => requestAnimationFrame(() => viewport?.view($('view').value, true)))
  registerUpdates(() => saveQueue, notify)
}

void start()

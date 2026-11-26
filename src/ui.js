import {
  createIcons,
  ArrowUpRight,
  ArrowUpToLine,
  Axis3d,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  Circle,
  ClipboardList,
  Copy,
  Download,
  FolderOpen,
  Grid3x3,
  Hand,
  Layers3,
  Maximize,
  MousePointer2,
  Move,
  PanelRight,
  Pencil,
  Plus,
  Redo2,
  Rotate3d,
  RotateCw,
  Ruler,
  Square,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide'

export const icons = () =>
  createIcons({
    icons: {
      ArrowUpRight,
      ArrowUpToLine,
      Axis3d,
      BookOpen,
      Box,
      Check,
      ChevronDown,
      Circle,
      ClipboardList,
      Copy,
      Download,
      FolderOpen,
      Grid3x3,
      Hand,
      Layers3,
      Maximize,
      MousePointer2,
      Move,
      PanelRight,
      Pencil,
      Plus,
      Redo2,
      Rotate3d,
      RotateCw,
      Ruler,
      Square,
      Trash2,
      Undo2,
      Upload,
      X,
    },
  })
export const icon = (name) => '<i aria-hidden="true" data-lucide="' + name + '"></i>'
export const $ = (id) => document.getElementById(id)
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
export const tools = [
  ['select', 'mouse-pointer-2', 'Seleccionar', 'V', 'Toca una pieza para ver y editar sus propiedades.'],
  [
    'rect',
    'square',
    'Rectángulo',
    'R',
    'Marca dos esquinas o arrastra para dibujar una cara rectangular.',
  ],
  [
    'circle',
    'circle',
    'Círculo',
    'C',
    'Marca el centro y después el borde o arrastra para definir el radio.',
  ],
  [
    'polygon',
    'pencil',
    'Línea / polígono',
    'L',
    'Añade vértices sobre el suelo. Toca el primero o pulsa Intro para cerrar.',
  ],
  [
    'push',
    'arrow-up-to-line',
    'Empujar / tirar',
    'P',
    'Arrastra una cara o un sólido hacia arriba o abajo. Ajusta la altura exacta en el inspector.',
  ],
  [
    'move',
    'move',
    'Mover',
    'M',
    'Arrastra una pieza sobre el plano horizontal. Edita la elevación en el inspector.',
  ],
  [
    'rotate',
    'rotate-cw',
    'Girar',
    'Q',
    'Arrastra una pieza lateralmente para girarla alrededor del eje vertical.',
  ],
  [
    'measure',
    'ruler',
    'Medir',
    'T',
    'Marca dos puntos en el suelo para medir la distancia entre ellos.',
  ],
  ['orbit', 'rotate-3d', 'Orbitar', 'O', 'Arrastra para girar la cámara alrededor del modelo.'],
  ['pan', 'hand', 'Desplazar vista', 'H', 'Arrastra para desplazar la cámara sin girarla.'],
]
export const viewNames = { iso: 'Perspectiva', top: 'Superior', front: 'Frontal', side: 'Lateral' }

const button = (id, i, title, cls = '') =>
  '<button id="' +
  id +
  '" class="' +
  cls +
  '" title="' +
  title +
  '" aria-label="' +
  title +
  '">' +
  icon(i) +
  '</button>'
export function layout(root) {
  root.innerHTML = `
  <header class="topbar">
    <div class="brand"><img src="./icon-96.png" alt=""><div><strong>ArquiTec</strong><span>ESTUDIO 3D</span></div></div>
    <div class="project-heading">
      <button id="project-title" class="project-title" title="Cambiar nombre"><span id="project-name">Pabellón Roble</span>${icon('chevron-down')}</button>
      <span id="save-state" class="save-state" role="status"></span>
    </div>
    <nav class="head-actions" aria-label="Proyecto">
      <button id="open-guide" class="ghost" aria-label="Guía">${icon('book-open')}<span>Guía</span></button>
      <button id="open-projects" class="ghost" aria-label="Proyectos">${icon('folder-open')}<span>Proyectos</span></button>
      <button id="new-project" class="primary" aria-label="Nuevo proyecto">${icon('plus')}<span>Nuevo proyecto</span></button>
    </nav>
  </header>
  <main class="studio">
    <div class="workspace-bar">
      <div class="workspace-title">${icon('box')} <strong>Modelado</strong></div>
      <div class="workspace-actions">
        ${button('undo', 'undo-2', 'Deshacer (Ctrl/Cmd+Z)')}
        ${button('redo', 'redo-2', 'Rehacer (Ctrl/Cmd+Shift+Z)')}
        <span class="divider"></span>
        <button id="insert-cabinet" class="ghost compact" title="Insertar gabinete">${icon('box')}<span>Gabinete</span></button>
        <button id="open-cuts" class="ghost compact" title="Plan de corte">${icon('clipboard-list')}<span>Corte</span></button>
        ${button('toggle-inspector', 'panel-right', 'Mostrar u ocultar inspector')}
      </div>
    </div>
    <div class="editor">
      <nav class="rail" aria-label="Herramientas de modelado">${tools
        .map(
          ([id, i, name, key], n) => `
        ${[1, 4, 8].includes(n) ? '<hr>' : ''}<button type="button" data-tool="${id}" title="${name} (${key})" aria-label="${name}" aria-pressed="false">${icon(i)}<span>${id === 'pan' ? 'Paneo' : name.split(' / ')[0]}</span></button>`,
        )
        .join('')}</nav>
      <section id="viewport" class="viewport" aria-label="Vista del modelo">
        <div class="canvas-top">
          <div class="view-control">${icon('axis-3d')}<select id="view" aria-label="Orientación de cámara">${Object.entries(
            viewNames,
          )
            .map(([id, name]) => '<option value="' + id + '">' + name + '</option>')
            .join('')}</select>${icon('chevron-down')}</div>
          <div class="view-actions">${button('grid', 'grid-3x3', 'Mostrar u ocultar cuadrícula')}${button('fit', 'maximize', 'Encuadrar modelo')}</div>
        </div>
        <div class="canvas-bottom"><span id="coordinate" aria-hidden="true">X 0.00 · Z 0.00</span><button id="cancel-tool" hidden>Cancelar</button></div>
        <output id="measurement" class="measurement" hidden></output>
      </section>
      <aside id="inspector" class="inspector" aria-label="Inspector">
        <div class="panel-head">${icon('layers-3')}<strong>Inspector</strong>${button('close-inspector', 'x', 'Cerrar inspector', 'close-inspector')}</div>
        <div class="tabs"><button id="tab-geometry" aria-pressed="true">Geometría</button><button id="tab-objects" aria-pressed="false">Objetos <span id="object-count"></span></button></div>
        <div id="panel-body"></div>
      </aside>
    </div>
    <footer class="statusbar"><span id="tool-status"></span><div><label title="Ajustar los puntos a intervalos de 0.10 metros"><input id="snap" type="checkbox" checked> Ajuste</label><span>Metros</span></div></footer>
  </main>
  <dialog id="dialog"><div class="dialog-head"><h2 id="dialog-title"></h2>${button('close-dialog', 'x', 'Cerrar')}</div><div id="dialog-body"></div></dialog>
  <input id="import-file" type="file" accept=".arquitec,.json,application/json" hidden>
  <div id="toast" role="status" hidden></div>`
  icons()
}

export function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

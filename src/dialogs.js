import { presets, kitchenModule } from './catalog.js'
import { $, esc, icon, icons, tools, download } from './ui.js'
import { colors, cutPlans, format } from './model.js'

export function modal(title, content) {
  $('dialog-body').onclick = null
  $('dialog-title').textContent = title
  $('dialog-body').innerHTML = content
  icons()
  if (!$('dialog').open) $('dialog').showModal()
}
export const close = () => $('dialog').close()

const button = (label, id, type = 'secondary') =>
  '<button class="' + type + '" id="' + id + '">' + label + '</button>'
const number = (id, label, value, min, max, step = 'any') =>
  '<label class="field">' +
  label +
  '<input required name="' +
  id +
  '" type="number" min="' +
  min +
  '" max="' +
  max +
  '" step="' +
  step +
  '" value="' +
  value +
  '"></label>'

export function guide(version) {
  modal(
    'Guía del estudio',
    `<p class="guide-intro">Dibuja una cara sobre la cuadrícula, extrúyela y ajusta las medidas en el Inspector. Usa Proyectos para abrir un modelo anterior o exportar un respaldo.</p>
    <ul class="guide-list">${tools.map(([id, i, name, key, description]) => '<li>' + icon(i) + '<strong>' + name + '</strong><kbd>' + key + '</kbd><p>' + description + '</p></li>').join('')}</ul>
    <p class="guide-intro"><strong>Mano libre.</strong> Arrastra para orbitar, toca una pieza para seleccionarla y mantenla presionada para abrir sus opciones. Eliminar se puede deshacer con la flecha Deshacer.</p><p class="guide-intro"><strong>Cámara.</strong> Usa la rueda o el pellizco para acercarte y el encuadre para recuperar el modelo. Con un mouse, el botón central orbita y el derecho desplaza.</p>
    <p class="guide-intro"><strong>Instalación.</strong> En iPhone y iPad abre el enlace en Safari y elige Compartir → Añadir a pantalla de inicio. En navegadores de escritorio compatibles, usa la opción de instalar de la barra de direcciones.</p>
    <p class="guide-intro"><strong>Respaldo.</strong> Los proyectos se guardan en este navegador. Exporta un archivo .arquitec para conservar una copia en Archivos o abrirlo en otro dispositivo.</p>
    <small>ArquiTec ${esc(version)}</small>`,
  )
}

export function nameDialog(title, label, current, submit) {
  modal(
    title,
    `<form id="name-form"><label class="field">Nombre del proyecto<input required name="name" maxlength="80" value="${esc(current)}" autofocus></label>
    <div class="dialog-actions"><button class="primary" type="submit">${label}</button></div></form>`,
  )
  const form = $('name-form')
  form.elements.name.select()
  form.onsubmit = (e) => {
    e.preventDefault()
    const name = form.elements.name.value.trim()
    if (name) {
      close()
      submit(name)
    } else form.elements.name.focus()
  }
}

export function projectsModal(projects, currentId, { open, backup, remove, example }) {
  modal(
    'Proyectos locales',
    `<p class="guide-intro">Los dibujos están en el almacenamiento local de ArquiTec (IndexedDB), dentro de este navegador o PWA. Abre uno aquí. Para verlo en la app Archivos o llevarlo a otro dispositivo, exporta su respaldo .arquitec. Borrar los datos del sitio elimina las copias locales.</p>
    <div class="dialog-actions">${button(icon('upload') + ' Importar archivo', 'import-action')}${button('Abrir ejemplo', 'open-example')}</div>
    <div>${projects
      .map(
        (p, i) => `<div class="project-row"><button data-open="${i}"><strong>${esc(p.name)}</strong>
    <small>${p.id === currentId ? 'Proyecto activo · ' : ''}${p.items.length} piezas · ${new Date(p.updated).toLocaleDateString('es-PR')}</small></button>
    <button data-backup="${i}" title="Exportar respaldo" aria-label="Exportar ${esc(p.name)}">${icon('download')}</button>
    <button class="danger" data-remove="${i}" title="Borrar proyecto" aria-label="Borrar ${esc(p.name)}">${icon('trash-2')}</button></div>`,
      )
      .join('')}</div>`,
  )
  $('import-action').onclick = () => $('import-file').click()
  $('open-example').onclick = example
  $('dialog-body').onclick = (e) => {
    const target = e.target.closest('[data-open],[data-backup],[data-remove]')
    if (!target) return
    if (target.dataset.open !== undefined) open(projects[+target.dataset.open])
    if (target.dataset.backup !== undefined) backup(projects[+target.dataset.backup])
    if (target.dataset.remove !== undefined) remove(projects[+target.dataset.remove])
  }
}

export function cabinetDialog(insert) {
  modal(
    'Biblioteca de gabinetes',
    `<form id="cabinet-form"><p class="guide-intro">Elige un módulo de cocina, ajusta sus medidas e insértalo. Incluye frentes, tiradores y tableros para el plan de corte.</p>
    <label class="field field-full">Objeto<select id="cabinet-type" name="type">${Object.entries(presets)
      .map(([id, p]) => '<option value="' + id + '">' + p.name + '</option>')
      .join('')}</select></label>
    <div class="fields two">
      ${number('width', 'Ancho (mm)', 900, 50, 100000)}
      ${number('height', 'Altura (mm)', 850, 50, 100000)}
      ${number('depth', 'Profundidad (mm)', 560, 50, 100000)}
      ${number('thickness', 'Espesor (mm)', 18, 1, 10000)}
      ${number('shelves', 'Repisas', 2, 0, 20, 1)}
      <label class="field">Material<select name="material">${Object.keys(colors)
        .map((k) => '<option ' + (k === 'Roble' ? 'selected' : '') + '>' + k + '</option>')
        .join('')}</select></label>
    </div><p id="cabinet-error" class="danger" role="status"></p>
    <button class="primary" type="submit">${icon('plus')} Insertar gabinete</button></form>`,
  )
  icons()
  $('cabinet-type').onchange = (event) => {
    const preset = presets[event.target.value]
    const form = $('cabinet-form')
    for (const key of ['width', 'height', 'depth', 'shelves']) form.elements[key].value = preset[key]
  }
  $('cabinet-form').onsubmit = (e) => {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    try {
      const read = (key) => Number(fields.get(key)) / 1000
      const opts = {
        type: fields.get('type'),
        width: read('width'),
        height: read('height'),
        depth: read('depth'),
        thickness: read('thickness'),
        shelves: Number(fields.get('shelves')),
        material: fields.get('material'),
      }
      kitchenModule(opts)
      insert(opts)
      close()
    } catch (error) {
      $('cabinet-error').textContent = error.message
    }
  }
}

export function cutsDialog(items) {
  modal(
    'Plan de corte',
    `<p class="guide-intro">Calcula una distribución aproximada por material y espesor. El acomodo admite rotar piezas 90° y deja espacio para el ancho de sierra. El plano no conserva la orientación de la veta.</p>
    <form id="cut-form"><div class="fields">
      ${number('width', 'Ancho (mm)', 1220, 1, 100000)}
      ${number('height', 'Largo (mm)', 2440, 1, 100000)}
      ${number('kerf', 'Corte (mm)', 3, 0, 1000)}
    </div><div class="dialog-actions"><button class="primary">Calcular</button>${button('Exportar CSV', 'cut-csv')}</div></form><div id="cut-output" aria-live="polite"></div>`,
  )
  const form = $('cut-form'),
    csv = $('cut-csv')
  csv.type = 'button'
  let latest
  const calculate = () => {
    const fields = new FormData(form)
    const out = $('cut-output')
    latest = null
    csv.disabled = true
    try {
      const { sheets, oversize, width, height } = cutPlans(
        items,
        ...['width', 'height', 'kerf'].map((k) => Number(fields.get(k))),
      )
      latest = { sheets, oversize }
      const displayed = sheets
        .map(
          (sheet, i) => `<section class="sheet"><h3>Plancha ${i + 1} · ${esc(sheet.stock)}</h3>
        <div class="sheet-layout" style="aspect-ratio:${width}/${height};max-height:470px;max-width:${(470 * width) / height}px" aria-hidden="true">
        ${sheet.pieces.map((p, j) => `<div class="sheet-part" style="left:${(p.x / width) * 100}%;top:${(p.y / height) * 100}%;width:${(p.w / width) * 100}%;height:${(p.h / height) * 100}%">${j + 1}</div>`).join('')}</div>
        ${table(sheet.pieces)}</section>`,
        )
        .join('')
      out.innerHTML =
        displayed +
          (oversize.length
            ? '<p class="danger">Piezas que exceden el tamaño de la plancha</p>' + table(oversize)
            : '') ||
        '<p class="empty">Inserta un gabinete o marca un sólido rectangular como tablero en el Inspector.</p>'
      csv.disabled = !sheets.length && !oversize.length
    } catch (error) {
      out.textContent = error.message
    }
  }
  form.onsubmit = (e) => {
    e.preventDefault()
    calculate()
  }
  csv.onclick = () => {
    if (!latest) return
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"'
    const line = (label, p) =>
      [
        label,
        q(/^[=+\-@\t\r\n]/.test(p.name.trimStart()) ? "'" + p.name : p.name),
        q(p.stock),
        p.w.toFixed(2),
        p.h.toFixed(2),
      ].join(',')
    const rows = latest.sheets.flatMap((s, i) => s.pieces.map((p) => line(i + 1, p)))
    rows.push(...latest.oversize.map((p) => line('Fuera de medida', p)))
    download(
      ['Plancha,Pieza,Material,Ancho mm,Largo mm', ...rows].join('\n'),
      'arquitec-cortes.csv',
      'text/csv;charset=utf-8',
    )
  }
  calculate()
}
function table(pieces) {
  return (
    '<table class="cuts-table"><thead><tr><th scope="col">#</th><th scope="col">Pieza</th><th scope="col">Ancho × largo</th></tr></thead><tbody>' +
    pieces
      .map(
        (p, i) =>
          `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${format(p.w)} × ${format(p.h)} mm</td></tr>`,
      )
      .join('') +
    '</tbody></table>'
  )
}

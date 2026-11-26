const KEY = 'last-project'
let connection

function database() {
  if (!connection) {
    connection = new Promise((resolve, reject) => {
      const req = indexedDB.open('arquitec', 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore('projects', { keyPath: 'id' })
        req.result.createObjectStore('settings')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).catch((error) => {
      connection = undefined
      throw error
    })
  }
  return connection
}

async function operate(names, mode, run) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const txn = db.transaction(names, mode)
    const req = run(txn)
    txn.oncomplete = () => resolve(req?.result)
    txn.onabort = () => reject(txn.error || new Error('La operación se canceló.'))
    txn.onerror = () => reject(txn.error)
  })
}

export const list = () => operate(['projects'], 'readonly', (t) => t.objectStore('projects').getAll())
export const active = () => operate(['settings'], 'readonly', (t) => t.objectStore('settings').get(KEY))
export const remove = (id) =>
  operate(['projects'], 'readwrite', (t) => t.objectStore('projects').delete(id))
export const markActive = (id) =>
  operate(['settings'], 'readwrite', (t) => t.objectStore('settings').put(id, KEY))

export async function save(project, expected) {
  let conflict = false
  try {
    await operate(['projects', 'settings'], 'readwrite', (t) => {
      const projects = t.objectStore('projects')
      const request = projects.get(project.id)
      request.onsuccess = () => {
        const stored = request.result
        if (Boolean(stored) !== expected.exists || (stored?.revision ?? null) !== expected.revision) {
          conflict = true
          t.abort()
          return
        }
        projects.put(project)
        t.objectStore('settings').put(project.id, KEY)
      }
    })
  } catch (error) {
    if (conflict)
      throw new Error(
        'El proyecto cambió en otra pestaña. Exporta un respaldo y vuelve a abrirlo desde Proyectos.',
      )
    throw error
  }
}

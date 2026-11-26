export function registerUpdates(flush, announce) {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  let updatePending = false
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    if (!updatePending || reloading) return
    reloading = true
    if (await flush()) location.reload()
    else announce('Hay una actualización disponible. Exporta un respaldo antes de recargar.')
  })
  navigator.serviceWorker
    .register(new URL('./sw.js', document.baseURI), { updateViaCache: 'none' })
    .then((reg) => {
      async function apply() {
        if (!reg.waiting || !navigator.serviceWorker.controller || updatePending) return
        if (!(await flush())) return
        updatePending = true
        reg.waiting?.postMessage('ACTIVATE')
      }
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', () => {
          if (reg.waiting) void apply()
        })
      })
      function check() {
        void reg
          .update()
          .then(apply)
          .catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check()
      })
      window.addEventListener('online', check)
      check()
    })
    .catch(() => {})
}

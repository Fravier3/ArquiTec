export function setupInput() {
  // OrbitControls owns gestures on the canvas. Keep Safari page scaling out of the editor.
  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => event.preventDefault(), {
      passive: false,
    })
  }
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) event.preventDefault()
    },
    { passive: false },
  )
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault()
    },
    { passive: false },
  )
  const editable = (target) => target.closest('input:not([type=checkbox]):not([type=file]),textarea')
  document.addEventListener('pointerdown', (event) => {
    const field = editable(event.target)
    if (field && event.pointerType === 'pen') {
      event.preventDefault()
      field.focus({ preventScroll: true })
      navigator.virtualKeyboard?.show?.()
    }
  })
  document.addEventListener('pointerup', (event) => {
    const field = editable(event.target)
    if (field && event.pointerType === 'pen') {
      event.preventDefault()
      field.focus({ preventScroll: true })
      navigator.virtualKeyboard?.show?.()
    }
  })
  // This also supports dynamic fields inside dialogs and the inspector.
  function prepare(root) {
    root.querySelectorAll('input:not([type=checkbox]):not([type=file]),textarea').forEach((field) => {
      if (!field.hasAttribute('inputmode'))
        field.setAttribute('inputmode', field.type === 'number' ? 'decimal' : 'text')
      field.setAttribute('enterkeyhint', 'done')
    })
  }
  prepare(document)
  new MutationObserver((records) =>
    records.forEach((record) =>
      record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          prepare(node.parentElement || node)
        }
      }),
    ),
  ).observe(document.getElementById('app'), { childList: true, subtree: true })
  if (window.visualViewport) {
    const resize = () => {
      const viewport = window.visualViewport
      document.documentElement.style.setProperty('--visible-height', viewport.height + 'px')
    }
    window.visualViewport.addEventListener('resize', resize)
    resize()
  }
}

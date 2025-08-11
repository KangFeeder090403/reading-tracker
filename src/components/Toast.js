let container

export function ensureToastContainer() {
  if (!container) {
    container = document.createElement('div')
    container.className = 'fixed top-4 right-4 z-[200] space-y-2'
    document.body.appendChild(container)
  }
}

export function showToast(message, type = 'info') {
  ensureToastContainer()
  const el = document.createElement('div')
  const base = 'px-4 py-2 rounded-md shadow-frame font-ui text-sm'
  const color = type === 'success' ? 'bg-accent-dullgold/20 text-accent-dullgold' :
                type === 'error'   ? 'bg-base-wine/40 text-red-200' :
                                     'bg-accent-amethyst/20 text-accent-amethyst'
  el.className = `${base} ${color}`
  el.textContent = message
  container.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity 300ms'
    setTimeout(() => el.remove(), 320)
  }, 2500)
}

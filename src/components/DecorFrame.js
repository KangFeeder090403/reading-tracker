export default function DecorFrame(childrenHtml = '') {
  const el = document.createElement('div')
  el.className = 'relative p-4 rounded-xl border border-accent-dullgold/40 shadow-frame'
  el.innerHTML = `
    <div class="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-br from-accent-amethyst/10 to-accent-dullgold/10 blur"></div>
    <div class="relative z-10">${childrenHtml}</div>
  `
  return el
}

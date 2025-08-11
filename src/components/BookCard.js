import { api } from '../utils/http'

export default function BookCard(book, onClick, opts = {}) {
  const {
    id,
    title,
    authors: authorsIn,
    status = 'planned',
    start_date,
    end_date,
    current_page = 0,
    rating
  } = book

  const { selectable = false, selected = false, onSelectToggle } = opts

  const authorsArr = Array.isArray(authorsIn)
    ? authorsIn
    : (authorsIn ? String(authorsIn).split(',').map(s => s.trim()).filter(Boolean) : [])

  const el = document.createElement('div')
  el.className = 'card p-4 group relative hover:bg-base-purple/50 transition-colors'
  el.innerHTML = `
    ${selectable ? '<input type="checkbox" data-select class="absolute top-2 left-2 scale-110">' : ''}
    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
      <button class="btn btn-primary text-xs px-2 py-1" data-act="detail">Detail</button>
      <button class="btn btn-primary text-xs px-2 py-1" data-act="cat">Kategori</button>
      <button class="btn btn-gold text-xs px-2 py-1" data-act="share">Share</button>
    </div>
    <div class="flex gap-4 items-start">
      <div class="w-16 h-24 bg-base-blue/30 rounded-md flex items-center justify-center text-base-light/60">📕</div>
      <div class="flex-1">
        <div class="font-ui text-base-light text-lg mb-1 line-clamp-1">${title}</div>
        <div class="text-sm text-base-light/70 line-clamp-1">${authorsArr.join(', ')}</div>
        <div class="mt-1 flex items-center gap-2 text-xs text-base-light/60">
          <span>Status: <span class="uppercase tracking-wider">${status}</span></span>
          ${typeof rating === 'number' ? `<span>• ⭐ ${rating}/5</span>` : ''}
        </div>
        <div class="mt-1 text-xs text-base-light/60 compact-hidden">${start_date ? `Mulai: ${start_date}` : ''} ${end_date ? `• Selesai: ${end_date}` : ''}</div>
        <div class="mt-2 flex items-center gap-2">
          <button class="btn btn-primary text-xs px-2 py-1" data-dec>−10</button>
          <button class="btn btn-gold text-xs px-2 py-1" data-inc>+10</button>
          <span class="text-xs text-base-light/70">Halaman: <b data-page>${current_page}</b></span>
          <button class="btn btn-primary text-xs ml-auto" data-share>Share</button>
        </div>
      </div>
    </div>
  `

  // Selection
  const sel = el.querySelector('[data-select]')
  if (sel) {
    sel.checked = !!selected
    sel.addEventListener('click', (e) => e.stopPropagation())
    sel.addEventListener('change', (e) => onSelectToggle?.(id, !!e.target.checked))
  }

  // Hover actions
  el.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const act = btn.getAttribute('data-act')
      if (act === 'detail' || act === 'cat') onClick?.(id)
      if (act === 'share') doShare()
    })
  })

  // Click to open detail if outside quick controls
  el.addEventListener('click', (e) => {
    const target = e.target
    if (target.closest('button') || target.closest('[data-select]')) return
    onClick?.(id)
  })

  // Quick update handlers
  const pageEl = el.querySelector('[data-page]')
  el.querySelector('[data-inc]').addEventListener('click', async (e) => {
    e.stopPropagation()
    const newVal = Number(pageEl.textContent || 0) + 10
    pageEl.textContent = newVal
    try { await api.put(`/books/${id}`, { current_page: newVal }) } catch {}
    window.dispatchEvent(new CustomEvent('refresh-books'))
  })
  el.querySelector('[data-dec]').addEventListener('click', async (e) => {
    e.stopPropagation()
    const newVal = Math.max(0, Number(pageEl.textContent || 0) - 10)
    pageEl.textContent = newVal
    try { await api.put(`/books/${id}`, { current_page: newVal }) } catch {}
    window.dispatchEvent(new CustomEvent('refresh-books'))
  })

  // Share card as image
  function doShare() {
    const w = 600, h = 240
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,w,h)
    ctx.strokeStyle = '#ae3ec3'; ctx.lineWidth = 4; ctx.strokeRect(8,8,w-16,h-16)
    ctx.fillStyle = '#e9d5ff'; ctx.font = 'bold 22px Albertus Nova, sans-serif'
    wrapText(ctx, title, 24, 60, w-48, 26)
    ctx.fillStyle = '#cbd5e1'; ctx.font = '16px system-ui, sans-serif'
    wrapText(ctx, authorsArr.join(', '), 24, 100, w-48, 22)
    ctx.fillStyle = '#eab308'; ctx.font = 'bold 18px system-ui, sans-serif'
    ctx.fillText(`Status: ${status.toUpperCase()}${typeof rating==='number' ? '  •  ★ ' + rating + '/5' : ''}`, 24, 150)
    ctx.fillStyle = '#64748b'; ctx.font = '12px system-ui, sans-serif'
    ctx.fillText('Reading Tracker', 24, h-24)
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a'); a.href = url; a.download = `book-${id}.png`; a.click()
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text||'').split(' ')
    let line = ''
    let yy = y
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, yy)
        line = words[n] + ' '
        yy += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, yy)
  }

  return el
}

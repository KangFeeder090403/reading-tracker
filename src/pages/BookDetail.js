import { api } from '../utils/http'
import { getBook } from '../utils/googleBooks'
import { showToast } from '../components/Toast'

export default async function BookDetail({ params }) {
  const id = params.id

  let data
  try {
    const resp = await api.get(`/books/${id}`)
    data = resp.data
  } catch (err) {
    const status = err?.response?.status
    const msg = err?.response?.data?.message || err?.message || 'Gagal memuat buku.'
    showToast(`Gagal memuat detail (${status || 'error'}): ${msg}`, 'error')
    if (status === 404) {
      window.location.hash = '#/'
      return document.createElement('div')
    }
    // Render minimal error card to avoid breaking router
    const wrap = document.createElement('div')
    wrap.className = 'max-w-5xl mx-auto p-4'
    wrap.innerHTML = `<div class="card p-5 text-red-300">Terjadi kesalahan memuat buku: ${msg}</div>`
    return wrap
  }

  // Load categories and book's selected categories
  let allCats = []
  let bookCats = []
  try {
    const [{ data: cats }, { data: bCats }] = await Promise.all([
      api.get('/categories'),
      api.get(`/books/${id}/categories`)
    ])
    allCats = cats
    bookCats = bCats
  } catch {}
  const selectedIds = new Set(bookCats.map(c => String(c.id)))

  // Load sessions and highlights
  let sessions = []
  let highlights = []
  try {
    const [{ data: sess }, { data: high }] = await Promise.all([
      api.get(`/books/${id}/sessions`),
      api.get(`/books/${id}/highlights`)
    ])
    sessions = sess
    highlights = high
  } catch {}

  let google = null
  if (data.google_id) {
    try { google = await getBook(data.google_id) } catch {}
  }

  const vi = google?.volumeInfo
  const title = vi?.title || data.title
  const authors = vi?.authors?.join(', ') || data.authors || '-'
  const pubDate = vi?.publishedDate || ''
  const categories = vi?.categories?.join(', ') || ''
  const description = vi?.description || data.notes || ''
  const ratingGb = vi?.averageRating
  const previewLink = vi?.previewLink

  // Compute cover source:
  const coverMeta = vi?.imageLinks?.extraLarge || vi?.imageLinks?.large || vi?.imageLinks?.thumbnail
  const gbsById = data.google_id ? `https://books.google.com/books/content?id=${encodeURIComponent(data.google_id)}&printsec=frontcover&img=1&zoom=2&source=gbs_api` : ''
  const coverSrc = data.cover_url || data.thumbnail || coverMeta || gbsById || ''

  const container = document.createElement('div')
  container.className = 'max-w-7xl mx-auto px-4 md:px-6 space-y-4'
  container.innerHTML = `
    <div class="sticky top-0 z-20 pt-2 pb-2 -mx-4 md:-mx-6 px-4 md:px-6 bg-[var(--rt-bg)]/80 backdrop-blur border-b border-base-blue/20">
      <nav class="text-xs text-base-light/70 flex items-center gap-2">
        <a href="#/" class="btn btn-primary">← Back</a>
        <span>/</span>
        <span>Book</span>
        <span>/</span>
        <span class="line-clamp-1 max-w-[50vw]">${title}</span>
      </nav>
    </div>

    <div class="relative overflow-hidden rounded-lg border border-base-blue/30">
      <div class="absolute inset-0 bg-gradient-to-r from-[#140b1d] via-transparent to-[#1a1026] opacity-80"></div>
      <div class="relative p-5 md:p-7 flex flex-col md:flex-row gap-6">
        <div class="relative w-40 md:w-56 aspect-[2/3] rounded shadow-frame bg-base-blue/30 overflow-hidden skeleton">
          <img data-cover alt="${(title||'Sampul').replace(/"/g,'&quot;')}" class="w-full h-full object-cover opacity-0 transition-opacity duration-300 blur-up" ${coverSrc ? `src="${coverSrc}"` : ''} loading="lazy"/>
          <div data-fallback class="absolute inset-0 grid place-items-center text-base-light/50">📕</div>
        </div>
        <div class="flex-1">
          <h1 class="font-ui text-3xl md:text-4xl text-accent-dullgold">${title}</h1>
          <p class="text-base-light/80">${authors}</p>
          <div class="mt-2 text-sm text-base-light/70 flex flex-wrap gap-3">
            ${pubDate ? `<span>Terbit: ${pubDate}</span>` : ''}
            ${categories ? `<span>Kategori: ${categories}</span>` : ''}
            ${ratingGb ? `<span>Rating (GB): ${ratingGb}★</span>` : ''}
            ${previewLink ? `<a href="${previewLink}" target="_blank" class="text-accent-amethyst underline">Preview</a>` : ''}
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div>
              <div class="label">Status</div>
              <select id="status" class="input w-full">
                ${['planned','reading','completed','on-hold','dropped'].map(s => `<option ${data.status===s?'selected':''} value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="label">Tanggal Mulai</div>
              <input id="start_date" type="date" class="input w-full" value="${data.start_date || ''}"/>
            </div>
            <div>
              <div class="label">Tanggal Selesai</div>
              <input id="end_date" type="date" class="input w-full" value="${data.end_date || ''}"/>
            </div>
            <div>
              <div class="label">Halaman Saat Ini</div>
              <input id="current_page" type="number" min="0" class="input w-full" value="${data.current_page ?? 0}"/>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div>
              <div class="label">Total Halaman</div>
              <input id="total_pages" type="number" min="0" class="input w-full" value="${data.total_pages ?? ''}"/>
            </div>
            <div>
              <div class="label">Rating (1-5)</div>
              <select id="rating" class="input w-full">
                <option value="">-</option>
                ${[1,2,3,4,5].map(n => `<option value="${n}" ${Number(data.rating)===n?'selected':''}>${n}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="label">Shelf</div>
              <select id="shelf" class="input w-full">
                ${['','Favorites','Reread','DNF','Wishlist'].map(n => `<option value="${n}" ${String(data.shelf||'')===n?'selected':''}>${n||'-'}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="label">Series Index</div>
              <input id="series_index" type="number" min="0" class="input w-full" value="${data.series_index ?? ''}"/>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <div class="label">Tags (pisahkan dengan koma)</div>
              <input id="tags" class="input w-full" value="${data.tags || ''}" placeholder="fantasy, gothic"/>
            </div>
            <div>
              <div class="label">Series</div>
              <input id="series" class="input w-full" value="${data.series || ''}" placeholder="Contoh: The Witcher"/>
            </div>
          </div>

          <div class="mt-3">
            <div class="label">Catatan</div>
            <textarea id="notes" class="input w-full min-h-[100px]">${data.notes || ''}</textarea>
          </div>

          <div class="mt-3">
            <div class="label">Ulasan</div>
            <textarea id="review" class="input w-full min-h-[100px]" placeholder="Tulis ulasan singkat...">${data.review || ''}</textarea>
          </div>

          <div class="mt-3">
            <div class="label">Kategori Buku</div>
            ${allCats.length ? `
              <select id="categoriesSelect" multiple class="input w-full h-28">
                ${allCats.map(c => `<option value="${c.id}" ${selectedIds.has(String(c.id)) ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
              <div class="text-xs text-base-light/60 mt-1">Gunakan Ctrl/Command untuk memilih lebih dari satu.</div>
            ` : '<div class="text-base-light/60 text-sm">Belum ada kategori. Tambahkan kategori di Dashboard.</div>'}
          </div>
        </div>
      </div>

      <hr class="decor"/>
      <div class="relative p-5 md:p-7">
        <div class="prose prose-invert max-w-none text-base-light/90">${description}</div>

        <div class="mt-6">
          <h3 class="font-ui text-lg mb-2">Sesi Membaca</h3>
          <div class="flex gap-2">
            <button id="startSession" class="btn btn-primary">Mulai Sesi</button>
            <button id="stopSession" class="btn btn-gold">Selesai Sesi</button>
          </div>
          <ul id="sessionList" class="mt-3 text-sm space-y-1"></ul>
        </div>

        <div class="mt-6">
          <h3 class="font-ui text-lg mb-2">Highlight</h3>
          <div class="grid md:grid-cols-6 gap-2">
            <input id="hl_page" type="number" min="0" class="input md:col-span-1" placeholder="Hal."/>
            <textarea id="hl_text" class="input md:col-span-4 min-h-[80px]" placeholder="Teks highlight..."></textarea>
            <button id="addHighlight" class="btn btn-primary md:col-span-1">Tambah</button>
          </div>
          <div id="hl_list" class="mt-3 space-y-2"></div>
        </div>
      </div>

      <div class="sticky bottom-3 px-5 pb-5 md:px-7">
        <div class="backdrop-blur bg-black/30 border border-base-blue/30 rounded-md p-3 flex gap-2 justify-end">
          <button id="cancel" class="btn">Batal</button>
          <button id="save" class="btn btn-gold">Simpan</button>
          <button id="delete" class="btn btn-primary">Hapus</button>
        </div>
      </div>
    </div>
  `

  // Fade-in cover and handle fallback
  const imgEl = container.querySelector('[data-cover]')
  const fb = container.querySelector('[data-fallback]')
  const coverWrap = container.querySelector('.skeleton')
  if (imgEl) {
    const onLoad = () => { imgEl.classList.remove('opacity-0'); imgEl.classList.add('loaded'); fb?.classList.add('hidden'); coverWrap?.classList.remove('skeleton') }
    const onError = () => { imgEl.classList.add('hidden'); fb?.classList.remove('hidden'); coverWrap?.classList.remove('skeleton') }
    if (imgEl.getAttribute('src')) {
      imgEl.addEventListener('load', onLoad)
      imgEl.addEventListener('error', onError)
      if (imgEl.decode) imgEl.decode().catch(()=>{})
    } else if (gbsById) {
      imgEl.setAttribute('src', gbsById)
      imgEl.addEventListener('load', onLoad)
      imgEl.addEventListener('error', onError)
      if (imgEl.decode) imgEl.decode().catch(()=>{})
    }
  }

  function fmtDuration(sec) {
    if (!sec || sec <= 0) return '-'
    const h = Math.floor(sec/3600)
    const m = Math.floor((sec%3600)/60)
    const s = sec%60
    return [h?`${h}j`:null, m?`${m}m`:null, (!h && !m)?`${s}d`:null].filter(Boolean).join(' ')
  }

  function renderSessions() {
    const ul = container.querySelector('#sessionList')
    if (!sessions.length) { ul.innerHTML = '<li class="text-base-light/60">Belum ada sesi.</li>'; return }
    ul.innerHTML = sessions.map(s => {
      const start = new Date(s.start_ts).toLocaleString()
      const end = s.end_ts ? new Date(s.end_ts).toLocaleString() : '—'
      return `<li>• ${start} → ${end} (${fmtDuration(s.duration_sec)})</li>`
    }).join('')
  }

  function renderHighlights() {
    const wrap = container.querySelector('#hl_list')
    if (!highlights.length) { wrap.innerHTML = '<div class="text-base-light/60 text-sm">Belum ada highlight.</div>'; return }
    wrap.innerHTML = ''
    highlights.forEach(h => {
      const row = document.createElement('div')
      row.className = 'p-3 border border-base-blue/30 rounded-md bg-base-dark/40'
      row.innerHTML = `
        <div class="text-xs text-base-light/60 mb-1">Hal ${h.page ?? '-'} • ${new Date(h.created_at).toLocaleString()}</div>
        <div class="text-sm">${h.text}</div>
        <div class="mt-2 text-right"><button class="btn btn-primary text-xs" data-del="${h.id}">Hapus</button></div>
      `
      row.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('Hapus highlight ini?')) return
        await api.delete(`/highlights/${h.id}`)
        highlights = highlights.filter(x => x.id !== h.id)
        renderHighlights()
      })
      wrap.appendChild(row)
    })
  }

  // Initial render for sessions & highlights
  renderSessions()
  renderHighlights()

  container.querySelector('#startSession').addEventListener('click', async () => {
    try {
      await api.post(`/books/${id}/sessions/start`)
      const { data: sess } = await api.get(`/books/${id}/sessions`)
      sessions = sess
      renderSessions()
      showToast('Sesi dimulai.', 'success')
    } catch (e) { showToast('Gagal mulai sesi.', 'error') }
  })
  container.querySelector('#stopSession').addEventListener('click', async () => {
    try {
      await api.post(`/books/${id}/sessions/stop`)
      const { data: sess } = await api.get(`/books/${id}/sessions`)
      sessions = sess
      renderSessions()
      showToast('Sesi diselesaikan.', 'success')
    } catch (e) { showToast('Tidak ada sesi aktif.', 'error') }
  })

  container.querySelector('#addHighlight').addEventListener('click', async () => {
    const page = Number(container.querySelector('#hl_page').value || 0)
    const text = container.querySelector('#hl_text').value.trim()
    if (!text) return
    try {
      await api.post(`/books/${id}/highlights`, { page, text })
      container.querySelector('#hl_text').value = ''
      const { data: high } = await api.get(`/books/${id}/highlights`)
      highlights = high
      renderHighlights()
      showToast('Highlight ditambahkan.', 'success')
    } catch { showToast('Gagal menambah highlight.', 'error') }
  })

  container.querySelector('#save').addEventListener('click', async () => {
    const payload = {
      status: container.querySelector('#status').value,
      start_date: container.querySelector('#start_date').value || null,
      end_date: container.querySelector('#end_date').value || null,
      notes: container.querySelector('#notes').value,
      current_page: Number(container.querySelector('#current_page')?.value || 0),
      total_pages: container.querySelector('#total_pages').value ? Number(container.querySelector('#total_pages').value) : null,
      rating: container.querySelector('#rating').value ? Number(container.querySelector('#rating').value) : null,
      review: container.querySelector('#review').value,
      shelf: container.querySelector('#shelf').value || null,
      tags: container.querySelector('#tags').value || null,
      series: container.querySelector('#series').value || null,
      series_index: container.querySelector('#series_index').value ? Number(container.querySelector('#series_index').value) : null,
    }
    try {
      await api.put(`/books/${id}`, payload)
      const sel = container.querySelector('#categoriesSelect')
      if (sel) {
        const categoryIds = Array.from(sel.selectedOptions).map(o => Number(o.value))
        await api.put(`/books/${id}/categories`, { categoryIds })
      }
      showToast('Perubahan tersimpan.', 'success')
      window.location.hash = '#/'
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan.'
      showToast(`Gagal menyimpan: ${msg}`, 'error')
    }
  })

  // Cancel and Delete handlers
  const cancelBtn = container.querySelector('#cancel')
  if (cancelBtn) cancelBtn.addEventListener('click', () => { window.location.hash = '#/' })

  const delBtn = container.querySelector('#delete')
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm('Hapus buku ini?')) return
    try {
      await api.delete(`/books/${id}`)
      showToast('Buku dihapus.', 'success')
      window.location.hash = '#/'
    } catch {
      showToast('Gagal menghapus buku.', 'error')
    }
  })

  return container
}

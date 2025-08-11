import { searchBooks } from '../utils/googleBooks'
import { api } from '../utils/http'
import { isLoggedIn } from '../utils/auth'

export default function AddBookModal() {
  const wrapper = document.createElement('div')
  wrapper.className = 'fixed inset-0 hidden items-center justify-center z-[100]'
  wrapper.innerHTML = `
    <div class="absolute inset-0 bg-black/70"></div>
    <div class="relative card w-[min(900px,95vw)] p-6 max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="title-vamp">Tambah Buku</h2>
        <button id="close-modal" class="btn btn-primary">Tutup</button>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="label">Cari di Google Books</label>
          <div class="flex gap-2 mt-1">
            <input id="q" class="input flex-1" placeholder="cari judul/penulis..."/>
            <button id="search" class="btn btn-primary">Cari</button>
          </div>
          <div id="results" class="mt-3 space-y-2"></div>
        </div>
        <div>
          <label class="label">Atau input manual</label>
          <div class="mt-1 space-y-2">
            <input id="title" class="input w-full" placeholder="Judul"/>
            <input id="authors" class="input w-full" placeholder="Penulis (pisahkan dengan koma)"/>
            <div class="grid grid-cols-2 gap-2">
              <input id="start_date" type="date" class="input"/>
              <input id="end_date" type="date" class="input"/>
            </div>
            <select id="status" class="input w-full">
              <option value="planned">Planned</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="dropped">Dropped</option>
            </select>
            <textarea id="notes" class="input w-full min-h-[100px]" placeholder="Catatan"></textarea>
            <button id="save-manual" class="btn btn-gold w-full">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  `

  const resultsEl = wrapper.querySelector('#results')
  wrapper.querySelector('#close-modal').addEventListener('click', () => hide())
  wrapper.querySelector('#search').addEventListener('click', async () => {
    if (!isLoggedIn()) { location.hash = '#/login'; return }
    const q = wrapper.querySelector('#q').value.trim()
    if (!q) return
    resultsEl.innerHTML = '<div class="text-base-light/70">Mencari...</div>'
    try {
      const items = await searchBooks(q)
      if (!items.length) {
        resultsEl.innerHTML = '<div class="text-base-light/60">Tidak ada hasil</div>'
        return
      }
      resultsEl.innerHTML = ''
      items.forEach(item => {
        const title = item.volumeInfo?.title || 'Tanpa Judul'
        const authors = item.volumeInfo?.authors || []
        const btn = document.createElement('button')
        btn.className = 'btn btn-primary w-full text-left'
        btn.innerHTML = `<div class="font-ui">${title}</div><div class="text-xs opacity-70">${authors.join(', ')}</div>`
        btn.addEventListener('click', async () => {
          await api.post('/books', {
            google_id: item.id,
            title,
            authors: authors.join(', '),
            status: 'planned'
          })
          hide()
          window.dispatchEvent(new CustomEvent('refresh-books'))
        })
        resultsEl.appendChild(btn)
      })
    } catch (e) {
      resultsEl.innerHTML = '<div class="text-red-300">Gagal mencari</div>'
    }
  })

  wrapper.querySelector('#save-manual').addEventListener('click', async () => {
    if (!isLoggedIn()) { location.hash = '#/login'; return }
    const payload = {
      title: wrapper.querySelector('#title').value,
      authors: wrapper.querySelector('#authors').value,
      start_date: wrapper.querySelector('#start_date').value || null,
      end_date: wrapper.querySelector('#end_date').value || null,
      status: wrapper.querySelector('#status').value,
      notes: wrapper.querySelector('#notes').value,
    }
    await api.post('/books', payload)
    hide()
    window.dispatchEvent(new CustomEvent('refresh-books'))
  })

  function show() { wrapper.classList.remove('hidden'); wrapper.classList.add('flex') }
  function hide() { wrapper.classList.add('hidden'); wrapper.classList.remove('flex') }

  window.addEventListener('open-add-modal', show)
  document.body.appendChild(wrapper)
  return { show, hide, el: wrapper }
}

import BookCard from '../components/BookCard'
import AddBookModal from '../components/AddBookModal'
import { api } from '../utils/http'
import { getStats } from '../utils/stats'
import { isLoggedIn } from '../utils/auth'
import { searchBooks } from '../utils/googleBooks'

export default async function Dashboard() {
  const container = document.createElement('div')
  container.className = 'max-w-7xl mx-auto px-4 md:px-6 space-y-6'

  container.innerHTML = `
    <header class="mt-4">
      <h1 class="title-vamp">Dashboard</h1>
      <p class="text-base-light/70 font-ui mt-1">Pantau progres membaca, kelola kategori, dan temukan rekomendasi.</p>
      <hr class="decor"/>
      <div class="grid md:grid-cols-4 gap-3" id="stats"></div>
    </header>

    <section class="card p-4">
      <h2 class="font-ui text-lg mb-2">Statistik Koleksi</h2>
      <div class="h-[220px]">
        <canvas id="chart"></canvas>
      </div>
    </section>

    <section class="card p-4">
      <h2 class="font-ui text-lg mb-1">Timeline Membaca</h2>
      <p class="text-xs text-base-light/60 mb-2">Semakin panjang bar, semakin lama durasinya.</p>
      <div class="flex flex-wrap items-center gap-2 mb-3" id="tl_controls">
        <label class="text-xs text-base-light/80 flex items-center gap-1">
          <input id="tl_only_completed" type="checkbox" class="accent-[#ae3ec3]">
          Hanya "completed"
        </label>
        <select id="tl_sort" class="input w-44 text-xs">
          <option value="desc">Durasi: Terlama dulu</option>
          <option value="asc">Durasi: Tercepat dulu</option>
          <option value="title">Judul: A → Z</option>
        </select>
        <label class="text-xs text-base-light/80 flex items-center gap-1">
          <input id="tl_stacked" type="checkbox" class="accent-[#ae3ec3]">
          Stacked by status
        </label>
      </div>
      <div>
        <canvas id="timelineChart"></canvas>
      </div>
    </section>

    <section class="card p-4">
      <div class="grid md:grid-cols-3 gap-3">
        <div class="md:col-span-2 flex flex-wrap md:flex-row md:items-center gap-3">
          <input id="filter" class="input flex-1" placeholder="Filter judul atau penulis..." />
          <select id="status" class="input w-full md:w-52">
            <option value="">Semua Status</option>
            <option value="planned">Planned</option>
            <option value="reading">Reading</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="dropped">Dropped</option>
          </select>
          <select id="ratingMin" class="input w-full md:w-40">
            <option value="">Rating: Semua</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </select>
          <select id="category" class="input w-full md:w-52">
            <option value="">Semua Kategori</option>
          </select>
          <label class="text-xs text-base-light/80 flex items-center gap-1 ml-auto">
            <input id="fuzzy" type="checkbox" class="accent-[#ae3ec3]"> Fuzzy
          </label>
        </div>
        <div>
          <div class="flex gap-2">
            <input id="newCat" class="input flex-1" placeholder="Kategori baru (cth: Vampire Novels)"/>
            <button id="addCat" class="btn btn-primary">Tambah</button>
          </div>
          <div id="catList" class="mt-2 flex flex-wrap gap-2 text-xs"></div>
        </div>
      </div>
    </section>

    <section class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" id="list"></section>

    <section class="card p-4" id="challenge">
      <h2 class="font-ui text-lg mb-2">Reading Challenge</h2>
      <div class="grid md:grid-cols-4 gap-2 items-end">
        <div>
          <label class="label">Target Buku</label>
          <input id="ch_books" type="number" min="0" class="input w-full" value="0" />
        </div>
        <div>
          <label class="label">Target Halaman</label>
          <input id="ch_pages" type="number" min="0" class="input w-full" value="0" />
        </div>
        <div>
          <label class="label">Mulai</label>
          <input id="ch_start" type="date" class="input w-full" />
        </div>
        <div>
          <label class="label">Selesai</label>
          <input id="ch_end" type="date" class="input w-full" />
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button id="saveChallenge" class="btn btn-gold">Simpan Challenge</button>
      </div>
      <div class="mt-3" id="challengeProgress"></div>
    </section>

    <section class="card p-4" id="reco">
      <h2 class="font-ui text-lg mb-2">Rekomendasi Untukmu</h2>
      <div id="recoList" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
    </section>
  `

  if (!isLoggedIn()) {
    container.querySelector('#list').innerHTML = '<div class="text-base-light/70">Silakan login untuk melihat koleksi bukumu.</div>'
    return container
  }

  AddBookModal()

  const listEl = container.querySelector('#list')
  const statsEl = container.querySelector('#stats')
  const categorySelect = container.querySelector('#category')
  const catList = container.querySelector('#catList')

  // Timeline controls
  const tlOnlyCompletedEl = container.querySelector('#tl_only_completed')
  const tlSortEl = container.querySelector('#tl_sort')
  const tlStackedEl = container.querySelector('#tl_stacked')

  // Filters
  const ratingMinEl = container.querySelector('#ratingMin')
  const fuzzyEl = container.querySelector('#fuzzy')

  // Hold Chart.js instances
  let chartInstance = null
  let timelineInstance = null

  // Remember last loaded books for timeline re-render
  let lastBooks = []

  async function loadCategories() {
    const selectedBefore = categorySelect.value
    const { data: cats } = await api.get('/categories')
    categorySelect.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
    // Try to preserve previous selection if still exists
    if (selectedBefore && cats.some(c => String(c.id) === String(selectedBefore))) {
      categorySelect.value = selectedBefore
    }
    // Render list with delete buttons
    catList.innerHTML = cats.map(c => `
      <span class="px-2 py-1 rounded border border-accent-dullgold/40 inline-flex items-center gap-1">
        ${c.name}
        <button class="text-red-300 hover:text-red-400" title="Hapus" data-del-cat="${c.id}">×</button>
      </span>
    `).join('')
    // Wire up deletions
    catList.querySelectorAll('button[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-cat')
        if (!confirm('Hapus kategori ini?')) return
        await api.delete(`/categories/${id}`)
        // If the deleted category was selected in filter, reset filter
        if (categorySelect.value === String(id)) categorySelect.value = ''
        await loadCategories()
        await load()
      })
    })
  }

  container.querySelector('#addCat').addEventListener('click', async () => {
    const name = container.querySelector('#newCat').value.trim()
    if (!name) return
    await api.post('/categories', { name })
    container.querySelector('#newCat').value = ''
    await loadCategories()
  })

  async function load() {
    const params = {}
    const cat = categorySelect.value
    if (cat) params.category_id = cat
    const { data } = await api.get('/books', { params })
    lastBooks = data
    renderList(data)
    await renderStatsCards(data)
    renderChart(data)
    renderTimeline(data)
    renderChallenge(data)
    renderRecommendations()
  }

  function isSubsequence(needle, hay) {
    needle = needle.toLowerCase()
    hay = hay.toLowerCase()
    if (!needle) return true
    let i = 0
    for (let c of hay) {
      if (c === needle[i]) { i++; if (i === needle.length) return true }
    }
    return false
  }
  function isFuzzyMatch(query, text) {
    const tokens = (query || '').toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!tokens.length) return true
    return tokens.every(t => isSubsequence(t, (text||'').toLowerCase()))
  }

  function renderList(items) {
    const q = container.querySelector('#filter').value
    const s = container.querySelector('#status').value
    const ratingMin = Number(ratingMinEl?.value || 0)
    const useFuzzy = !!fuzzyEl?.checked

    const filtered = items.filter(b => {
      const hay = [b.title, b.authors, b.tags, b.series].filter(Boolean).join(' ')
      const hit = useFuzzy ? isFuzzyMatch(q, hay) : hay.toLowerCase().includes((q||'').toLowerCase())
      const statusOk = s ? b.status === s : true
      const ratingOk = ratingMin ? (Number(b.rating||0) >= ratingMin) : true
      return hit && statusOk && ratingOk
    })

    listEl.innerHTML = ''
    if (!filtered.length) {
      listEl.innerHTML = '<div class="text-base-light/60">Belum ada data. Tambahkan buku dengan tombol di kanan atas.</div>'
      return
    }
    filtered.forEach(b => {
      listEl.appendChild(BookCard(b, (id) => {
        window.location.hash = `#/book/${id}`
      }))
    })
  }

  async function renderStatsCards(items) {
    const s = getStats(items)
    const now = new Date()
    const ym = now.toISOString().slice(0,7)
    const pagesThisMonth = items
      .filter(i => i.end_date && String(i.end_date).startsWith(ym) && Number(i.total_pages))
      .reduce((a,b) => a + Number(b.total_pages||0), 0)

    let topCat = '-'
    try { const { data: top } = await api.get('/categories/top'); if (top?.length) topCat = top[0].name } catch {}

    let currentStreak = 0
    let completedSeries = getCompletedPerMonth(items, 6)
    let pagesSeries = getPagesPerMonth(items, 6)
    try {
      const { data: sum } = await api.get('/sessions/summary')
      currentStreak = sum?.currentStreak || sum?.streak || 0
    } catch {}

    statsEl.innerHTML = `
      <div class="card p-4 border-l-4 border-accent-amethyst/70 flex items-center gap-3">
        <div class="text-2xl">✅</div>
        <div class="flex-1">
          <div class="text-xs text-base-light/70 mb-1">Buku Selesai</div>
          <div class="text-2xl font-ui">${s.completed}</div>
          <canvas id="kpi_done" height="28" class="mt-2 w-full"></canvas>
        </div>
      </div>
      <div class="card p-4 border-l-4 border-accent-dullgold/70 flex items-center gap-3">
        <div class="text-2xl">📄</div>
        <div class="flex-1">
          <div class="text-xs text-base-light/70 mb-1">Halaman/Bulan</div>
          <div class="text-2xl font-ui">${pagesThisMonth}</div>
          <canvas id="kpi_pages" height="28" class="mt-2 w-full"></canvas>
        </div>
      </div>
      <div class="card p-4 border-l-4 border-base-blue/70 flex items-center gap-3">
        <div class="text-2xl">🔥</div>
        <div class="flex-1">
          <div class="text-xs text-base-light/70 mb-1">Streak</div>
          <div class="text-2xl font-ui">${currentStreak} hari</div>
        </div>
      </div>
      <div class="card p-4 border-l-4 border-base-dark/70 flex items-center gap-3">
        <div class="text-2xl">🏷️</div>
        <div class="flex-1">
          <div class="text-xs text-base-light/70 mb-1">Kategori Teratas</div>
          <div class="text-2xl font-ui">${topCat}</div>
        </div>
      </div>
    `
    drawSparkline(document.getElementById('kpi_done'), completedSeries, '#ae3ec3')
    drawSparkline(document.getElementById('kpi_pages'), pagesSeries, '#b48905')
  }

  function getCompletedPerMonth(items, n=6) {
    const months = getLastNMonths(n)
    return months.map(ym => items.filter(i => i.status==='completed' && i.end_date && String(i.end_date).startsWith(ym)).length)
  }
  function getPagesPerMonth(items, n=6) {
    const months = getLastNMonths(n)
    return months.map(ym => items
      .filter(i => i.end_date && String(i.end_date).startsWith(ym) && Number(i.total_pages))
      .reduce((a,b)=>a+Number(b.total_pages||0),0))
  }
  function getLastNMonths(n) {
    const out = []
    const d = new Date()
    d.setDate(1)
    for (let i=n-1;i>=0;i--) {
      const dt = new Date(d.getFullYear(), d.getMonth()-i, 1)
      out.push(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`)
    }
    return out
  }
  function drawSparkline(canvas, data, color='#ae3ec3') {
    if (!canvas || !data?.length) return
    const w = canvas.clientWidth || 220
    const h = canvas.height || 28
    canvas.width = w
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,w,h)
    const max = Math.max(1, ...data)
    const step = w / Math.max(1, data.length-1)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = i * step
      const y = h - (v / max) * (h - 4) - 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  async function renderChart(items) {
    const canvas = container.querySelector('#chart')
    const { default: Chart } = await import('chart.js/auto')
    const ctx2d = canvas.getContext('2d')

    canvas.height = 220

    const colors = ['#ae3ec3','#5e2534','#b48905','#273c4b','#232c3a']
    const byStatus = ['planned','reading','completed','on-hold','dropped']
      .map(k => items.filter(i => i.status === k).length)

    const hexToRgb = (hex) => {
      const v = hex.replace('#','')
      return { r: parseInt(v.substring(0,2),16), g: parseInt(v.substring(2,4),16), b: parseInt(v.substring(4,6),16) }
    }
    const makeGrad = (hex) => {
      const {r,g,b} = hexToRgb(hex)
      const grad = ctx2d.createLinearGradient(0,0,0,canvas.height)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`) 
      grad.addColorStop(1, `rgba(${r},${g},${b},0.25)`) 
      return grad
    }
    const bgs = colors.map(makeGrad)

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Planned','Reading','Completed','On Hold','Dropped'],
        datasets: [{
          label: 'Jumlah',
          data: byStatus,
          backgroundColor: bgs,
          borderColor: colors.map(c => c + 'CC'),
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 8 },
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Distribusi Status Buku', color: '#cbd5e1', padding: { bottom: 10 }, font: { family: 'Albertus Nova, ui-sans-serif', size: 14 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y ?? ctx.parsed
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0)
                const pct = total ? Math.round((v/total)*100) : 0
                return ` ${v} buku (${pct}%)`
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(181,194,199,0.12)', drawBorder: false } },
          y: { ticks: { color: '#cbd5e1', precision: 0 }, grid: { color: 'rgba(181,194,199,0.12)', drawBorder: false } }
        },
        animation: { duration: (localStorage.getItem('rt_reduce')==='1' ? 0 : 700), easing: 'easeOutCubic' }
      }
    })
  }

  async function renderTimeline(items) {
    const canvas = container.querySelector('#timelineChart')
    const { default: Chart } = await import('chart.js/auto')
    const ctx2d = canvas.getContext('2d')

    const onlyCompleted = !!tlOnlyCompletedEl?.checked
    let rows = Array.from(items)
    if (onlyCompleted) rows = rows.filter(i => i.status === 'completed' && i.start_date)

    const mapped = rows.map(i => {
      const s = i.start_date ? new Date(i.start_date) : null
      const e = i.end_date ? new Date(i.end_date) : new Date()
      const duration = s ? Math.round(Math.max(0, e - s) / 86400000) : 0
      return { title: i.title, duration, status: i.status }
    })

    const sortVal = tlSortEl?.value || 'desc'
    if (sortVal === 'asc') mapped.sort((a,b) => a.duration - b.duration)
    else if (sortVal === 'title') mapped.sort((a,b) => a.title.localeCompare(b.title))
    else mapped.sort((a,b) => b.duration - a.duration)

    const labels = mapped.map(m => m.title)
    const durations = mapped.map(m => m.duration)

    // Dynamic height
    canvas.height = Math.max(220, labels.length * 26)

    const colors = {
      planned: 'rgba(94,37,52,0.85)',
      reading: 'rgba(174,62,195,0.85)',
      completed: 'rgba(180,137,5,0.85)',
      'on-hold': 'rgba(39,60,75,0.85)',
      dropped: 'rgba(35,44,58,0.85)'
    }

    if (timelineInstance) timelineInstance.destroy()

    const stacked = !!tlStackedEl?.checked

    const datasets = stacked ? ['planned','reading','completed','on-hold','dropped'].map(st => ({
      label: st,
      data: mapped.map(m => m.status === st ? m.duration : 0),
      backgroundColor: colors[st],
      borderColor: 'rgba(181,194,199,0.25)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 12,
      stack: 'tl'
    })) : [{
      label: 'Durasi (hari)',
      data: durations,
      backgroundColor: 'rgba(174,62,195,0.85)',
      borderColor: 'rgba(181,194,199,0.25)',
      borderWidth: 1,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 12
    }]

    timelineInstance = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 8 },
        plugins: {
          legend: { display: stacked },
          title: { display: true, text: 'Timeline Durasi Membaca (hari)', color: '#cbd5e1', padding: { bottom: 10 }, font: { family: 'Albertus Nova, ui-sans-serif', size: 14 } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.x} hari` } }
        },
        scales: {
          x: { stacked: stacked, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(181,194,199,0.12)', drawBorder: false } },
          y: { stacked: stacked, ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(181,194,199,0.06)', drawBorder: false } }
        },
        animation: { duration: (localStorage.getItem('rt_reduce')==='1' ? 0 : 700), easing: 'easeOutCubic' }
      }
    })
  }

  async function renderChallenge(items) {
    // Ambil challenge terbaru
    const { data: challenges } = await api.get('/challenges')
    const box = container.querySelector('#challengeProgress')
    if (!challenges.length) { box.innerHTML = '<div class="text-base-light/70 text-sm">Belum ada challenge. Buat challenge di atas.</div>'; return }
    const c = challenges[0]
    const periodStart = new Date(c.start_date)
    const periodEnd = new Date(c.end_date)
    const inPeriod = items.filter(b => {
      const ed = b.end_date ? new Date(b.end_date) : null
      return ed && ed >= periodStart && ed <= periodEnd
    })
    const booksDone = inPeriod.filter(b => b.status === 'completed').length
    const pagesNow = items.reduce((sum, b) => sum + (b.current_page || 0), 0)
    const booksPct = c.target_books ? Math.min(100, Math.round((booksDone / c.target_books) * 100)) : 0
    const pagesPct = c.target_pages ? Math.min(100, Math.round((pagesNow / c.target_pages) * 100)) : 0

    box.innerHTML = `
      <div class="font-ui text-sm text-base-light/80">Periode: ${c.start_date} → ${c.end_date}</div>
      <div class="mt-2">
        <div class="text-xs">Buku: ${booksDone}/${c.target_books}</div>
        <div class="w-full h-3 bg-base-dark rounded"><div style="width:${booksPct}%" class="h-3 bg-accent-amethyst rounded"></div></div>
      </div>
      <div class="mt-2">
        <div class="text-xs">Halaman: ${pagesNow}/${c.target_pages}</div>
        <div class="w-full h-3 bg-base-dark rounded"><div style="width:${pagesPct}%" class="h-3 bg-accent-dullgold rounded"></div></div>
      </div>
      ${(booksPct >= 80 || pagesPct >= 80) ? '<div class="mt-2 text-accent-dullgold text-sm">Hampir tercapai! Tetap semangat!</div>' : ''}
    `
  }

  async function renderRecommendations() {
    const recoWrap = container.querySelector('#recoList')
    recoWrap.innerHTML = '<div class="text-base-light/70">Memuat rekomendasi...</div>'
    try {
      const { data: top } = await api.get('/categories/top')
      if (!top.length) { recoWrap.innerHTML = '<div class="text-base-light/60">Buat kategori untuk mendapatkan rekomendasi.</div>'; return }
      const queries = top.slice(0, 2).map(t => t.name)
      const results = (await Promise.all(queries.map(q => searchBooks(q)))).flat()
      recoWrap.innerHTML = ''
      results.slice(0, 6).forEach(item => {
        const title = item.volumeInfo?.title || 'Tanpa Judul'
        const authors = item.volumeInfo?.authors || []
        const card = document.createElement('div')
        card.className = 'card p-4'
        card.innerHTML = `
          <div class="font-ui mb-1">${title}</div>
          <div class="text-xs text-base-light/70 mb-2">${authors.join(', ')}</div>
          <button class="btn btn-primary">Tambahkan</button>
        `
        card.querySelector('button').addEventListener('click', async () => {
          await api.post('/books', {
            google_id: item.id,
            title,
            authors: authors.join(', '),
            status: 'planned'
          })
          window.dispatchEvent(new CustomEvent('refresh-books'))
        })
        recoWrap.appendChild(card)
      })
    } catch {
      recoWrap.innerHTML = '<div class="text-red-300">Gagal memuat rekomendasi.</div>'
    }
  }

  // Filters and events
  container.querySelector('#filter').addEventListener('input', load)
  container.querySelector('#status').addEventListener('change', load)
  categorySelect.addEventListener('change', load)
  ratingMinEl?.addEventListener('change', load)
  fuzzyEl?.addEventListener('change', load)
  tlOnlyCompletedEl?.addEventListener('change', () => renderTimeline(lastBooks))
  tlSortEl?.addEventListener('change', () => renderTimeline(lastBooks))
  tlStackedEl?.addEventListener('change', () => renderTimeline(lastBooks))

  container.querySelector('#saveChallenge').addEventListener('click', async () => {
    const payload = {
      target_books: Number(container.querySelector('#ch_books').value||0),
      target_pages: Number(container.querySelector('#ch_pages').value||0),
      start_date: container.querySelector('#ch_start').value,
      end_date: container.querySelector('#ch_end').value,
    }
    if (!payload.start_date || !payload.end_date) return
    await api.post('/challenges', payload)
    await load()
  })
  window.addEventListener('refresh-books', load)

  await loadCategories()
  await load()
  return container
}

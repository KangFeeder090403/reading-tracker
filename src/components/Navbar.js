export function mountNavbar() {
  const el = document.createElement('div')
  el.innerHTML = `
    <a href="#app" class="skip-link">Skip to content</a>
    <nav class="sticky top-0 z-50 bg-base-dark/80 backdrop-blur border-b border-accent-dullgold/30" role="navigation" aria-label="Primary">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#/" class="flex items-center gap-3" aria-label="Beranda">
          <span class="title-vamp">Lectio</span>
          <span class="hidden md:block text-base-light/70 font-ui">Reading Tracker</span>
        </a>
        <div class="flex items-center gap-2" id="nav-actions">
          <button id="font-dec-nav" class="btn btn-primary compact-hidden" title="Kecilkan font" aria-label="Kecilkan font">A-</button>
          <button id="font-inc-nav" class="btn btn-primary compact-hidden" title="Besarkan font" aria-label="Besarkan font">A+</button>
          <a href="#/" class="btn btn-primary">Dashboard</a>
          <button id="open-add" class="btn btn-gold hidden">Tambah Buku</button>
          <button id="open-settings" class="btn btn-primary">Pengaturan</button>
          <a href="#/login" class="btn btn-primary" id="login-btn">Login</a>
          <button class="btn btn-primary hidden" id="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
  `
  document.body.prepend(el)

  function applyFont(px) { document.documentElement.style.setProperty('--rt-font-base', `${px}px`) }
  function adjustFont(delta) {
    const cur = Number(localStorage.getItem('rt_font') || '16')
    const next = Math.min(20, Math.max(14, cur + delta))
    localStorage.setItem('rt_font', String(next))
    applyFont(next)
  }

  function syncAuth() {
    const token = localStorage.getItem('rt_token')
    el.querySelector('#open-add').classList.toggle('hidden', !token)
    el.querySelector('#logout-btn').classList.toggle('hidden', !token)
    el.querySelector('#login-btn').classList.toggle('hidden', !!token)
  }
  syncAuth()

  document.addEventListener('click', (e) => {
    const add = e.target.closest('#open-add')
    if (add) window.dispatchEvent(new CustomEvent('open-add-modal'))
    const settings = e.target.closest('#open-settings')
    if (settings) document.dispatchEvent(new Event('open-settings'))
    const logout = e.target.closest('#logout-btn')
    if (logout) {
      localStorage.removeItem('rt_token')
      syncAuth()
      location.hash = '#/login'
      import('./Toast').then(({ showToast }) => showToast('Berhasil logout.', 'success'))
    }
    const dec = e.target.closest('#font-dec-nav')
    if (dec) adjustFont(-1)
    const inc = e.target.closest('#font-inc-nav')
    if (inc) adjustFont(1)
  })

  window.addEventListener('auth-changed', syncAuth)
}

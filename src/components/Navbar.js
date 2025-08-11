export function mountNavbar() {
  const el = document.createElement('div')
  el.innerHTML = `
    <nav class="sticky top-0 z-50 bg-base-dark/80 backdrop-blur border-b border-accent-dullgold/30">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="#/" class="flex items-center gap-3">
          <span class="title-vamp">Lectio</span>
          <span class="hidden md:block text-base-light/70 font-ui">Reading Tracker</span>
        </a>
        <div class="flex items-center gap-2" id="nav-actions">
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
  })

  window.addEventListener('auth-changed', syncAuth)
}

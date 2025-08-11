export default function SettingsModal() {
  const wrapper = document.createElement('div')
  wrapper.className = 'fixed inset-0 hidden items-center justify-center z-[150]'
  wrapper.innerHTML = `
    <div class="absolute inset-0 bg-black/70"></div>
    <div class="relative card w-[min(560px,95vw)] p-6">
      <h2 class="title-vamp mb-4">Pengaturan</h2>
      <div class="grid gap-4">
        <label class="label flex items-center gap-3">
          <input id="anim" type="checkbox" class="accent-accent-dullgold"/>
          Aktifkan efek animasi (fog/transisi)
        </label>

        <div>
          <div class="label mb-1">Tema</div>
          <div class="flex items-center gap-3 mb-2">
            <button data-theme="dark" class="w-8 h-8 rounded bg-[#0b1220] border border-white/10" title="Gelap"></button>
            <button data-theme="light" class="w-8 h-8 rounded bg-white border border-black/10" title="Terang"></button>
            <button data-theme="sepia" class="w-8 h-8 rounded" style="background:#1a1410;border:1px solid #d6b35e55" title="Sepia"></button>
            <button data-theme="hc" class="w-8 h-8 rounded bg-black border-2 border-yellow-400" title="High Contrast"></button>
          </div>
          <select id="theme" class="input w-full">
            <option value="dark">Gelap (default)</option>
            <option value="light">Terang</option>
            <option value="sepia">Sepia (malam)</option>
            <option value="hc">High Contrast</option>
          </select>
        </div>

        <div>
          <div class="label mb-1">Ukuran Font</div>
          <input id="fontSize" type="range" min="14" max="20" step="1" class="w-full"/>
          <div id="fontPreview" class="mt-2 p-2 rounded bg-base-dark/40 text-sm">Contoh teks: The quick brown fox jumps over the lazy vampire.</div>
          <div class="text-xs text-base-light/60 mt-1">Ukuran dasar UI</div>
        </div>

        <label class="label flex items-center gap-3">
          <input id="reduceMotion" type="checkbox" class="accent-accent-dullgold"/>
          Reduce motion (minim animasi)
        </label>
      </div>
      <div class="mt-4 text-right">
        <button id="close" class="btn btn-primary">Tutup</button>
      </div>
    </div>
  `
  const anim = wrapper.querySelector('#anim')
  const themeSel = wrapper.querySelector('#theme')
  const fontRange = wrapper.querySelector('#fontSize')
  const reduceMotion = wrapper.querySelector('#reduceMotion')
  const fontPreview = wrapper.querySelector('#fontPreview')

  // Load from storage
  anim.checked = (localStorage.getItem('rt_anim') ?? '1') === '1'
  themeSel.value = localStorage.getItem('rt_theme') || 'dark'
  fontRange.value = localStorage.getItem('rt_font') || '16'
  reduceMotion.checked = (localStorage.getItem('rt_reduce') ?? '0') === '1'

  // Apply current settings
  applyTheme(themeSel.value)
  applyFont(fontRange.value)
  fontPreview.style.fontSize = `${fontRange.value}px`

  anim.addEventListener('change', () => {
    localStorage.setItem('rt_anim', anim.checked ? '1' : '0')
  })
  themeSel.addEventListener('change', () => {
    localStorage.setItem('rt_theme', themeSel.value)
    applyTheme(themeSel.value)
  })
  fontRange.addEventListener('input', () => {
    localStorage.setItem('rt_font', fontRange.value)
    applyFont(fontRange.value)
    fontPreview.style.fontSize = `${fontRange.value}px`
  })
  reduceMotion.addEventListener('change', () => {
    localStorage.setItem('rt_reduce', reduceMotion.checked ? '1' : '0')
  })

  // Theme swatch handlers
  wrapper.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-theme')
      themeSel.value = mode
      localStorage.setItem('rt_theme', mode)
      applyTheme(mode)
    })
  })

  wrapper.querySelector('#close').addEventListener('click', hide)

  function show() { wrapper.classList.remove('hidden'); wrapper.classList.add('flex') }
  function hide() { wrapper.classList.add('hidden'); wrapper.classList.remove('flex') }

  function applyTheme(mode) {
    const root = document.documentElement
    root.classList.remove('theme-light','theme-hc','theme-sepia')
    if (mode === 'light') root.classList.add('theme-light')
    else if (mode === 'hc') root.classList.add('theme-hc')
    else if (mode === 'sepia') root.classList.add('theme-sepia')
  }
  function applyFont(px) {
    document.documentElement.style.setProperty('--rt-font-base', `${px}px`)
  }

  document.addEventListener('open-settings', show)
  document.body.appendChild(wrapper)
  return { show, hide }
}

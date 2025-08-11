export default function SettingsModal() {
  const wrapper = document.createElement('div')
  wrapper.className = 'fixed inset-0 hidden items-center justify-center z-[150]'
  wrapper.innerHTML = `
    <div class="absolute inset-0 bg-black/70" aria-hidden="true"></div>
    <div class="relative card w-[min(560px,95vw)] p-6" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title" class="title-vamp mb-4">Pengaturan</h2>
      <div class="grid gap-4">
        <label class="label flex items-center gap-3">
          <input id="anim" type="checkbox" class="accent-accent-dullgold"/>
          Aktifkan efek animasi (fog/transisi)
        </label>

        <div>
          <div class="label mb-1">Tema</div>
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <button data-theme="dark" class="w-8 h-8 rounded bg-[#0b1220] border border-white/10" title="Gelap" aria-label="Tema gelap"></button>
            <button data-theme="light" class="w-8 h-8 rounded bg-white border border-black/10" title="Terang" aria-label="Tema terang"></button>
            <button data-theme="sepia" class="w-8 h-8 rounded" style="background:#1a1410;border:1px solid #d6b35e55" title="Sepia" aria-label="Tema sepia"></button>
            <button data-theme="hc" class="w-8 h-8 rounded bg-black border-2 border-yellow-400" title="High Contrast" aria-label="Tema high contrast"></button>
            <button data-theme="cb" class="w-8 h-8 rounded" style="background:#0e1320;border:1px solid #f2994a55" title="Color-blind Friendly" aria-label="Tema ramah buta warna"></button>
          </div>
          <select id="theme" class="input w-full" aria-label="Pilih tema">
            <option value="dark">Gelap (default)</option>
            <option value="light">Terang</option>
            <option value="sepia">Sepia (malam)</option>
            <option value="hc">High Contrast</option>
            <option value="cb">Color-blind</option>
            <option value="auto">Otomatis (sunset/sunrise)</option>
          </select>
        </div>

        <div>
          <div class="label mb-1">Kepadatan UI</div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1"><input type="radio" name="density" value="comfortable" id="denComfort"/> Comfortable</label>
            <label class="flex items-center gap-1"><input type="radio" name="density" value="compact" id="denCompact"/> Compact</label>
          </div>
          <div class="text-xs text-base-light/60 mt-1">Compact mengurangi padding untuk menampilkan lebih banyak konten.</div>
        </div>

        <div>
          <div class="label mb-1">Ukuran Font</div>
          <div class="flex items-center gap-2 mb-2">
            <button id="fontDec" class="btn btn-primary" aria-label="Kecilkan font">A-</button>
            <input id="fontSize" type="range" min="14" max="20" step="1" class="flex-1" aria-label="Skala font"/>
            <button id="fontInc" class="btn btn-primary" aria-label="Besarkan font">A+</button>
          </div>
          <div id="fontPreview" class="mt-2 p-2 rounded bg-base-dark/40 text-sm">Contoh teks: The quick brown fox jumps over the lazy vampire.</div>
          <div class="text-xs text-base-light/60 mt-1">Ukuran dasar UI</div>
        </div>

        <div>
          <div class="label mb-1">Theme Builder</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <label class="flex items-center gap-2">Hue <input id="tbHue" type="range" min="0" max="360" step="1" class="flex-1"/></label>
            <label class="flex items-center gap-2">Saturation <input id="tbSat" type="range" min="0" max="100" step="1" class="flex-1"/></label>
            <label class="flex items-center gap-2">Lightness <input id="tbLight" type="range" min="0" max="100" step="1" class="flex-1"/></label>
            <label class="flex items-center gap-2">Background <input id="tbBg" type="color" class="flex-1"/></label>
          </div>
          <div class="text-xs text-base-light/60 mt-1">Semua perubahan tampil live. Reset dengan memilih tema ulang.</div>
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
  const fontInc = wrapper.querySelector('#fontInc')
  const fontDec = wrapper.querySelector('#fontDec')
  const tbHue = wrapper.querySelector('#tbHue')
  const tbSat = wrapper.querySelector('#tbSat')
  const tbLight = wrapper.querySelector('#tbLight')
  const tbBg = wrapper.querySelector('#tbBg')
  const denComfort = wrapper.querySelector('#denComfort')
  const denCompact = wrapper.querySelector('#denCompact')

  // Load from storage
  anim.checked = (localStorage.getItem('rt_anim') ?? '1') === '1'
  themeSel.value = localStorage.getItem('rt_theme') || 'dark'
  fontRange.value = localStorage.getItem('rt_font') || '16'
  reduceMotion.checked = (localStorage.getItem('rt_reduce') ?? '0') === '1'
  const density = localStorage.getItem('rt_density') || 'comfortable'
  if (density === 'compact') denCompact.checked = true; else denComfort.checked = true

  // Apply current settings
  applyTheme(resolveAutoTheme(themeSel.value))
  applyFont(fontRange.value)
  fontPreview.style.fontSize = `${fontRange.value}px`
  document.documentElement.setAttribute('data-reduce', reduceMotion.checked ? '1' : '0')
  applyDensity(density)

  anim.addEventListener('change', () => {
    localStorage.setItem('rt_anim', anim.checked ? '1' : '0')
  })
  themeSel.addEventListener('change', () => {
    localStorage.setItem('rt_theme', themeSel.value)
    applyTheme(resolveAutoTheme(themeSel.value))
  })
  fontRange.addEventListener('input', () => {
    localStorage.setItem('rt_font', fontRange.value)
    applyFont(fontRange.value)
    fontPreview.style.fontSize = `${fontRange.value}px`
  })
  fontInc.addEventListener('click', () => { fontRange.value = Math.min(20, Number(fontRange.value)+1); fontRange.dispatchEvent(new Event('input')) })
  fontDec.addEventListener('click', () => { fontRange.value = Math.max(14, Number(fontRange.value)-1); fontRange.dispatchEvent(new Event('input')) })
  reduceMotion.addEventListener('change', () => {
    const v = reduceMotion.checked ? '1' : '0'
    localStorage.setItem('rt_reduce', v)
    document.documentElement.setAttribute('data-reduce', v)
  })

  // Density handlers
  ;[denComfort, denCompact].forEach((el) => {
    el.addEventListener('change', () => {
      const val = denCompact.checked ? 'compact' : 'comfortable'
      localStorage.setItem('rt_density', val)
      applyDensity(val)
    })
  })

  // Theme swatch handlers
  wrapper.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-theme')
      themeSel.value = mode
      localStorage.setItem('rt_theme', mode)
      applyTheme(resolveAutoTheme(mode))
    })
  })

  // Theme Builder live preview
  ;[tbHue, tbSat, tbLight].forEach((el) => {
    el.addEventListener('input', () => {
      if (el === tbHue) document.documentElement.style.setProperty('--rt-accent-h', el.value)
      if (el === tbSat) document.documentElement.style.setProperty('--rt-accent-s', el.value)
      if (el === tbLight) document.documentElement.style.setProperty('--rt-accent-l', el.value)
    })
  })
  tbBg.addEventListener('input', () => {
    document.documentElement.style.setProperty('--rt-bg-custom', tbBg.value)
  })

  wrapper.querySelector('#close').addEventListener('click', hide)

  function show() { wrapper.classList.remove('hidden'); wrapper.classList.add('flex') }
  function hide() { wrapper.classList.add('hidden'); wrapper.classList.remove('flex') }

  function resolveAutoTheme(mode) {
    if (mode !== 'auto') return mode
    // Simple sunset/sunrise heuristic: 6:00-18:00 light, else sepia
    const hour = new Date().getHours()
    return (hour >= 6 && hour < 18) ? 'light' : 'sepia'
  }
  function applyTheme(mode) {
    const root = document.documentElement
    root.classList.remove('theme-light','theme-hc','theme-sepia','theme-cb')
    if (mode === 'light') root.classList.add('theme-light')
    else if (mode === 'hc') root.classList.add('theme-hc')
    else if (mode === 'sepia') root.classList.add('theme-sepia')
    else if (mode === 'cb') root.classList.add('theme-cb')
    // dark is default (no class)
  }
  function applyFont(px) {
    document.documentElement.style.setProperty('--rt-font-base', `${px}px`)
  }
  function applyDensity(val) {
    if (val === 'compact') document.documentElement.setAttribute('data-density','compact')
    else document.documentElement.removeAttribute('data-density')
  }

  document.addEventListener('open-settings', show)
  document.body.appendChild(wrapper)
  return { show, hide }
}

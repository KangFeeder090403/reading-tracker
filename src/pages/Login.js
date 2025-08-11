import { api } from '../utils/http'
import { setToken } from '../utils/auth'
import { showToast } from '../components/Toast'

export default function LoginPage() {
  const el = document.createElement('div')
  el.className = 'max-w-md mx-auto p-4'
  el.innerHTML = `
    <div class="card p-6">
      <h1 class="title-vamp mb-4">Masuk</h1>
      <div class="space-y-2">
        <input id="email" class="input w-full" placeholder="Email" />
        <input id="password" type="password" class="input w-full" placeholder="Password" />
        <button id="login" class="btn btn-gold w-full">Login</button>
      </div>
      <hr class="decor"/>
      <h2 class="font-ui text-lg mb-2">Registrasi</h2>
      <div class="space-y-2">
        <input id="name" class="input w-full" placeholder="Nama" />
        <input id="reg_email" class="input w-full" placeholder="Email" />
        <input id="reg_password" type="password" class="input w-full" placeholder="Password" />
        <button id="register" class="btn btn-primary w-full">Register</button>
      </div>
    </div>
  `

  const btnLogin = el.querySelector('#login')
  const btnRegister = el.querySelector('#register')

  el.querySelector('#login').addEventListener('click', async () => {
    try {
      btnLogin.disabled = true
      btnLogin.classList.add('opacity-60','cursor-not-allowed')
      const email = el.querySelector('#email').value
      const password = el.querySelector('#password').value
      const { data } = await api.post('/auth/login', { email, password })
      setToken(data.token)
      window.dispatchEvent(new Event('auth-changed'))
      showToast('Berhasil masuk. Selamat datang!', 'success')
      location.hash = '#/'
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Gagal login'
      showToast(msg, 'error')
    } finally {
      btnLogin.disabled = false
      btnLogin.classList.remove('opacity-60','cursor-not-allowed')
    }
  })

  el.querySelector('#register').addEventListener('click', async () => {
    try {
      btnRegister.disabled = true
      btnRegister.classList.add('opacity-60','cursor-not-allowed')
      const name = el.querySelector('#name').value
      const email = el.querySelector('#reg_email').value
      const password = el.querySelector('#reg_password').value
      const { data } = await api.post('/auth/register', { name, email, password })
      setToken(data.token)
      window.dispatchEvent(new Event('auth-changed'))
      showToast('Registrasi berhasil. Akun dibuat!', 'success')
      location.hash = '#/'
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Gagal registrasi'
      showToast(msg, 'error')
    } finally {
      btnRegister.disabled = false
      btnRegister.classList.remove('opacity-60','cursor-not-allowed')
    }
  })

  return el
}

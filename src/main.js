import './styles/index.css'
import { createRouter } from './utils/router'
import Dashboard from './pages/Dashboard'
import BookDetail from './pages/BookDetail'
import LoginPage from './pages/Login'
import { mountNavbar } from './components/Navbar'
import { isLoggedIn } from './utils/auth'
import SettingsModal from './components/SettingsModal'

function animationsEnabled() {
  const v = localStorage.getItem('rt_anim')
  return v === null ? true : v === '1'
}

// Create fog overlay for transitions
const fog = document.createElement('div')
fog.className = 'fog-layer'
document.body.appendChild(fog)

window.addEventListener('route:change:start', () => {
  if (!animationsEnabled()) return
  fog.classList.add('show')
})
window.addEventListener('route:change:end', () => {
  if (!animationsEnabled()) return
  setTimeout(() => fog.classList.remove('show'), 200)
})

const routes = [
  { path: '/', component: async () => (isLoggedIn() ? Dashboard() : (location.hash = '#/login', document.createElement('div'))) },
  { path: '/book/:id', component: async (ctx) => (isLoggedIn() ? BookDetail(ctx) : (location.hash = '#/login', document.createElement('div'))) },
  { path: '/login', component: LoginPage },
]

const app = document.getElementById('app')
mountNavbar()
SettingsModal()
const router = createRouter(routes, app)
router.start()

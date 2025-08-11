// Minimal client-side router (hash-based)
function parseLocation() {
  const [, path = ''] = window.location.hash.split('#')
  return path || '/'
}

function pathToRegex(path) {
  return new RegExp('^' + path.replace(/:\w+/g, '([\\w-]+)') + '$')
}

function getParams(route, path) {
  const values = path.match(pathToRegex(route.path))?.slice(1) || []
  const keys = (route.path.match(/:(\w+)/g) || []).map(k => k.substring(1))
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]))
}

export function createRouter(routes, mountEl) {
  const render = async () => {
    const path = parseLocation()
    const route = routes.find(r => pathToRegex(r.path).test(path)) || routes[0]
    const params = getParams(route, path)
    window.dispatchEvent(new CustomEvent('route:change:start', { detail: { path } }))
    mountEl.innerHTML = ''
    const view = await route.component({ params })
    mountEl.appendChild(view)
    window.dispatchEvent(new CustomEvent('route:change:end', { detail: { path } }))
  }

  return {
    start() {
      window.addEventListener('hashchange', render)
      render()
    }
  }
}

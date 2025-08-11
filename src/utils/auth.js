const KEY = 'rt_token'

export function setToken(token) {
  if (token) localStorage.setItem(KEY, token)
  else localStorage.removeItem(KEY)
}

export function getToken() {
  return localStorage.getItem(KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

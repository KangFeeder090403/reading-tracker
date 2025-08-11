import axios from 'axios'

const BASE = 'https://www.googleapis.com/books/v1/volumes'

export async function searchBooks(q) {
  const { data } = await axios.get(BASE, {
    params: { q, maxResults: 10 }
  })
  return data.items || []
}

export async function getBook(id) {
  const { data } = await axios.get(`${BASE}/${id}`)
  return data
}

const axios = require('axios');

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1';

class GoogleBooksService {
  constructor() {
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  }

  async searchBooks(query, maxResults = 20) {
    if (!query) {
      return [];
    }
    try {
      const response = await axios.get(`${GOOGLE_BOOKS_API_BASE}/volumes`, {
        params: {
          q: query,
          maxResults,
          key: this.apiKey,
        },
      });

      return response.data.items?.map(item => this.formatBookData(item)) || [];
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        console.error('Google Books API Error:', error.response.data.error.message);
        throw new Error(error.response.data.error.message);
      } else if (error.request) {
        console.error('Google Books API No Response:', error.request);
        throw new Error('No response from Google Books API. Check network or API key validity.');
      } else {
        console.error('Google Books API Setup Error:', error.message);
        throw new Error('Failed to search for books due to a setup error.');
      }
    }
  }

  async getBookById(volumeId) {
    try {
      const response = await axios.get(`${GOOGLE_BOOKS_API_BASE}/volumes/${volumeId}`, {
        params: {
          key: this.apiKey,
        },
      });

      return this.formatBookData(response.data);
    } catch (error) {
      console.error('Google Books API getBookById error:', error.message);
      throw new Error('Failed to get book details.');
    }
  }

  formatBookData(volume) {
    const volumeInfo = volume.volumeInfo;
    if (!volumeInfo) return null;

    const industryIdentifiers = volumeInfo.industryIdentifiers || [];
    
    return {
      google_books_id: volume.id,
      title: volumeInfo.title,
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      isbn: this.extractISBN(industryIdentifiers),
      synopsis: volumeInfo.description,
      cover_image_url: volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      publisher: volumeInfo.publisher,
      published_date: volumeInfo.publishedDate,
      page_count: volumeInfo.pageCount,
      genre: volumeInfo.categories?.[0],
      language: volumeInfo.language,
    };
  }

  extractISBN(identifiers) {
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    return isbn13?.identifier || isbn10?.identifier;
  }
}

module.exports = new GoogleBooksService(); 
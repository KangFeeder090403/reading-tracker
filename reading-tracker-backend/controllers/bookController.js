const googleBooksService = require('../services/googleBooks');

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query (q) is required.' });
    }

    const books = await googleBooksService.searchBooks(q);
    res.json(books);
  } catch (error) {
    console.error('Search books controller error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to search for books.' });
  }
}; 
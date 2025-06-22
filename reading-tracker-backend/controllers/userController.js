const { Book, UserReadingList } = require('../models');
const googleBooksService = require('../services/googleBooks');

exports.addBookToReadingList = async (req, res) => {
  try {
    const { google_books_id, status = 'want_to_read' } = req.body;
    const userId = req.user.id;

    if (!google_books_id) {
      return res.status(400).json({ message: 'google_books_id is required.' });
    }

    // 1. Find if the book exists in our DB, or create it
    let book = await Book.findOne({ where: { google_books_id } });

    if (!book) {
      const bookData = await googleBooksService.getBookById(google_books_id);
      if (!bookData) {
        return res.status(404).json({ message: 'Book not found on Google Books.' });
      }
      book = await Book.create(bookData);
    }

    // 2. Check if the book is already in the user's list
    const existingEntry = await UserReadingList.findOne({
      where: { user_id: userId, book_id: book.id },
    });

    if (existingEntry) {
      return res.status(409).json({ message: 'This book is already in your list.' });
    }

    // 3. Add the book to the user's reading list
    const readingListItem = await UserReadingList.create({
      user_id: userId,
      book_id: book.id,
      status,
    });
    
    // 4. Return the new list item, including the book details
    const result = await UserReadingList.findOne({
      where: { id: readingListItem.id },
      include: [Book]
    });

    res.status(201).json(result);

  } catch (error) {
    console.error('Add book to list error:', error);
    res.status(500).json({ message: 'Failed to add book to reading list.' });
  }
};

exports.getReadingList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const whereClause = { user_id: userId };
    if (status) {
      whereClause.status = status;
    }

    const readingList = await UserReadingList.findAll({
      where: whereClause,
      include: [Book],
      order: [['updated_at', 'DESC']],
    });

    res.json(readingList);
  } catch (error) {
    console.error('Get reading list error:', error);
    res.status(500).json({ message: 'Failed to retrieve reading list.' });
  }
};

exports.updateReadingListItem = async (req, res) => {
  try {
    const { listItemId } = req.params;
    const userId = req.user.id;
    const { status, current_page, rating, review } = req.body;

    const item = await UserReadingList.findOne({
      where: { id: listItemId, user_id: userId },
    });

    if (!item) {
      return res.status(404).json({ message: 'Reading list item not found.' });
    }

    // Update fields
    if (status) item.status = status;
    if (current_page !== undefined) item.current_page = current_page;
    if (rating !== undefined) item.rating = rating;
    if (review !== undefined) item.review = review;

    // Handle date changes on status update
    if (status === 'currently_reading' && !item.start_date) {
      item.start_date = new Date();
    }
    if (status === 'read' && !item.finish_date) {
      item.finish_date = new Date();
    }

    await item.save();

    const updatedItem = await UserReadingList.findOne({
        where: { id: item.id },
        include: [Book]
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Failed to update reading list item.' });
  }
}; 
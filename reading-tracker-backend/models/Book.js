const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  google_books_id: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  isbn: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  synopsis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cover_image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  publisher: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  published_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  page_count: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  genre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'en'
  }
}, {
  tableName: 'books'
})

module.exports = Book 
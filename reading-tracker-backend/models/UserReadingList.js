const { DataTypes } = require('sequelize')
const sequelize = require('../config/database')

const UserReadingList = sequelize.define('UserReadingList', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  book_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'books',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('want_to_read', 'currently_reading', 'read'),
    allowNull: false,
    defaultValue: 'want_to_read'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  finish_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  current_page: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'user_reading_lists'
})

module.exports = UserReadingList 
const sequelize = require('../config/database')
const User = require('./User')
const Book = require('./Book')
const UserReadingList = require('./UserReadingList')

// Define associations
User.hasMany(UserReadingList, { foreignKey: 'user_id' })
UserReadingList.belongsTo(User, { foreignKey: 'user_id' })

Book.hasMany(UserReadingList, { foreignKey: 'book_id' })
UserReadingList.belongsTo(Book, { foreignKey: 'book_id' })

module.exports = {
  sequelize,
  User,
  Book,
  UserReadingList
} 
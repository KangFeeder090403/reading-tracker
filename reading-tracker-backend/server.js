require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { sequelize } = require('./models')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/books', require('./routes/books'))
app.use('/api/reading-list', require('./routes/readingList'))

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Reading Tracker API is running!' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate()
    console.log('Database connection established successfully.')

    // Sync database (create tables if they don't exist)
    await sequelize.sync()
    console.log('Database synced successfully')

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`API available at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer() 
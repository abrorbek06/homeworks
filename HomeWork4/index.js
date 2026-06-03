require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const { ROLE_PERMISSIONS } = require('./config/permissions');


const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const exampleRoutes = require('./routes/example');


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


connectDB();


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/example', exampleRoutes);


app.get('/', (req, res) => {
  res.json({
    message: 'Authentication & RBAC System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      example: '/api/example',
    },
    availableRoles: Object.keys(ROLE_PERMISSIONS),
  });
});


app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
});

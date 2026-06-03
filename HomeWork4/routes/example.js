const express = require('express');
const { authenticateToken, authorizeRole, authorizePermission } = require('../middleware/auth');

const router = express.Router();


router.get('/public', (req, res) => {
  res.json({ message: 'This is a public route' });
});


router.get('/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user.name,
    role: req.user.role,
  });
});


router.get('/admin-only', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ message: 'This is an admin-only route' });
});


router.get('/moderator', authenticateToken, authorizeRole('admin', 'moderator'), (req, res) => {
  res.json({ message: 'This route is accessible by admin and moderator' });
});


router.post('/create-post', authenticateToken, authorizePermission('post:create'), (req, res) => {
  res.json({
    message: 'Post created successfully',
    user: req.user.name,
    role: req.user.role,
  });
});


router.put(
  '/update-post/:postId',
  authenticateToken,
  authorizePermission('post:update'),
  (req, res) => {
    res.json({
      message: 'Post updated successfully',
      postId: req.params.postId,
    });
  }
);


router.delete(
  '/delete-post/:postId',
  authenticateToken,
  authorizePermission('post:delete'),
  (req, res) => {
    res.json({
      message: 'Post deleted successfully',
      postId: req.params.postId,
    });
  }
);


router.get('/list-users', authenticateToken, authorizePermission('user:list'), (req, res) => {
  res.json({
    message: 'Users list retrieved (you have user:list permission)',
    user: req.user.name,
  });
});

module.exports = router;

const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRole, authorizePermission } = require('../middleware/auth');

const router = express.Router();


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);


router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;

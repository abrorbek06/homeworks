const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRole, authorizePermission } = require('../middleware/auth');

const router = express.Router();


router.use(authenticateToken);
router.use(authorizeRole('admin'));


router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId/deactivate', adminController.deactivateUser);
router.put('/users/:userId/activate', adminController.activateUser);
router.delete('/users/:userId', adminController.deleteUser);


router.get('/roles', adminController.getAllRoles);
router.get('/permissions', adminController.getPermissions);
router.get('/roles/:role/permissions', adminController.getRolePermissions);
router.get('/users/:userId/permissions', adminController.getUserPermissions);

module.exports = router;

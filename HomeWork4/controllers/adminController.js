const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { ROLE_PERMISSIONS } = require('../config/permissions');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      message: 'Users retrieved successfully',
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User retrieved successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user', error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['admin', 'moderator', 'user', 'guest'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user._id.toString() === user._id.toString() && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot demote yourself from admin' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user._id.toString() === user._id.toString()) {
      return res.status(403).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to deactivate user', error: error.message });
  }
};

exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User activated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to activate user', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = Object.keys(ROLE_PERMISSIONS).map((roleName) => ({
      name: roleName,
      permissions: ROLE_PERMISSIONS[roleName],
    }));

    res.json({
      message: 'Roles retrieved successfully',
      count: roles.length,
      roles,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get roles', error: error.message });
  }
};

exports.getPermissions = async (req, res) => {
  try {
    const { PERMISSIONS } = require('../config/permissions');
    const permissions = Object.entries(PERMISSIONS).map(([key, description]) => ({
      name: key,
      description,
    }));

    res.json({
      message: 'Permissions retrieved successfully',
      count: permissions.length,
      permissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get permissions', error: error.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const { role } = req.params;

    if (!ROLE_PERMISSIONS[role]) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      message: `Permissions for ${role} role`,
      role,
      permissions: ROLE_PERMISSIONS[role],
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get role permissions', error: error.message });
  }
};

exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    res.json({
      message: 'User permissions retrieved successfully',
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
      permissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get user permissions', error: error.message });
  }
};

const PERMISSIONS = {
  'user:read': 'Read user data',
  'user:create': 'Create new users',
  'user:update': 'Update user data',
  'user:delete': 'Delete users',
  'user:list': 'List all users',

  'post:read': 'Read posts',
  'post:create': 'Create posts',
  'post:update': 'Update posts',
  'post:delete': 'Delete posts',
  'post:list': 'List all posts',

  'admin:access': 'Access admin panel',
  'admin:manage_users': 'Manage all users',
  'admin:manage_roles': 'Manage roles and permissions',
  'admin:manage_permissions': 'Manage system permissions',
};

const ROLE_PERMISSIONS = {
  admin: Object.keys(PERMISSIONS),
  moderator: [
    'user:read',
    'user:list',
    'user:update',
    'post:read',
    'post:list',
    'post:update',
    'post:delete',
  ],
  user: [
    'user:read',
    'post:read',
    'post:list',
    'post:create',
  ],
  guest: [
    'user:read',
    'post:read',
    'post:list',
  ],
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
};

/**
 * Authentication & RBAC System - JavaScript Client Examples
 * 
 * Usage:
 * 1. Include this file in your frontend
 * 2. Use the AuthClient class to interact with the API
 */

class AuthClient {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }


  /**
   * Register a new user
   * @param {Object} userData - { name, email, password, confirmPassword }
   * @returns {Promise<Object>} User data and tokens
   */
  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        this.setTokens(data.accessToken, data.refreshToken);
      }

      return { status: response.status, data };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User data and tokens
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.setTokens(data.accessToken, data.refreshToken);
      }

      return { status: response.status, data };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        this.setTokens(data.accessToken, data.refreshToken);
      }

      return { status: response.status, data };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile data
   */
  async getCurrentUser() {
    return this.makeAuthenticatedRequest('/api/auth/me', 'GET');
  }

  /**
   * Update user profile
   * @param {Object} updateData - { name, email }
   * @returns {Promise<Object>} Updated user data
   */
  async updateProfile(updateData) {
    return this.makeAuthenticatedRequest('/api/auth/profile', 'PUT', updateData);
  }

  /**
   * Change user password
   * @param {Object} passwordData - { currentPassword, newPassword, confirmPassword }
   * @returns {Promise<Object>} Success message
   */
  async changePassword(passwordData) {
    return this.makeAuthenticatedRequest('/api/auth/change-password', 'PUT', passwordData);
  }

  /**
   * Logout user
   * @returns {Promise<Object>} Success message
   */
  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        this.clearTokens();
      }

      return { status: response.status, data };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // ============ ADMIN METHODS ============

  /**
   * Get all users (admin only)
   * @returns {Promise<Object>} List of users
   */
  async getAllUsers() {
    return this.makeAuthenticatedRequest('/api/admin/users', 'GET');
  }

  /**
   * Get user by ID (admin only)
   * @param {string} userId
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}`, 'GET');
  }

  /**
   * Update user role (admin only)
   * @param {string} userId
   * @param {string} role - admin, moderator, user, or guest
   * @returns {Promise<Object>} Updated user data
   */
  async updateUserRole(userId, role) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}/role`, 'PUT', { role });
  }

  /**
   * Deactivate user (admin only)
   * @param {string} userId
   * @returns {Promise<Object>} Success message
   */
  async deactivateUser(userId) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}/deactivate`, 'PUT');
  }

  /**
   * Activate user (admin only)
   * @param {string} userId
   * @returns {Promise<Object>} Success message
   */
  async activateUser(userId) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}/activate`, 'PUT');
  }

  /**
   * Delete user (admin only)
   * @param {string} userId
   * @returns {Promise<Object>} Success message
   */
  async deleteUser(userId) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}`, 'DELETE');
  }

  /**
   * Get all roles (admin only)
   * @returns {Promise<Object>} List of roles
   */
  async getAllRoles() {
    return this.makeAuthenticatedRequest('/api/admin/roles', 'GET');
  }

  /**
   * Get all permissions (admin only)
   * @returns {Promise<Object>} List of permissions
   */
  async getPermissions() {
    return this.makeAuthenticatedRequest('/api/admin/permissions', 'GET');
  }

  /**
   * Get permissions for a role (admin only)
   * @param {string} role - Role name
   * @returns {Promise<Object>} Role permissions
   */
  async getRolePermissions(role) {
    return this.makeAuthenticatedRequest(`/api/admin/roles/${role}/permissions`, 'GET');
  }

  /**
   * Get user permissions (admin only)
   * @param {string} userId
   * @returns {Promise<Object>} User permissions
   */
  async getUserPermissions(userId) {
    return this.makeAuthenticatedRequest(`/api/admin/users/${userId}/permissions`, 'GET');
  }

  // ============ UTILITY METHODS ============

  /**
   * Make authenticated request with auto token refresh
   * @private
   */
  async makeAuthenticatedRequest(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      let response = await fetch(`${this.baseURL}${endpoint}`, options);

      // Auto refresh token if expired
      if (response.status === 403) {
        console.log('Token expired, attempting refresh...');
        const refreshResult = await this.refreshToken();

        if (refreshResult.status === 200) {
          // Retry request with new token
          options.headers.Authorization = `Bearer ${this.accessToken}`;
          response = await fetch(`${this.baseURL}${endpoint}`, options);
        }
      }

      const responseData = await response.json();
      return { status: response.status, data: responseData };
    } catch (error) {
      console.error(`Request error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Store tokens in localStorage
   * @private
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear tokens from localStorage
   * @private
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Get stored access token
   */
  getAccessToken() {
    return this.accessToken;
  }
}

// ============ USAGE EXAMPLES ============

/*
// Example 1: Register
const auth = new AuthClient();
const registerResult = await auth.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePass123',
  confirmPassword: 'SecurePass123'
});
console.log(registerResult.data);

// Example 2: Login
const loginResult = await auth.login('john@example.com', 'SecurePass123');
console.log(loginResult.data);

// Example 3: Get current user
const userResult = await auth.getCurrentUser();
console.log(userResult.data.user);

// Example 4: Update profile
const updateResult = await auth.updateProfile({ name: 'Jane Doe' });
console.log(updateResult.data);

// Example 5: Admin - Get all users
const usersResult = await auth.getAllUsers();
console.log(usersResult.data.users);

// Example 6: Admin - Update user role
const roleResult = await auth.updateUserRole(userId, 'moderator');
console.log(roleResult.data);

// Example 7: Check if authenticated
if (auth.isAuthenticated()) {
  console.log('User is authenticated');
}

// Example 8: Logout
const logoutResult = await auth.logout();
console.log(logoutResult.data);
*/

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthClient;
}

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

interface User {
  id: number;
  username: string;
  role: 'TENANT' | 'PROPERTY_MANAGER';
  lastLoginAt: string | null;
}

interface UserListResponse {
  data: User[];
  total: number;
  skip: number;
  take: number;
}

export default function UserManagementPage(): React.ReactElement {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'TENANT' | 'PROPERTY_MANAGER' | ''>('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const take = 10;

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'TENANT' as 'TENANT' | 'PROPERTY_MANAGER',
  });

  useEffect(() => {
    fetchUsers();
  }, [skip, roleFilter]);

  const fetchUsers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        skip: skip.toString(),
        take: take.toString(),
        ...(roleFilter && { role: roleFilter }),
      });

      const data: UserListResponse = await apiFetch(`/users?${params}`, { token });
      setUsers(data.data);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);

    try {
      await apiFetch('/users', {
        token,
        method: 'POST',
        body: formData,
      });

      setShowCreateModal(false);
      setFormData({ username: '', password: '', role: 'TENANT' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token) return;
    setError(null);

    try {
      const updateData: any = {};
      if (formData.password) {
        updateData.password = formData.password;
      }
      if (formData.role !== selectedUser.role) {
        updateData.role = formData.role;
      }

      await apiFetch(`/users/${selectedUser.id}`, {
        token,
        method: 'PUT',
        body: updateData,
      });

      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ username: '', password: '', role: 'TENANT' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await apiFetch(`/users/${id}`, {
        token,
        method: 'DELETE',
      });

      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!roleFilter || user.role === roleFilter),
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <button
          onClick={() => {
            setFormData({ username: '', password: '', role: 'TENANT' });
            setShowCreateModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create User
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border rounded px-4 py-2"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as 'TENANT' | 'PROPERTY_MANAGER' | '');
            setSkip(0);
          }}
          className="border rounded px-4 py-2"
        >
          <option value="">All Roles</option>
          <option value="TENANT">Tenant</option>
          <option value="PROPERTY_MANAGER">Property Manager</option>
        </select>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="border px-4 py-2">ID</th>
                <th className="border px-4 py-2">Username</th>
                <th className="border px-4 py-2">Role</th>
                <th className="border px-4 py-2">Last Login</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="border px-4 py-2">{user.id}</td>
                  <td className="border px-4 py-2">{user.username}</td>
                  <td className="border px-4 py-2">{user.role}</td>
                  <td className="border px-4 py-2">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setSkip(Math.max(0, skip - take))}
              disabled={skip === 0}
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Showing {skip + 1} to {Math.min(skip + take, total)} of {total}
            </span>
            <button
              onClick={() => setSkip(skip + take)}
              disabled={skip + take >= total}
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create User</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                  minLength={8}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'TENANT' | 'PROPERTY_MANAGER' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="PROPERTY_MANAGER">Property Manager</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  minLength={8}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'TENANT' | 'PROPERTY_MANAGER' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="TENANT">Tenant</option>
                  <option value="PROPERTY_MANAGER">Property Manager</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded flex-1">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

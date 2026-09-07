import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Card, { CardBody, CardHeader, CardTitle } from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import { useToast } from '../context/ToastContext';
import { getAdmins, updateAdminRole, getInviteCode } from '../services/api';

const AdminManagement = () => {
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: admins = [] } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await getAdmins();
        return response.data;
      } catch (error) {
        console.error('Error fetching admins:', error);
        toast.error(error.response?.data?.message || 'Failed to load admins');
        throw error;
      } finally {
        setLoading(false);
      }
    }
  });

  // Load current invite code for admins
  useQuery({
    queryKey: ['inviteCode'],
    queryFn: async () => {
      try {
        const response = await getInviteCode();
        setInviteCode(response.data.code);
        return response.data.code;
      } catch (error) {
        console.error('Error fetching invite code:', error);
        toast.error(error.response?.data?.message || 'Failed to load invite code');
        throw error;
      }
    }
  });

  const handleRoleChange = async (id, newRole) => {
    try {
      setUpdatingId(id);
      await updateAdminRole(id, newRole);
      toast.success('Role updated successfully');
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAdmins = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return admins.filter((admin) =>
      admin.username?.toLowerCase().includes(query) ||
      admin.email?.toLowerCase().includes(query) ||
      admin.role?.toLowerCase().includes(query)
    );
  }, [admins, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Management</h1>
          <p className="text-gray-600 mt-1">Manage admin and manager roles</p>
        </div>
      </div>

      <Card>
        <CardBody>
          {/* Invite Code Panel */}
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Current Signup Invite Code</p>
              <p className="text-xs text-emerald-700 mt-1">Share this code only with trusted people who should create an admin/manager account.</p>
            </div>
            <div className="flex items-center gap-3">
              <code className="px-3 py-2 bg-white rounded border border-emerald-200 text-sm tracking-widest uppercase">{inviteCode || '••••••••'}</code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!inviteCode) return;
                  navigator.clipboard.writeText(inviteCode);
                  toast.success('Invite code copied to clipboard');
                }}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, email, or role..."
            />
          </div>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading admins...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAdmins.length > 0 ? (
                    filteredAdmins.map((admin) => (
                      <tr key={admin._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">{admin.username}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{admin.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{admin.role}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <select
                              value={admin.role === 'superadmin' ? 'superadmin' : admin.role}
                              onChange={(e) => handleRoleChange(admin._id, e.target.value)}
                              disabled={admin.role === 'superadmin' || updatingId === admin._id}
                              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              {admin.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                            </select>
                            {admin.role === 'superadmin' && (
                              <span className="text-xs text-amber-600 font-medium">Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                        No admins found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminManagement;

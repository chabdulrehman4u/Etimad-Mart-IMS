import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { baseURL } from '../services/baseURL';

const SellerPasswordChange = ({ isFirstLogin = false }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_URL = baseURL 

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const validateForm = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return false;
    }

    if (formData.newPassword === formData.currentPassword) {
      setError('New password must be different from current password');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `${API_URL}/auth/change-password`,
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess(true);

      // After successful password change, logout and redirect to login
      setTimeout(async () => {
        await logout();
        navigate('/login', {
          state: { message: 'Password changed successfully! Please login with your new password.' }
        });
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isFirstLogin) {
      // Navigate to dashboard but keep temporary password
      navigate('/seller-dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white text-center">
          <div className="bg-white bg-opacity-20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound size={40} />
          </div>
          <h1 className="text-3xl font-bold">
            {isFirstLogin ? 'Welcome! Set Your Password' : 'Change Password'}
          </h1>
          <p className="text-blue-100 mt-2">
            {isFirstLogin
              ? 'Please change your temporary password'
              : 'Update your password for security'}
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          {isFirstLogin && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-amber-800 font-medium">First Time Login</p>
                <p className="text-xs text-amber-700 mt-1">
                  For security, please change your temporary password to something memorable.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-rose-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-emerald-700 text-sm font-medium">Password changed successfully!</p>
                <p className="text-emerald-600 text-xs mt-1">Redirecting to login...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.current ? "text" : "password"}
                  name="currentPassword"
                  required
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter temporary password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="newPassword"
                  required
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use at least 6 characters with a mix of letters and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : success ? (
                <>
                  <CheckCircle size={20} />
                  Password Changed!
                </>
              ) : (
                <>
                  <KeyRound size={20} />
                  Change Password
                </>
              )}
            </button>

            {/* Skip Button (Only for first login) */}
            {isFirstLogin && !success && (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors"
              >
                Skip for Now
              </button>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-xs text-gray-500">
            Password must be at least 6 characters long
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerPasswordChange;

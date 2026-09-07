import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock, ArrowLeft, AlertCircle, CheckCircle, Key, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '../services/api';
import { useToast } from '../context/ToastContext';

const ResetPassword = () => {
  const { token } = useParams(); // Get token from URL
  const [formData, setFormData] = useState({
    resetToken: token || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Auto-fill token from URL
  useEffect(() => {
    if (token) {
      setFormData(prev => ({ ...prev, resetToken: token }));
    } else {
      setError('Invalid reset link. Please request a new password reset.');
      showToast('Invalid reset link', 'error');
    }
  }, [token, showToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.resetToken) {
      setError('Missing reset token. Please use the link from your email.');
      showToast('Missing reset token', 'error');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      showToast('Passwords do not match', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        resetToken: formData.resetToken,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      showToast('✅ Password reset successful!', 'success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password reset successful! Please login with your new password.' }
        });
      }, 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-8 text-white text-center">
          <div className="bg-white bg-opacity-20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={40} />
          </div>
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-slate-200 mt-2">Choose a new secure password</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {!success ? (
            <>
              {error && (
                <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-rose-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Token Info (Hidden field, auto-filled from URL) */}
                {token && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 flex items-center gap-2">
                      <CheckCircle size={16} className="text-blue-500" />
                      Reset token verified from email link
                    </p>
                  </div>
                )}

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
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="text-gray-400" size={20} />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Lock size={20} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col items-center text-center gap-3">
                <CheckCircle className="text-emerald-500" size={48} />
                <div>
                  <p className="text-emerald-700 font-bold text-lg">Password Reset Successful!</p>
                  <p className="text-emerald-600 text-sm mt-2">
                    Your password has been reset successfully.
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    Redirecting to login page...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-gray-600 hover:text-emerald-600 font-medium inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-xs text-gray-500">
            Need a new token? <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700">Request again</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset, verifyOtp, resetPassword, clearResetState, clearError } from '../store/slices/authSlice';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { notifySuccess, notifyError } from '../lib/notify';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, resetPasswordState } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Clear state on unmount
  useEffect(() => {
    return () => {
      dispatch(clearResetState());
      dispatch(clearError());
    };
  }, [dispatch]);

  // Handle error display
  useEffect(() => {
    if (error) {
      notifyError(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      notifyError("Please enter your email");
      return;
    }
    await dispatch(requestPasswordReset(email));
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      notifyError("Please enter the OTP");
      return;
    }
    await dispatch(verifyOtp({ email: resetPasswordState.email, otp }));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notifyError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      notifyError("Password must be at least 8 characters");
      return;
    }
    
    const result = await dispatch(resetPassword({ 
      email: resetPasswordState.email, 
      otp, 
      new_password: newPassword 
    }));

    if (!result.error) {
      notifySuccess("Password reset successfully! Please login.");
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            {resetPasswordState.step === 1 && "Enter your email to receive a verification code"}
            {resetPasswordState.step === 2 && `Enter the 6-digit code sent to ${resetPasswordState.email}`}
            {resetPasswordState.step === 3 && "Create a new secure password"}
          </p>
        </div>

        {/* Step 1: Request OTP */}
        {resetPasswordState.step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestOtp}>
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" className="w-full" isLoading={loading}>
              Send Verification Code
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => navigate('/login')} 
                className="text-sm font-medium text-gray-600 hover:text-black flex items-center justify-center gap-2 mx-auto"
              >
                <ArrowLeft size={16} /> Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {resetPasswordState.step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            <div>
              <Input
                label="Verification Code (OTP)"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="text-center text-2xl tracking-widest"
              />
              <p className="mt-2 text-xs text-center text-gray-500">
                Check your inbox and spam folder. Code expires in 10 minutes.
              </p>
            </div>
            
            <Button type="submit" className="w-full" isLoading={loading}>
              Verify Code
            </Button>
            
            <div className="text-center space-y-4">
              <button 
                type="button"
                onClick={handleRequestOtp} 
                className="text-sm text-blue-600 hover:underline"
                disabled={loading}
              >
                Resend Code
              </button>
              <button 
                type="button"
                onClick={() => dispatch(clearResetState())} 
                className="block w-full text-sm text-gray-500 hover:text-black"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Set New Password */}
        {resetPasswordState.step === 3 && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="bg-green-50 border border-green-200 rounded-sm p-4 flex items-center gap-3 text-green-800 text-sm">
              <CheckCircle2 size={20} />
              <span>Code verified successfully</span>
            </div>

            <Input
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />

            <Button type="submit" className="w-full" isLoading={loading}>
              Reset Password
            </Button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPasswordPage;
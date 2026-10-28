import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Key,
  X,
  CheckCircle2,
  User,
  Mail,
  ShieldCheck,
  Lock,
  Sparkles,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { compressImageToBase64 } from '../../utils/imageCompressor';

function Settings() {
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNo, setEmployeeNo] = useState('EMP-0000-000');
  const [role, setRole] = useState('Inventory');
  const [profileImage, setProfileImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const savedProfileImage = localStorage.getItem('profileImage');

      if (!storedUser) return;

      try {
        const parsedUser = JSON.parse(storedUser);
        const userId =
          parsedUser.id ||
          parsedUser._id ||
          (parsedUser.user && (parsedUser.user.id || parsedUser.user._id));

        const initialImg =
          parsedUser.profileImage ||
          parsedUser.ProfileImage ||
          savedProfileImage ||
          '';
        setProfileImage(initialImg);

        const API_BASE_URL =
          import.meta.env.MODE === 'production'
            ? 'https://mhira-crmsystem.onrender.com'
            : 'http://localhost:5000';

        if (userId && token) {
          const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const freshUser = await response.json();
            setUserData(freshUser);
            setName(freshUser.Fullname || freshUser.fullname || freshUser.fullName || parsedUser.Fullname || parsedUser.fullname || parsedUser.fullName || '');
            setUsername(freshUser.Username || freshUser.username || parsedUser.Username || parsedUser.username || '');
            setEmail(freshUser.Email || freshUser.email || parsedUser.Email || parsedUser.email || '');
            setEmployeeNo(freshUser.EmpNo || freshUser.empNo || parsedUser.EmpNo || parsedUser.empNo || 'EMP-0000-000');
            setRole(freshUser.SystemRole || freshUser.systemRole || freshUser.role || parsedUser.SystemRole || parsedUser.systemRole || parsedUser.role || 'Inventory');
            if (freshUser.profileImage || freshUser.ProfileImage) {
              setProfileImage(freshUser.profileImage || freshUser.ProfileImage);
            }
            return;
          }
        }

        setUserData(parsedUser);
        setName(parsedUser.Fullname || parsedUser.fullname || parsedUser.fullName || '');
        setUsername(parsedUser.Username || parsedUser.username || '');
        setEmail(parsedUser.Email || parsedUser.email || '');
        setEmployeeNo(parsedUser.EmpNo || parsedUser.empNo || 'EMP-0000-000');
        setRole(parsedUser.SystemRole || parsedUser.systemRole || parsedUser.role || 'Inventory');
      } catch (error) {
        console.error('Error fetching user profile in Settings:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showErrorToast('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    try {
      setIsUploadingImage(true);
      const base64Image = await compressImageToBase64(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.8,
      });

      setProfileImage(base64Image);

      // Update localStorage
      localStorage.setItem('profileImage', base64Image);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          parsedUser.profileImage = base64Image;
          localStorage.setItem('user', JSON.stringify(parsedUser));
        } catch (err) {
          console.error('Failed to update user in localStorage:', err);
        }
      }

      // Notify other components (DashboardTopbar, etc.)
      window.dispatchEvent(new Event('userUpdated'));
      window.dispatchEvent(new Event('storage'));

      // Attempt to sync with backend if possible
      const storedUserObj = storedUser ? JSON.parse(storedUser) : null;
      const userId = userData?.id || userData?._id || storedUserObj?.id || storedUserObj?._id;
      const token = localStorage.getItem('token');

      if (userId) {
        const API_BASE_URL =
          import.meta.env.MODE === 'production'
            ? 'https://mhira-crmsystem.onrender.com'
            : 'http://localhost:5000';

        try {
          await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ profileImage: base64Image })
          });
        } catch (backendErr) {
          console.warn('Backend sync warning (offline or demo mode):', backendErr);
        }
      }

      setIsUploadingImage(false);
      showSuccessToast('Profile picture uploaded and updated successfully!');
    } catch (err) {
      setIsUploadingImage(false);
      console.error('Error uploading profile picture:', err);
      showErrorToast('Failed to upload image. Please try again.');
    }
  };

  const handleRemovePhoto = async () => {
    setProfileImage('');
    localStorage.removeItem('profileImage');

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        delete parsedUser.profileImage;
        delete parsedUser.ProfileImage;
        localStorage.setItem('user', JSON.stringify(parsedUser));
      } catch (err) {
        console.error('Error removing profile photo from storage:', err);
      }
    }

    window.dispatchEvent(new Event('userUpdated'));
    window.dispatchEvent(new Event('storage'));

    const storedUserObj = storedUser ? JSON.parse(storedUser) : null;
    const userId = userData?.id || userData?._id || storedUserObj?.id || storedUserObj?._id;
    const token = localStorage.getItem('token');

    if (userId) {
      const API_BASE_URL =
        import.meta.env.MODE === 'production'
          ? 'https://mhira-crmsystem.onrender.com'
          : 'http://localhost:5000';

      try {
        await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ profileImage: '' })
        });
      } catch (e) {
        console.warn('Backend sync remove warning:', e);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    showSuccessToast('Profile picture removed. Initials will now be displayed.');
  };

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isCurrentPassValid, setIsCurrentPassValid] = useState(null);
  const [isCheckingCurrentPass, setIsCheckingCurrentPass] = useState(false);

  // Debounced real-time check for Current Password match
  useEffect(() => {
    if (!currentPassword || currentPassword.trim() === '') {
      setIsCurrentPassValid(null);
      setIsCheckingCurrentPass(false);
      return;
    }

    const timer = setTimeout(async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const userId = userData?.id || userData?._id || parsedUser?.id || parsedUser?._id;

      if (!userId) {
        setIsCurrentPassValid(true);
        return;
      }

      try {
        setIsCheckingCurrentPass(true);
        const API_BASE_URL =
          import.meta.env.MODE === 'production'
            ? 'https://mhira-crmsystem.onrender.com'
            : 'http://localhost:5000';

        const response = await fetch(`${API_BASE_URL}/api/users/verify-password/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ currentPassword }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsCurrentPassValid(data.valid === true);
        } else {
          setIsCurrentPassValid(false);
        }
      } catch (err) {
        console.error('Error verifying current password:', err);
      } finally {
        setIsCheckingCurrentPass(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [currentPassword, userData]);

  const checkPasswordStrength = (pass) => {
    if (!pass) return { label: '', score: 0, color: 'text-slate-400', bg: 'bg-slate-200' };

    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);

    const totalCriteria = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;

    if (pass.length >= 8 && totalCriteria === 3) {
      return { label: 'Strong', score: 3, color: 'text-emerald-700', bg: 'bg-emerald-600' };
    } else if (pass.length >= 6 && totalCriteria >= 2) {
      return { label: 'Medium', score: 2, color: 'text-amber-600', bg: 'bg-amber-500' };
    } else {
      return { label: 'Weak', score: 1, color: 'text-rose-600', bg: 'bg-rose-500' };
    }
  };

  const passwordStrength = checkPasswordStrength(newPassword);

  // Button is enabled only when:
  // 1. Current Password is verified and matches the account
  // 2. New Password is entered (length >= 6)
  // 3. Confirm Password is entered
  // 4. New Password matches Confirm Password
  // 5. New Password is NOT equal to Current Password
  const isFormValid =
    isCurrentPassValid === true &&
    newPassword.trim() !== '' &&
    confirmPassword.trim() !== '' &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    newPassword.length >= 6;

  const handleOpenConfirmModal = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsConfirmModalOpen(true);
  };

  const executePasswordChange = async () => {
    const userId = userData?.id || userData?._id;
    const token = localStorage.getItem('token');

    if (!userId) {
      showErrorToast('Failed to retrieve user session ID. Please log in again.');
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      const API_BASE_URL =
        import.meta.env.MODE === 'production'
          ? 'https://mhira-crmsystem.onrender.com'
          : 'http://localhost:5000';

      const response = await fetch(
        `${API_BASE_URL}/api/users/change-password/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to update password');

      showSuccessToast('Your account password has been successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsCurrentPassValid(null);
      setIsConfirmModalOpen(false);
    } catch (error) {
      showErrorToast(error.message || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">
      {/* HIDDEN FILE INPUT FOR PROFILE PHOTO */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* USER PROFILE SUMMARY CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* AVATAR WITH PHOTO UPLOAD HOVER */}
          <div className="relative group">
            <div
              onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#01390f] text-white flex items-center justify-center font-bold text-xl shadow-sm overflow-hidden cursor-pointer relative transition-all group-hover:shadow-md group-hover:scale-[1.02]"
              title="Click to upload profile photo"
            >
              {isUploadingImage ? (
                <div className="flex flex-col items-center justify-center gap-1 text-emerald-200">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-[10px] font-bold">Uploading...</span>
                </div>
              ) : profileImage ? (
                <>
                  <img
                    src={profileImage}
                    alt={name || username}
                    className="w-full h-full object-cover"
                  />
                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-0.5 backdrop-blur-[1px]">
                    <Camera className="w-4 h-4" />
                    <span>Change</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-2xl font-black tracking-wider select-none text-white">
                    {name ? name.slice(0, 2).toUpperCase() : username ? username.slice(0, 2).toUpperCase() : 'JH'}
                  </span>
                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-0.5 backdrop-blur-[1px]">
                    <Camera className="w-4 h-4" />
                    <span>Upload</span>
                  </div>
                </>
              )}
            </div>

            {/* CAMERA QUICK BADGE BUTTON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 bg-white text-[#01390f] p-1.5 rounded-xl shadow-md border border-slate-200 hover:bg-emerald-50 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Upload / Change Photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {name || username || 'Jherney Abril'}
              </h2>
            </div>

            {/* PHOTO ACTION LINKS */}
            <div className="flex items-center gap-3 mt-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-[#01390f] hover:text-[#012409] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{profileImage ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {profileImage && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove Photo</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">

            <span>Active Staff Session</span>
          </span>
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: PROFILE CREDENTIALS (READ-ONLY) */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-[#01390f]" />
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Staff Identity & Access Info
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Employee Number
                </label>
                <input
                  type="text"
                  value={employeeNo}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  System Role
                </label>
                <input
                  type="text"
                  value={role}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 font-bold cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 font-medium cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500 flex items-start gap-2">
            <span>
              Staff personal records are centrally managed by the System Administrator. To update name or email, please file a request with Admin.
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: SECURITY & PASSWORD CHANGE */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5">
          <form onSubmit={handleOpenConfirmModal} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="w-4 h-4 text-[#01390f]" />
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                Security & Password Management
              </h3>
            </div>

            {/* CURRENT PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className={`w-full bg-slate-50 border rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:bg-white transition-all ${
                    currentPassword && isCurrentPassValid === true
                      ? 'border-emerald-500 focus:border-emerald-600 text-slate-700'
                      : currentPassword && isCurrentPassValid === false
                      ? 'border-rose-300 focus:border-rose-500 text-slate-700'
                      : 'border-slate-200 focus:border-[#01390f] text-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* CURRENT PASSWORD VERIFICATION FEEDBACK */}
              {currentPassword && (
                <div className="mt-1.5">
                  {isCheckingCurrentPass ? (
                    <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <span>Checking current password...</span>
                    </p>
                  ) : isCurrentPassValid === false ? (
                    <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                      <span>Current password does not match</span>
                    </p>
                  ) : isCurrentPassValid === true ? (
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span>Current password verified</span>
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* NEW PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create new password (min. 6 chars)..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* STRENGTH INDICATOR */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Strength:</span>
                    <span className={`font-bold ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 1 ? passwordStrength.bg : 'bg-transparent'
                        }`}
                      style={{ width: '33.3%' }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.bg : 'bg-transparent'
                        }`}
                      style={{ width: '33.3%' }}
                    />
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.bg : 'bg-transparent'
                        }`}
                      style={{ width: '33.3%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* HELPER TEXT AND MATCH VALIDATION STATUS */}
              {confirmPassword && newPassword && (
                <div className="mt-1.5">
                  {confirmPassword !== newPassword ? (
                    <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                      <span>Passwords do not match</span>
                    </p>
                  ) : currentPassword && newPassword === currentPassword ? (
                    <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                      <span>New password must be different from current password</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">

                      <span>Passwords match</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON - DISABLED / GREYED OUT UNTIL ALL CRITERIA MATCH */}
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className={`w-full font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 mt-4 select-none ${isFormValid && !submitting
                ? 'bg-[#01390f] hover:bg-[#012409] text-white shadow-md active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
            >
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>

      {/* CONFIRM PASSWORD CHANGE MODAL (MATCHING LOGOUT MODAL DESIGN) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Confirm Password Change
              </h3>
              <button
                type="button"
                onClick={() => !submitting && setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70 text-emerald-950 flex items-start gap-3">

                <div>
                  <span className="block text-xs font-bold text-[#01390f] uppercase">
                    Account Security Update
                  </span>
                  <p className="text-[11px] text-emerald-900/80 leading-relaxed mt-0.5">
                    You are about to change your account password. Please make sure you remember your new password for your next login.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Are you sure you want to proceed with updating your account password?
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-3 shrink-0 whitespace-nowrap">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={executePasswordChange}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{submitting ? 'Updating...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;

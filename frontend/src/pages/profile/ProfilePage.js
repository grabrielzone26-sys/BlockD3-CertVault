import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import useProfileSettings from '../../hooks/useProfileSettings';
import { THEMES } from '../../contexts/ThemeContext';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const {
    // State
    passwordForm,
    twoFactorEnabled,
    loginHistory,
    profileVisibility,
    certificateVisibility,
    verificationNotifications,
    dataPrivacy,
    language,
    theme,
    textSize,
    loading: settingsLoading,
    error: settingsError,
    success: settingsSuccess,
    
    // Setters
    setPasswordForm,
    
    // Handlers
    handlePasswordChange,
    updateProfileVisibility,
    updateCertificateVisibility,
    toggleVerificationNotifications,
    updateDataPrivacy,
    updateLanguage,
    updateTheme,
    updateTextSize,
    
    // Clear messages
    clearError,
    clearSuccess
  } = useProfileSettings(user?.id);
  
  const [activeTab, setActiveTab] = useState('account');
  const [profileData, setProfileData] = useState({
    email: '',
    username: '',
    profile: {
      fullName: '',
      department: '',
      studentId: '',
      organization: '',
      position: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        username: user.username || '',
        profile: {
          fullName: user.profile?.fullName || '',
          department: user.profile?.department || '',
          studentId: user.profile?.studentId || '',
          organization: user.profile?.organization || '',
          position: user.profile?.position || ''
        }
      });
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    const success = await updateProfile(profileData);
    if (success) {
      setMessage('Profile updated successfully');
    } else {
      setError('Failed to update profile');
    }
    setLoading(false);
  };

  const handleInputChange = (e, section = null) => {
    const { name, value } = e.target;
    if (section === 'profile') {
      setProfileData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [name]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const tabs = [
    { id: 'account', name: 'Account Information' },
    { id: 'security', name: 'Password and Security' },
    { id: 'privacy', name: 'Privacy' },
    { id: 'settings', name: 'Settings' }
  ];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
      <div className="tech-card">
        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto touch-scroll-x scrollbar-none">
          <nav className="flex -mb-px whitespace-nowrap px-2 sm:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 sm:py-4 px-3.5 sm:px-6 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-500 text-primary-600 font-semibold'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Account Information Tab */}
          {activeTab === 'account' && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange(e)}
                    className="input-field mt-1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={profileData.username}
                    onChange={(e) => handleInputChange(e)}
                    className="input-field mt-1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={profileData.profile.fullName}
                    onChange={(e) => handleInputChange(e, 'profile')}
                    className="input-field mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    value={profileData.profile.department}
                    onChange={(e) => handleInputChange(e, 'profile')}
                    className="input-field mt-1"
                  />
                </div>
                
                {user?.role === 'student' && (
                  <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                      Student ID
                    </label>
                    <input
                      id="studentId"
                      name="studentId"
                      type="text"
                      value={profileData.profile.studentId}
                      onChange={(e) => handleInputChange(e, 'profile')}
                      className="input-field mt-1"
                    />
                  </div>
                )}
                
                {user?.role === 'verifier' && (
                  <>
                    <div>
                      <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                        Organization
                      </label>
                      <input
                        id="organization"
                        name="organization"
                        type="text"
                        value={profileData.profile.organization}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        className="input-field mt-1"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                        Position
                      </label>
                      <input
                        id="position"
                        name="position"
                        type="text"
                        value={profileData.profile.position}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        className="input-field mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}



          {/* Password and Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* Password Change Section */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                
                {settingsError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex justify-between items-center">
                    <span>{settingsError}</span>
                    <button onClick={clearError} className="text-red-700 hover:text-red-900">
                      ×
                    </button>
                  </div>
                )}
                
                {settingsSuccess && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex justify-between items-center">
                    <span>{settingsSuccess}</span>
                    <button onClick={clearSuccess} className="text-green-700 hover:text-green-900">
                      ×
                    </button>
                  </div>
                )}
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="input-field mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="input-field mt-1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="input-field mt-1"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={settingsLoading}
                      className="btn-primary"
                    >
                      {settingsLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
              
              {/* Two-Factor Authentication Section */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                  <Link 
                    to="/profile/two-factor" 
                    className="btn-secondary"
                  >
                    Manage 2FA
                  </Link>
                </div>
                <p className="text-sm text-gray-600">
                  {twoFactorEnabled
                    ? 'Two-factor authentication is enabled. You will receive a verification code when logging in.'
                    : 'Enable two-factor authentication to add an extra layer of security to your account.'}
                </p>
                <div className="mt-3 flex items-center">
                  <span className="mr-3 text-sm text-gray-600">Status:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {/* Login History Section */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Login History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loginHistory.map((login, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {login.date ? new Date(login.date).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {login.ip || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {login.status || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-8">
              {/* Profile Visibility Section */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Visibility</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Control who can see your profile information.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="public"
                      checked={profileVisibility === 'public'}
                      onChange={(e) => updateProfileVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Public - Anyone can see your profile</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="private"
                      checked={profileVisibility === 'private'}
                      onChange={(e) => updateProfileVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Private - Only you can see your profile</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="contacts"
                      checked={profileVisibility === 'contacts'}
                      onChange={(e) => updateProfileVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Contacts only - Only your contacts can see your profile</span>
                  </label>
                </div>
              </div>

              {/* Certificate Visibility Section */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Certificate Visibility</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Control who can see your certificates.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="certificateVisibility"
                      value="public"
                      checked={certificateVisibility === 'public'}
                      onChange={(e) => updateCertificateVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Public - Anyone can verify your certificates</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="certificateVisibility"
                      value="private"
                      checked={certificateVisibility === 'private'}
                      onChange={(e) => updateCertificateVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Private - Only you can see your certificates</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="certificateVisibility"
                      value="verified"
                      checked={certificateVisibility === 'verified'}
                      onChange={(e) => updateCertificateVisibility(e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Verified users only - Only verified users can see your certificates</span>
                  </label>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Verification Notifications</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verificationNotifications}
                      onChange={() => toggleVerificationNotifications()}
                      disabled={settingsLoading}
                      className="sr-only peer"
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  Receive notifications when someone verifies your certificates.
                </p>
              </div>

              {/* Data Privacy Settings */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Privacy</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Analytics</h4>
                      <p className="text-sm text-gray-600">Help us improve by sharing anonymous usage data</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dataPrivacy.analytics}
                        onChange={(e) => updateDataPrivacy('analytics', e.target.checked)}
                        disabled={settingsLoading}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Marketing Communications</h4>
                      <p className="text-sm text-gray-600">Receive updates about new features and services</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dataPrivacy.marketing}
                        onChange={(e) => updateDataPrivacy('marketing', e.target.checked)}
                        disabled={settingsLoading}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Language Settings */}
              <div className="glass-panel p-4 rounded-2xl border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
                <select
                  value={language}
                  onChange={(e) => updateLanguage(e.target.value)}
                  disabled={settingsLoading}
                  className="input-field mt-1"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="German">Deutsch</option>
                  <option value="Chinese">中文</option>
                </select>
              </div>

              {/* Theme Presets Settings */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">Visual Theme &amp; Color Palette</h3>
                    <p className="text-xs mt-0.5 text-slate-400">
                      Select between Institutional Sapphire and Cyber Web3 Neon palettes.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-full border w-fit bg-slate-800 text-slate-300 border-slate-700">
                    Active: {THEMES[theme]?.name || 'Institutional Sapphire'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.values(THEMES).map((item) => {
                    const isSelected = (theme === item.id) || (!THEMES[theme] && item.id === 'institutional');
                    const IconComponent = item.id === 'institutional' ? ShieldCheckIcon : SparklesIcon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateTheme(item.id)}
                        disabled={settingsLoading}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-slate-900/90 border-cyan/50 shadow-[0_0_20px_rgba(0,229,255,0.18)] ring-1 ring-cyan/40'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="p-1.5 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  backgroundColor: `${item.primary}18`,
                                  border: `1px solid ${item.primary}35`,
                                }}
                              >
                                <IconComponent className="h-4 w-4" style={{ color: item.primary }} />
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {item.name}
                              </span>
                            </div>

                            {isSelected ? (
                              <span
                                className="flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: `${item.primary}20`,
                                  color: item.primary,
                                  border: `1px solid ${item.primary}50`,
                                }}
                              >
                                <CheckIcon className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                                Select
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] mt-2 line-clamp-2 text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        {/* Palette Swatches */}
                        <div className="flex items-center justify-between pt-2.5 border-t mt-1 border-slate-800/60">
                          <div className="flex items-center gap-1.5">
                            {item.swatches.map((colorHex, idx) => (
                              <span
                                key={idx}
                                className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 shadow-xs flex-shrink-0"
                                style={{ backgroundColor: colorHex }}
                                title={colorHex}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Size Settings */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60">
                <h3 className="text-base font-semibold text-white mb-1">Display Text Size</h3>
                <p className="text-xs text-slate-400 mb-4">Adjust the global interface scaling.</p>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => updateTextSize(false)}
                    disabled={textSize <= 70 || settingsLoading}
                    className="btn-secondary px-4 py-1.5 text-xs font-mono"
                  >
                    A- (Smaller)
                  </button>
                  <span className="text-sm font-mono text-cyan font-semibold">{textSize}%</span>
                  <button
                    type="button"
                    onClick={() => updateTextSize(true)}
                    disabled={textSize >= 150 || settingsLoading}
                    className="btn-secondary px-4 py-1.5 text-xs font-mono"
                  >
                    A+ (Larger)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

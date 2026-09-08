import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store';
import { Camera, X, Check, Sparkles, User, Calendar, Phone, Upload, ShieldCheck } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { PRESET_AVATARS } from '../lib/presetAvatars';
import { compressImage } from '../lib/imageCompressor';
import { UserAvatar } from './UserAvatar';

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteProfileModal({ isOpen, onClose }: CompleteProfileModalProps) {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [dob, setDob] = useState(user?.dob || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
      setPhone(user.phone || user.phoneNumber || '');
      setDob(user.dob || '');
      setGender(user.gender || '');
      setError('');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please choose a valid image file');
        return;
      }
      setIsCompressing(true);
      setError('');
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const rawDataUrl = reader.result as string;
          // Compress avatar to 300x300 JPEG for ultra fast loading and safe DB storage
          const compressed = await compressImage(rawDataUrl, 300, 300);
          setAvatar(compressed);
          setIsCompressing(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Avatar compression error:', err);
        setIsCompressing(false);
      }
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setAvatar(presetUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a display name');
      return;
    }
    if (phone && !isValidPhoneNumber(phone)) {
      setError('Please enter a valid international phone number');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: name.trim(), 
          avatar: avatar || null, 
          phone: phone || '', 
          dob: dob || '', 
          gender: gender || '',
          onboarding_completed: 1,
          onboardingCompleted: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      // Update auth store with onboardingCompleted = true
      updateUser({
        ...data.user,
        onboardingCompleted: true,
        onboarding_completed: 1
      });
      localStorage.setItem('profileModalDismissed', 'true');
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('profileModalDismissed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl my-8 overflow-hidden">
        
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500" />

        <button 
          onClick={handleSkip}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Close or complete later"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome to WatchWDS!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Customize your avatar and details to complete your setup.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs sm:text-sm border border-red-100 dark:border-red-500/20 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          
          {/* Avatar Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Your Avatar
              </span>
              <div className="flex gap-1 bg-slate-200/60 dark:bg-slate-700/60 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'presets' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Sports Presets
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeTab === 'custom' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Upload Photo
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Active Avatar Preview */}
              <div className="relative group shrink-0">
                <UserAvatar
                  src={avatar}
                  name={name || user.name}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-2xl shadow-md border-2 border-yellow-400/40"
                  shape="rounded"
                />
                {isCompressing && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold animate-pulse">Opt...</span>
                  </div>
                )}
              </div>

              {/* Selector content */}
              {activeTab === 'presets' ? (
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = avatar === preset.dataUrl;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.dataUrl)}
                          title={preset.label}
                          className={`relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-transform hover:scale-105 ${
                            isSelected
                              ? 'border-yellow-500 shadow-md ring-2 ring-yellow-400/40'
                              : 'border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={preset.dataUrl} alt={preset.label} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow-sm font-black" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Click a character to set as your avatar</p>
                </div>
              ) : (
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 transition-colors shadow-sm"
                  >
                    <Upload className="w-4 h-4 text-yellow-500" />
                    {isCompressing ? 'Compressing...' : 'Choose from Device'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">JPEG/PNG auto-compressed for lightning speed</p>
                </div>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Display Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Hunter"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number <span className="text-slate-400 lowercase text-[10px]">(Optional)</span>
            </label>
            <div className="react-phone-number-input-custom relative">
              <PhoneInput
                international
                defaultCountry="GB"
                value={phone}
                onChange={(val) => setPhone(val || '')}
                placeholder="Enter phone number"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus-within:ring-2 focus-within:ring-yellow-500 focus-within:border-yellow-500 outline-none transition-all"
              />
            </div>
            <style>{`
              .react-phone-number-input-custom .PhoneInputInput {
                background: transparent;
                border: none;
                outline: none;
                color: inherit;
                width: 100%;
                margin-left: 8px;
                padding: 6px 0;
                font-size: 0.875rem;
              }
              .react-phone-number-input-custom .PhoneInputCountrySelect {
                background: transparent;
                color: inherit;
              }
            `}</style>
          </div>

          {/* DOB & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
              >
                <option value="">Prefer not to specify</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-colors text-center"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isLoading || isCompressing}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-slate-950 font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {isLoading ? 'Saving Setup...' : 'Complete Setup'}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            You can always modify these preferences anytime from your Profile page.
          </p>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, User, Mail, Lock, Phone, Trophy, MapPin, Globe, 
  Tv, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Loader2,
  Calendar, Users, ShieldCheck, Sparkles, HelpCircle, Share2
} from 'lucide-react';

interface DynamicField {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'url';
  placeholder?: string;
  description?: string;
  options?: string[];
  required: boolean;
  step: number;
}

export function PartnerApplication() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{
    applicationId: string;
    clubName: string;
    username: string;
  } | null>(null);

  // Form state
  // Step 1: Account
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Club Details
  const [clubName, setClubName] = useState('');
  const [sportCategory, setSportCategory] = useState('Football / Soccer');
  const [leagueDivision, setLeagueDivision] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');

  // Step 3: Operations, Venue & Dynamic fields
  const [stadiumVenue, setStadiumVenue] = useState('');
  const [stadiumCapacity, setStadiumCapacity] = useState('');
  const [expectedMonthlyMatches, setExpectedMonthlyMatches] = useState('2-4 matches');
  const [description, setDescription] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Step 4: Agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Load dynamic onboarding fields from API
  useEffect(() => {
    fetch('/api/partner/onboarding-fields')
      .then(res => res.json())
      .then(data => {
        if (data.fields && Array.isArray(data.fields)) {
          setDynamicFields(data.fields);
        }
      })
      .catch(err => {
        console.error('Failed to load dynamic onboarding fields:', err);
      })
      .finally(() => {
        setFieldsLoading(false);
      });
  }, []);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [key]: value }));
  };

  const validateStep1 = () => {
    setErrorMessage('');
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please provide both your first and last name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid official email address.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    setErrorMessage('');
    if (!clubName.trim()) {
      setErrorMessage('Please enter your club or organization name.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    setErrorMessage('');
    // Check required dynamic fields for step 3
    const step3Fields = dynamicFields.filter(f => (f.step === 3 || !f.step) && f.required);
    for (const f of step3Fields) {
      const val = customFields[f.fieldKey];
      if (val === undefined || val === null || String(val).trim() === '') {
        setErrorMessage(`Please complete the required field: "${f.label}".`);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setErrorMessage('');
    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setErrorMessage('');
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setErrorMessage('Please accept the Partner Agreement terms to submit your application.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const socialLinks = {
        twitter: twitter.trim(),
        instagram: instagram.trim(),
        youtube: youtube.trim()
      };

      const res = await fetch('/api/partner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          clubName: clubName.trim(),
          sportCategory,
          leagueDivision: leagueDivision.trim(),
          foundedYear: foundedYear.trim(),
          stadiumVenue: stadiumVenue.trim(),
          stadiumCapacity: stadiumCapacity.trim(),
          website: website.trim(),
          socialLinks,
          expectedMonthlyMatches,
          description: description.trim(),
          customFields
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit partner application.');
      }

      setSuccessData({
        applicationId: data.applicationId,
        clubName: data.clubName || clubName,
        username: data.username || 'auto-generated'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting application.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (successData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-extrabold text-xs uppercase tracking-wider mb-4">
            Application Received • Pending Review
          </span>

          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
            Welcome, {successData.clubName}!
          </h1>

          <p className="text-slate-300 text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Your official Partner Club application has been securely submitted and is currently in <strong>Pending</strong> review status.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 max-w-lg mx-auto text-left mb-8 space-y-3.5 text-sm">
            <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-800">
              <span className="text-slate-500">Application Reference:</span>
              <code className="font-mono font-bold text-amber-400">{successData.applicationId}</code>
            </div>
            <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-800">
              <span className="text-slate-500">Official Club:</span>
              <span className="font-semibold text-white">{successData.clubName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-800">
              <span className="text-slate-500">System Username:</span>
              <code className="font-mono text-sky-400">{successData.username}</code>
            </div>
            <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-800">
              <span className="text-slate-500">Registered Email:</span>
              <span className="font-medium text-white">{email}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Review Window:</span>
              <span className="font-bold text-emerald-400">24 – 48 Business Hours</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 max-w-lg mx-auto text-left mb-8">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90 leading-relaxed">
                An automated confirmation email has been dispatched to <strong>{email}</strong> confirming receipt of your application. Once our partner administration team reviews and approves your submission, you will receive an approval email with immediate access to your Partner Club Portal.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all"
            >
              Return to WatchWDS Homepage
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
      {/* Header Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider mb-4">
          <Trophy className="w-3.5 h-3.5" /> Official Partner Club Network
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Join WatchWDS as a <span className="text-amber-500">Partner Club</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Broadcast your matches live to worldwide supporters, sell Pay-Per-View tickets, earn automated revenue splits, and manage your club’s official streaming brand.
        </p>
      </div>

      {/* Multi-step progress bar */}
      <div className="mb-10">
        <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
          {[
            { num: 1, title: 'Account', subtitle: 'Credentials' },
            { num: 2, title: 'Club Profile', subtitle: 'Identity' },
            { num: 3, title: 'Operations', subtitle: 'Broadcast Specs' },
            { num: 4, title: 'Review', subtitle: 'Submit' },
          ].map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div 
                key={s.num} 
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                  isActive 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-sm' 
                    : isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mb-1.5 ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-xs font-bold leading-tight line-clamp-1">{s.title}</span>
                <span className="text-[10px] hidden sm:inline opacity-70">{s.subtitle}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs md:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step Container Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl transition-all">
        <form onSubmit={handleSubmit}>
          {/* STEP 1: ACCOUNT & CONTACT INFO */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-500" /> Primary Contact & Portal Credentials
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1">
                  Enter your official representative details. Your account username will be generated automatically by the platform upon submission.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Ferguson"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Club Contact Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="official@yourclub.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">This will be your login address for the Partner Club Portal.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Portal Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Direct Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+44 7123 456789"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CLUB PROFILE & IDENTITY */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-500" /> Club Profile & Organization Details
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1">
                  Specify your club or sports team identity as it should be displayed to fans on the platform.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Club / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  placeholder="e.g. Manchester United FC or Richmond Titans"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Primary Sport Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={sportCategory}
                    onChange={e => setSportCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  >
                    <option value="Football / Soccer">Football / Soccer</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Rugby">Rugby Union / League</option>
                    <option value="Volleyball">Volleyball</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Ice Hockey">Ice Hockey</option>
                    <option value="Motorsport">Motorsport</option>
                    <option value="Combat Sports">Boxing / MMA</option>
                    <option value="Other">Other Sports</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    League / Division / Tier
                  </label>
                  <input
                    type="text"
                    value={leagueDivision}
                    onChange={e => setLeagueDivision(e.target.value)}
                    placeholder="e.g. National League Tier 2 or Regional Premier"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Year Founded
                  </label>
                  <input
                    type="text"
                    value={foundedYear}
                    onChange={e => setFoundedYear(e.target.value)}
                    placeholder="e.g. 1984"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Website URL
                  </label>
                  <div className="relative">
                    <Globe className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://www.yourclub.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Club Social Media Channels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                      placeholder="@Twitter / X"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                      placeholder="@Instagram"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={youtube}
                      onChange={e => setYoutube(e.target.value)}
                      placeholder="YouTube Channel URL"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: OPERATIONS & EXTENSIBLE ONBOARDING REQUIREMENTS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Tv className="w-5 h-5 text-amber-500" /> Venue & Streaming Operations
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1">
                  Tell us about your home venue and broadcasting setup so we can ensure optimal stream delivery.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Home Stadium / Venue Name
                  </label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={stadiumVenue}
                      onChange={e => setStadiumVenue(e.target.value)}
                      placeholder="e.g. Riverside Memorial Arena"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Facility / Stadium Capacity
                  </label>
                  <div className="relative">
                    <Users className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={stadiumCapacity}
                      onChange={e => setStadiumCapacity(e.target.value)}
                      placeholder="e.g. 3,500 seats"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Expected Monthly Home Matches to Stream
                </label>
                <select
                  value={expectedMonthlyMatches}
                  onChange={e => setExpectedMonthlyMatches(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                >
                  <option value="1 match per month">1 match per month</option>
                  <option value="2-4 matches">2 – 4 matches per month</option>
                  <option value="5-8 matches">5 – 8 matches per month</option>
                  <option value="8+ matches">8+ matches / tournament intensive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Club Background & Broadcasting Goals
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Share details about your supporters, current streaming arrangements, or specific monetization goals..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm resize-none"
                />
              </div>

              {/* DYNAMIC EXTENSIBLE ADMIN-MANAGED ONBOARDING FIELDS */}
              {dynamicFields.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Additional Club Onboarding Requirements
                    </h3>
                  </div>

                  {dynamicFields.map(f => {
                    const value = customFields[f.fieldKey] ?? '';
                    return (
                      <div key={f.id} className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </label>
                        {f.description && (
                          <p className="text-[11px] text-slate-500">{f.description}</p>
                        )}

                        {f.fieldType === 'textarea' ? (
                          <textarea
                            rows={3}
                            required={f.required}
                            value={value}
                            onChange={e => handleCustomFieldChange(f.fieldKey, e.target.value)}
                            placeholder={f.placeholder || ''}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        ) : f.fieldType === 'select' ? (
                          <select
                            required={f.required}
                            value={value}
                            onChange={e => handleCustomFieldChange(f.fieldKey, e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">{f.placeholder || 'Select an option'}</option>
                            {Array.isArray(f.options) && f.options.map((opt, idx) => (
                              <option key={idx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : f.fieldType === 'checkbox' ? (
                          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={e => handleCustomFieldChange(f.fieldKey, e.target.checked)}
                              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700"
                            />
                            <span>{f.placeholder || 'Yes / Confirmed'}</span>
                          </label>
                        ) : (
                          <input
                            type={f.fieldType === 'number' ? 'number' : f.fieldType === 'url' ? 'url' : 'text'}
                            required={f.required}
                            value={value}
                            onChange={e => handleCustomFieldChange(f.fieldKey, e.target.value)}
                            placeholder={f.placeholder || ''}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" /> Review Application & Confirmation
                </h2>
                <p className="text-slate-500 text-xs md:text-sm mt-1">
                  Please review your partner submission details before sending for administrator approval.
                </p>
              </div>

              {/* Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs md:text-sm">
                  <span className="font-extrabold uppercase text-[10px] text-amber-500 tracking-wider">Contact & Credentials</span>
                  <div>
                    <span className="text-slate-400 block">Representative:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{firstName} {lastName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Login Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone:</span>
                    <span className="text-slate-700 dark:text-slate-300">{phone || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">System Username:</span>
                    <span className="italic text-slate-500 text-xs">Generated automatically upon submission</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs md:text-sm">
                  <span className="font-extrabold uppercase text-[10px] text-amber-500 tracking-wider">Club Profile</span>
                  <div>
                    <span className="text-slate-400 block">Club Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{clubName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sport & Division:</span>
                    <span className="text-slate-700 dark:text-slate-300">{sportCategory} {leagueDivision ? `• ${leagueDivision}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Venue / Capacity:</span>
                    <span className="text-slate-700 dark:text-slate-300">{stadiumVenue || 'Not specified'} {stadiumCapacity ? `(${stadiumCapacity})` : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Expected Broadcasts:</span>
                    <span className="text-slate-700 dark:text-slate-300">{expectedMonthlyMatches}</span>
                  </div>
                </div>
              </div>

              {/* Terms and conditions check */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700 mt-0.5"
                  />
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
                      I acknowledge and submit this official Partner Club application
                    </span>
                    I confirm that I am an authorized representative of <strong>{clubName || 'this club'}</strong> and agree that our application will be placed in <strong>Pending Review</strong> status until verified by WatchWDS administrators. I understand that upon approval, our club portal will be activated and governed by the standard revenue sharing policy.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Already have an account? Log In
              </Link>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs md:text-sm transition-all shadow-lg shadow-amber-500/20"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !agreedToTerms}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Helpful FAQ / Trust Footer */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
          <ShieldCheck className="w-6 h-6 text-amber-500 mb-2 mx-auto md:mx-0" />
          <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">Direct Revenue Settlements</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Automated Stripe Connect transfers sent directly to your official club bank account on matchday.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
          <Tv className="w-6 h-6 text-amber-500 mb-2 mx-auto md:mx-0" />
          <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">Standard RTMP Stream Delivery</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Broadcast easily via OBS, vMix, Tricaster, or hardware encoders with ultra low-latency playback.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
          <Users className="w-6 h-6 text-amber-500 mb-2 mx-auto md:mx-0" />
          <h4 className="font-bold text-slate-900 dark:text-white text-xs mb-1">Dedicated Supporter Hub</h4>
          <p className="text-[11px] text-slate-500 leading-normal">
            Your club page features team branding, schedule, match ticket PPVs, and supporter engagement tools.
          </p>
        </div>
      </div>
    </div>
  );
}

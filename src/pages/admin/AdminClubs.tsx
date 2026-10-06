import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Plus, Edit3, Trash2, Save, X, CheckCircle, XCircle, 
  DollarSign, Link as LinkIcon, Mail, Loader2, Percent, Shield,
  ExternalLink, AlertCircle, Image as ImageIcon, Key, Lock, Copy, Check, RefreshCw,
  Search, Eye, Clock, FileText, Sparkles, Filter, CheckCircle2, ChevronRight,
  Phone, Globe, Trophy, MapPin, Users, UserCheck, ShieldCheck, Sliders
} from 'lucide-react';
import { MediaPickerModal } from '../../components/MediaPickerModal';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  contactEmail: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean | number;
  isActive: boolean | number;
  is_active?: boolean | number;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean | number;
  contact_email?: string | null;
}

interface RevenuePolicy {
  id: string;
  clubId: string;
  club_id?: string;
  platformFeePercent: number;
  platform_fee_percent?: number;
  clubSharePercent: number;
  club_share_percent?: number;
  isActive: boolean | number;
  is_active?: boolean | number;
}

interface PartnerApplicationItem {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  contactEmail?: string;
  phone?: string;
  contactPhone?: string;
  username?: string;
  clubName: string;
  clubSlug?: string;
  sportCategory?: string;
  leagueDivision?: string;
  league?: string;
  venue?: string;
  capacity?: string | number;
  city?: string;
  country?: string;
  foundedYear?: string;
  stadiumVenue?: string;
  stadiumCapacity?: string;
  website?: string;
  websiteUrl?: string;
  socialLinks?: any;
  expectedMonthlyMatches?: string;
  description?: string;
  customFields?: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedClubId?: string;
  clubId?: string;
  createdAt: string;
  updatedAt: string;
  userAccount?: any;
  clubAccount?: any;
}

interface DynamicFieldItem {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'url';
  placeholder?: string;
  description?: string;
  options?: string[];
  required: boolean;
  step: number;
  orderIndex: number;
  isActive: boolean;
}

export function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [policies, setPolicies] = useState<RevenuePolicy[]>([]);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Partner credentials management state
  const [credentialsClub, setCredentialsClub] = useState<Club | null>(null);
  const [credentialsStatus, setCredentialsStatus] = useState<{ hasAccount: boolean; email: string; user: any } | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsPassword, setCredentialsPassword] = useState('');
  const [credentialsSendEmail, setCredentialsSendEmail] = useState(true);
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const openCredentialsModal = async (club: Club) => {
    setCredentialsClub(club);
    setCredentialsPassword('');
    setCredentialsMessage(null);
    setCredentialsLoading(true);
    setCopiedPass(false);
    try {
      const res = await fetch(`/api/admin/clubs/${club.id}/credentials-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCredentialsStatus(data);
      }
    } catch (err) {
      console.error('Error fetching credentials status:', err);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentialsClub || !credentialsPassword) return;
    if (credentialsPassword.length < 6) {
      setCredentialsMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    setCredentialsSaving(true);
    setCredentialsMessage(null);
    try {
      const res = await fetch(`/api/admin/clubs/${credentialsClub.id}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          password: credentialsPassword,
          sendEmail: credentialsSendEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentialsMessage({ text: data.message || 'Credentials set successfully!', type: 'success' });
        // Refresh status
        const statusRes = await fetch(`/api/admin/clubs/${credentialsClub.id}/credentials-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statusRes.ok) setCredentialsStatus(await statusRes.json());
      } else {
        setCredentialsMessage({ text: data.error || 'Failed to set credentials', type: 'error' });
      }
    } catch (err: any) {
      setCredentialsMessage({ text: err.message || 'Error setting credentials', type: 'error' });
    } finally {
      setCredentialsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!credentialsClub) return;
    if (!confirm(`Generate a temporary password and update credentials for ${credentialsClub.name}?`)) return;
    setCredentialsSaving(true);
    setCredentialsMessage(null);
    try {
      const res = await fetch(`/api/admin/clubs/${credentialsClub.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentialsPassword(data.tempPassword || '');
        setCredentialsMessage({ text: data.message || 'Temporary password generated!', type: 'success' });
        const statusRes = await fetch(`/api/admin/clubs/${credentialsClub.id}/credentials-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statusRes.ok) setCredentialsStatus(await statusRes.json());
      } else {
        setCredentialsMessage({ text: data.error || 'Failed to reset password', type: 'error' });
      }
    } catch (err: any) {
      setCredentialsMessage({ text: err.message || 'Error resetting password', type: 'error' });
    } finally {
      setCredentialsSaving(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCredentialsPassword(pass);
  };

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formStripeId, setFormStripeId] = useState('');
  const [formStripeComplete, setFormStripeComplete] = useState(false);
  const [formActive, setFormActive] = useState(true);
  const [formPlatformFee, setFormPlatformFee] = useState(20);
  const [formClubShare, setFormClubShare] = useState(80);

  const token = localStorage.getItem('token');

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const [clubsRes, policiesRes, balancesRes] = await Promise.all([
        fetch('/api/admin/clubs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/revenue-policies', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/club-balances', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (clubsRes.ok) {
        const data = await clubsRes.json();
        setClubs(Array.isArray(data) ? data : []);
      }
      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(Array.isArray(data) ? data : []);
      }
      if (balancesRes.ok) {
        const bData = await balancesRes.json();
        const bMap: Record<string, any> = {};
        if (Array.isArray(bData)) {
          bData.forEach((b: any) => { bMap[b.clubId] = b; });
        }
        setBalances(bMap);
      }
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
  const [mainTab, setMainTab] = useState<'clubs' | 'applications' | 'fields'>('clubs');

  // Applications management state
  const [applications, setApplications] = useState<PartnerApplicationItem[]>([]);
  const [appStats, setAppStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [appSearch, setAppSearch] = useState('');
  const [appLoading, setAppLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplicationItem | null>(null);
  const [approvingApp, setApprovingApp] = useState<PartnerApplicationItem | null>(null);
  const [rejectingApp, setRejectingApp] = useState<PartnerApplicationItem | null>(null);
  const [approvePlatformFee, setApprovePlatformFee] = useState(20);
  const [approveClubShare, setApproveClubShare] = useState(80);
  const [approveNotes, setApproveNotes] = useState('');
  const [approveSendEmail, setApproveSendEmail] = useState(true);
  const [rejectReason, setRejectReason] = useState('Incomplete broadcast verification or unverified organizational identity.');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSendEmail, setRejectSendEmail] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic Fields state
  const [onboardingFields, setOnboardingFields] = useState<DynamicFieldItem[]>([]);
  const [editingField, setEditingField] = useState<DynamicFieldItem | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [fieldFormKey, setFieldFormKey] = useState('');
  const [fieldFormLabel, setFieldFormLabel] = useState('');
  const [fieldFormType, setFieldFormType] = useState('text');
  const [fieldFormPlaceholder, setFieldFormPlaceholder] = useState('');
  const [fieldFormDescription, setFieldFormDescription] = useState('');
  const [fieldFormOptions, setFieldFormOptions] = useState('');
  const [fieldFormRequired, setFieldFormRequired] = useState(false);
  const [fieldFormStep, setFieldFormStep] = useState(3);
  const [fieldFormOrder, setFieldFormOrder] = useState(0);
  const [fieldFormActive, setFieldFormActive] = useState(true);
  const [fieldSaving, setFieldSaving] = useState(false);

  const fetchApplications = async () => {
    setAppLoading(true);
    try {
      const res = await fetch(`/api/admin/partner-applications?status=${appFilter}&search=${encodeURIComponent(appSearch)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        if (data.stats) setAppStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch partner applications:', err);
    } finally {
      setAppLoading(false);
    }
  };

  const fetchOnboardingFields = async () => {
    try {
      const res = await fetch('/api/admin/partner-onboarding-fields', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingFields(data.fields || []);
      }
    } catch (err) {
      console.error('Failed to fetch onboarding fields:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'applications') setMainTab('applications');
    else if (tabParam === 'fields') setMainTab('fields');
    else if (tabParam === 'clubs') setMainTab('clubs');
  }, [location.search]);

  useEffect(() => {
    fetchClubs();
    fetchApplications();
    fetchOnboardingFields();
  }, []);

  useEffect(() => {
    if (mainTab === 'applications') {
      fetchApplications();
    }
  }, [mainTab, appFilter]);

  const handleApproveApplication = async () => {
    if (!approvingApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/partner-applications/${approvingApp.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          platformFeePercent: approvePlatformFee,
          clubSharePercent: approveClubShare,
          adminNotes: approveNotes,
          sendEmail: approveSendEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovingApp(null);
        setSelectedApplication(null);
        fetchApplications();
        fetchClubs();
      } else {
        alert(data.error || 'Failed to approve application');
      }
    } catch (err: any) {
      alert(err.message || 'Error approving application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!rejectingApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/partner-applications/${rejectingApp.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: rejectReason,
          adminNotes: rejectNotes,
          sendEmail: rejectSendEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRejectingApp(null);
        setSelectedApplication(null);
        fetchApplications();
      } else {
        alert(data.error || 'Failed to reject application');
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting application');
    } finally {
      setActionLoading(false);
    }
  };

  const openFieldModal = (field?: DynamicFieldItem) => {
    if (field) {
      setEditingField(field);
      setFieldFormKey(field.fieldKey);
      setFieldFormLabel(field.label);
      setFieldFormType(field.fieldType);
      setFieldFormPlaceholder(field.placeholder || '');
      setFieldFormDescription(field.description || '');
      setFieldFormOptions(Array.isArray(field.options) ? field.options.join('\n') : '');
      setFieldFormRequired(field.required);
      setFieldFormStep(field.step || 3);
      setFieldFormOrder(field.orderIndex || 0);
      setFieldFormActive(field.isActive);
    } else {
      setEditingField(null);
      setFieldFormKey('');
      setFieldFormLabel('');
      setFieldFormType('text');
      setFieldFormPlaceholder('');
      setFieldFormDescription('');
      setFieldFormOptions('');
      setFieldFormRequired(false);
      setFieldFormStep(3);
      setFieldFormOrder(onboardingFields.length + 1);
      setFieldFormActive(true);
    }
    setShowFieldModal(true);
  };

  const handleSaveField = async () => {
    if (!fieldFormKey.trim() || !fieldFormLabel.trim()) {
      alert('Field Key and Label are required');
      return;
    }
    setFieldSaving(true);
    try {
      const parsedOptions = fieldFormType === 'select' 
        ? fieldFormOptions.split('\n').map(s => s.trim()).filter(Boolean)
        : null;

      const res = await fetch('/api/admin/partner-onboarding-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingField?.id,
          fieldKey: fieldFormKey.trim(),
          label: fieldFormLabel.trim(),
          fieldType: fieldFormType,
          placeholder: fieldFormPlaceholder.trim(),
          description: fieldFormDescription.trim(),
          options: parsedOptions,
          required: fieldFormRequired,
          step: fieldFormStep,
          orderIndex: fieldFormOrder,
          isActive: fieldFormActive
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowFieldModal(false);
        fetchOnboardingFields();
      } else {
        alert(data.error || 'Failed to save field');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving field');
    } finally {
      setFieldSaving(false);
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom onboarding field?')) return;
    try {
      const res = await fetch(`/api/admin/partner-onboarding-fields/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOnboardingFields();
      }
    } catch (err) {
      console.error('Failed to delete onboarding field:', err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormLogo('');
    setFormStripeId('');
    setFormStripeComplete(false);
    setFormActive(true);
    setFormPlatformFee(20);
    setFormClubShare(80);
    setEditingClub(null);
    setShowForm(false);
  };

  const openEditForm = (club: Club) => {
    setEditingClub(club);
    setFormName(club.name || '');
    setFormEmail(club.contactEmail || club.contact_email || '');
    setFormLogo(club.logo || '');
    setFormStripeId(club.stripeAccountId || club.stripe_account_id || '');
    setFormStripeComplete(!!(club.stripeOnboardingComplete || club.stripe_onboarding_complete));
    setFormActive(!!(club.isActive ?? club.is_active ?? true));

    const policy = policies.find(p => String(p.clubId || p.club_id) === String(club.id));
    if (policy) {
      setFormPlatformFee(Number(policy.platformFeePercent || policy.platform_fee_percent || 20));
      setFormClubShare(Number(policy.clubSharePercent || policy.club_share_percent || 80));
    } else {
      setFormPlatformFee(20);
      setFormClubShare(80);
    }
    setShowForm(true);
  };

  const handlePlatformFeeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setFormPlatformFee(clamped);
    setFormClubShare(100 - clamped);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingClub) {
        // Update club
        await fetch(`/api/admin/clubs/${editingClub.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: formName,
            contactEmail: formEmail,
            logo: formLogo,
            stripeAccountId: formStripeId,
            stripeOnboardingComplete: formStripeComplete,
            isActive: formActive,
            platformFeePercent: formPlatformFee,
            clubSharePercent: formClubShare,
          })
        });
        // Update or create revenue policy
        const policy = policies.find(p => String(p.clubId || p.club_id) === String(editingClub.id));
        if (policy) {
          await fetch(`/api/admin/revenue-policies/${policy.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              platformFeePercent: formPlatformFee,
              clubSharePercent: formClubShare,
            })
          });
        } else {
          await fetch('/api/admin/revenue-policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              clubId: editingClub.id,
              platformFeePercent: formPlatformFee,
              clubSharePercent: formClubShare,
            })
          });
        }
      } else {
        // Create new club (policy auto-created server-side)
        await fetch('/api/admin/clubs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: formName,
            contactEmail: formEmail,
            logo: formLogo,
            stripeAccountId: formStripeId,
            stripeOnboardingComplete: formStripeComplete,
            isActive: formActive,
            platformFeePercent: formPlatformFee,
            clubSharePercent: formClubShare,
          })
        });
      }
      resetForm();
      await fetchClubs();
    } catch (err) {
      console.error('Failed to save club:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this club and its revenue policy?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/clubs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchClubs();
    } catch (err) {
      console.error('Failed to delete club:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getClubPolicy = (clubId: string): RevenuePolicy | undefined => {
    return policies.find(p => String(p.clubId || p.club_id) === String(clubId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            Partner Clubs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage partner clubs, Stripe Connected Accounts, and PPV revenue splits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/finance"
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <DollarSign className="w-4 h-4" />
            Finance & Payouts
          </Link>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Club
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setMainTab('clubs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'clubs'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Active Partner Clubs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-700">
            {clubs.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('applications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all relative ${
            mainTab === 'applications'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Partner Applications</span>
          {appStats.pending > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
              {appStats.pending} Pending
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-700">
              {appStats.total}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('fields')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'fields'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Onboarding Form Fields</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 dark:bg-slate-700">
            {onboardingFields.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ACTIVE CLUBS */}
      {mainTab === 'clubs' && (
        <div className="space-y-8">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 rounded-xl p-5 border border-violet-200 dark:border-violet-500/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-violet-900 dark:text-violet-300">How Revenue Splits Work</h4>
            <p className="text-xs text-violet-700 dark:text-violet-400 mt-1 leading-relaxed">
              When a PPV match is assigned to a club, the payment is routed via Stripe Connect. The <strong>Platform Fee</strong> is kept by WatchWDS,
              and the <strong>Club Share</strong> is automatically transferred to the club's Stripe Connected Account. Both values must total 100%.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {editingClub ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingClub ? 'Edit Club' : 'New Partner Club'}
            </h3>
            <button onClick={resetForm} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Club Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Grassroots FC"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                />
              </div>
              {/* Contact Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Contact Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="club@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                </div>
              </div>
              {/* Logo Selection (Platform Media System) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Club Logo
                </label>
                <div className="flex items-center gap-3">
                  {/* Logo Preview */}
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {formLogo ? (
                      <img src={formLogo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="url"
                          value={formLogo}
                          onChange={(e) => setFormLogo(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="bg-violet-100 hover:bg-violet-200 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 text-violet-700 dark:text-violet-300 font-bold px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Pick / Upload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Stripe Connected Account ID */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Stripe Connected Account ID
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formStripeId}
                    onChange={(e) => setFormStripeId(e.target.value)}
                    placeholder="acct_XXXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Revenue Split */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-violet-500" />
                Revenue Split Configuration
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formPlatformFee}
                    onChange={(e) => handlePlatformFeeChange(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Retained by WatchWDS</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Club Share (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formClubShare}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-white transition-colors cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Transferred to club's Stripe account</p>
                </div>
              </div>
              {/* Visual Split Bar */}
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300 rounded-l-full"
                  style={{ width: `${formPlatformFee}%` }}
                />
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300 rounded-r-full"
                  style={{ width: `${formClubShare}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-violet-600 dark:text-violet-400">Platform: {formPlatformFee}%</span>
                <span className="text-emerald-600 dark:text-emerald-400">Club: {formClubShare}%</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formStripeComplete}
                    onChange={(e) => setFormStripeComplete(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-500" />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Stripe Onboarding Complete</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500" />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Active</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingClub ? 'Update Club' : 'Create Club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clubs List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Partner Clubs Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Add your first partner club to enable PPV revenue splitting.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Club
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {clubs.map(club => {
            const policy = getClubPolicy(club.id);
            const active = !!(club.isActive ?? club.is_active ?? true);
            const stripeId = club.stripeAccountId || club.stripe_account_id;
            const stripeOk = !!(club.stripeOnboardingComplete || club.stripe_onboarding_complete);
            const platformFee = policy ? Number(policy.platformFeePercent || policy.platform_fee_percent || 20) : 20;
            const clubShare = policy ? Number(policy.clubSharePercent || policy.club_share_percent || 80) : 80;

            return (
              <div
                key={club.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all hover:shadow-md ${
                  active ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-500/30 opacity-70'
                }`}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden border border-violet-200 dark:border-violet-500/30">
                    {club.logo ? (
                      <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-6 h-6 text-violet-500" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{club.name}</h3>
                      {active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Inactive</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {(club.contactEmail || club.contact_email) && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {club.contactEmail || club.contact_email}
                        </span>
                      )}
                      {stripeId ? (
                        <span className="flex items-center gap-1 font-mono">
                          {stripeOk ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )}
                          {stripeId.substring(0, 20)}{stripeId.length > 20 ? '...' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertCircle className="w-3 h-3" /> No Stripe account
                        </span>
                      )}
                    </div>

                    {/* Action buttons: Stripe Onboarding + Partner Login Credentials */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/clubs/${club.id}/onboarding-link`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (data.url) {
                              window.open(data.url, '_blank');
                            } else {
                              alert(data.error || 'Failed to generate Stripe onboarding link');
                            }
                          } catch (err: any) {
                            alert(err.message || 'Error generating onboarding link');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {stripeId ? 'Resume Stripe Onboarding' : 'Start Stripe Express Onboarding'}
                      </button>

                      <button
                        onClick={() => openCredentialsModal(club)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors border border-amber-200 dark:border-amber-500/30"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Partner Login Credentials
                      </button>
                    </div>

                    {/* Revenue Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex max-w-xs">
                        <div className="bg-violet-500 rounded-l-full" style={{ width: `${platformFee}%` }} />
                        <div className="bg-emerald-500 rounded-r-full" style={{ width: `${clubShare}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        Platform {platformFee}% / Club {clubShare}%
                      </span>
                    </div>

                    {/* Club Balance & Payout Status */}
                    {balances[club.id] && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Available Balance:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            £{(Number(balances[club.id].availableBalance) || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Pending:</span>
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            £{(Number(balances[club.id].pendingBalance) || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Total Paid:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            £{(Number(balances[club.id].totalPaidOut) || 0).toFixed(2)}
                          </span>
                        </div>
                        <Link
                          to="/admin/finance"
                          className="text-violet-600 dark:text-violet-400 font-bold hover:underline ml-auto flex items-center gap-1 text-[11px]"
                        >
                          Payout Engine &rarr;
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditForm(club)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(club.id)}
                      disabled={deletingId === club.id}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {deletingId === club.id ? (
                        <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      {/* TAB 2: PARTNER APPLICATIONS */}
      {mainTab === 'applications' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Submissions</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">{appStats.total}</span>
            </div>
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider block">Pending Review</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              </div>
              <span className="text-2xl font-black text-amber-500">{appStats.pending}</span>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm">
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider block mb-1">Approved & Active</span>
              <span className="text-2xl font-black text-emerald-500">{appStats.approved}</span>
            </div>
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 shadow-sm">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider block mb-1">Rejected</span>
              <span className="text-2xl font-black text-red-500">{appStats.rejected}</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setAppFilter(f)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                    appFilter === f
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f === 'all' ? 'All Applications' : f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={e => setAppSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') fetchApplications(); }}
                  placeholder="Search club, applicant, email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs dark:text-white outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                onClick={fetchApplications}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${appLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Applications Table / Cards */}
          {appLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
              <p className="text-sm text-slate-400">Loading partner applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Applications Found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No club applications match the selected filter. Public applications submitted at /partner/apply will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {app.clubName}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        app.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          : app.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                      }`}>
                        {app.status}
                      </span>
                      {app.sportCategory && (
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                          {app.sportCategory}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="text-slate-400">Contact:</span> <strong className="text-slate-700 dark:text-slate-300">{app.firstName} {app.lastName}</strong>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400">Email:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{app.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Submitted:</span> <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review Details
                    </button>

                    {app.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setApprovingApp(app);
                            setApprovePlatformFee(20);
                            setApproveClubShare(80);
                            setApproveNotes('');
                            setApproveSendEmail(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingApp(app);
                            setRejectReason('Incomplete broadcast verification or unverified organizational identity.');
                            setRejectNotes('');
                            setRejectSendEmail(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DYNAMIC ONBOARDING FIELDS BUILDER */}
      {mainTab === 'fields' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Dynamic Onboarding Requirements
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Add, customize, or disable requirements asked during the multi-step public onboarding wizard. Fields are automatically integrated without rebuilding the registration codebase.
              </p>
            </div>
            <button
              onClick={() => openFieldModal()}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/20 flex items-center gap-2 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Custom Requirement
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Field Key</th>
                    <th className="py-3 px-4">Display Label</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Step</th>
                    <th className="py-3 px-4">Required</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                  {onboardingFields.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{f.orderIndex}</td>
                      <td className="py-3 px-4 font-mono text-violet-600 dark:text-violet-400">{f.fieldKey}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{f.label}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase">
                          {f.fieldType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">Step {f.step || 3}</td>
                      <td className="py-3 px-4">
                        {f.required ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-bold text-[10px]">Required</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px]">Optional</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {f.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openFieldModal(f)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => setFormLogo(url)}
        title="Select Partner Club Logo"
      />

      {/* Partner Club Credentials Modal */}
      {credentialsClub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setCredentialsClub(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Partner Club Credentials</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{credentialsClub.name}</p>
              </div>
            </div>

            {credentialsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500">Loading partner account info...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Account Status Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Assigned Email:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {credentialsClub.contactEmail || credentialsClub.contact_email || 'No email assigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Account Status:</span>
                    {credentialsStatus?.hasAccount ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Active Partner Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3.5 h-3.5" /> No Account Created Yet
                      </span>
                    )}
                  </div>
                </div>

                {credentialsMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      credentialsMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                    }`}
                  >
                    {credentialsMessage.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{credentialsMessage.text}</span>
                  </div>
                )}

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Login Password</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Generate Random
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={credentialsPassword}
                      onChange={(e) => setCredentialsPassword(e.target.value)}
                      placeholder="Enter minimum 6-character password"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {credentialsPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(credentialsPassword);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                        title="Copy Password"
                      >
                        {copiedPass ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Send Email Checkbox */}
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={credentialsSendEmail}
                    onChange={(e) => setCredentialsSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Email login credentials and instructions to <strong>{credentialsClub.contactEmail || credentialsClub.contact_email}</strong></span>
                </label>

                {/* Action buttons */}
                <div className="pt-3 flex flex-col gap-2">
                  <button
                    onClick={handleSaveCredentials}
                    disabled={credentialsSaving || !credentialsPassword || !(credentialsClub.contactEmail || credentialsClub.contact_email)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {credentialsSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    {credentialsStatus?.hasAccount ? 'Update & Save Credentials' : 'Create Partner Account'}
                  </button>

                  {credentialsStatus?.hasAccount && (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={credentialsSaving}
                      className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate Temporary Reset Password & Email
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: VIEW & REVIEW PARTNER APPLICATION
          ========================================================================= */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-xl">
                  {selectedApplication.clubName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedApplication.clubName}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      selectedApplication.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : selectedApplication.status === 'rejected'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {selectedApplication.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Application ID: #{selectedApplication.id} • Submitted {new Date(selectedApplication.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplication(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Applicant & Account Info */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-violet-500" /> Primary Applicant & Account
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Contact Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedApplication.firstName} {selectedApplication.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Contact Email</span>
                    <a href={`mailto:${selectedApplication.contactEmail || selectedApplication.email}`} className="font-semibold text-violet-500 hover:underline">
                      {selectedApplication.contactEmail || selectedApplication.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Phone Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedApplication.contactPhone || selectedApplication.phone || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">System Username</span>
                    <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700/60 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      @{selectedApplication.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">User Account ID</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedApplication.userId ? `User #${selectedApplication.userId}` : 'Pending assignment'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Club & League Specifications */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Club & Organizational Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Club Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedApplication.clubName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Sport Category</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedApplication.sportCategory || 'General / Multi-Sport'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">League / Association</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedApplication.league || 'Independent'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Venue / Home Stadium</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedApplication.venue || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Venue Capacity</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {selectedApplication.capacity ? selectedApplication.capacity.toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Location (City, Country)</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {[selectedApplication.city, selectedApplication.country].filter(Boolean).join(', ') || 'Not specified'}
                    </span>
                  </div>
                </div>

                {selectedApplication.description && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Club Overview & Bio</span>
                    <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800">
                      {selectedApplication.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Digital Presence & Social Links */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-500" /> Digital Presence & Channels
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Official Website</span>
                    {(selectedApplication.websiteUrl || selectedApplication.website) ? (
                      <a href={selectedApplication.websiteUrl || selectedApplication.website} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline flex items-center gap-1 font-medium text-xs break-all">
                        {selectedApplication.websiteUrl || selectedApplication.website} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">None provided</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">Social Media Links</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 break-all">
                      {typeof selectedApplication.socialLinks === 'object' 
                        ? JSON.stringify(selectedApplication.socialLinks)
                        : String(selectedApplication.socialLinks || 'None provided')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Onboarding Requirements */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" /> Dynamic Onboarding Responses
                </h3>
                {selectedApplication.customFields && Object.keys(selectedApplication.customFields).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedApplication.customFields).map(([k, val]: [string, any]) => {
                      const fieldDef = onboardingFields.find(f => f.fieldKey === k);
                      const displayLabel = fieldDef ? fieldDef.label : k.replace(/_/g, ' ');
                      return (
                        <div key={k} className="bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block capitalize font-medium">{displayLabel}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words mt-0.5 block">
                            {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || 'N/A')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No extra custom fields submitted with this application.</p>
                )}
              </div>

              {/* Review History / Notes if already reviewed */}
              {(selectedApplication.reviewedAt || selectedApplication.adminNotes || selectedApplication.rejectionReason) && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2 text-sm">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Review Audit Trail</h3>
                  {selectedApplication.reviewedAt && (
                    <p className="text-xs text-slate-500">
                      Reviewed on: <strong className="text-slate-700 dark:text-slate-300">{new Date(selectedApplication.reviewedAt).toLocaleString()}</strong>
                    </p>
                  )}
                  {selectedApplication.rejectionReason && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                      <strong>Rejection Reason:</strong> {selectedApplication.rejectionReason}
                    </div>
                  )}
                  {selectedApplication.adminNotes && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <strong>Admin Notes:</strong> {selectedApplication.adminNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                onClick={() => setSelectedApplication(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                {selectedApplication.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setRejectingApp(selectedApplication)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold rounded-xl text-sm border border-rose-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject Application
                    </button>
                    <button
                      onClick={() => setApprovingApp(selectedApplication)}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve & Activate Partner
                    </button>
                  </>
                )}
                {selectedApplication.status === 'approved' && (selectedApplication.clubId || selectedApplication.approvedClubId) && (
                  <button
                    onClick={() => {
                      const targetId = selectedApplication.clubId || selectedApplication.approvedClubId;
                      const club = clubs.find(c => String(c.id) === String(targetId));
                      setSelectedApplication(null);
                      setMainTab('clubs');
                      if (club) setEditingClub(club);
                    }}
                    className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 border border-violet-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" /> View Partner Club Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: APPROVE PARTNER APPLICATION CONFIRMATION & SETUP
          ========================================================================= */}
      {approvingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Approve Partner Application</h3>
                  <p className="text-xs text-slate-500">{approvingApp.clubName}</p>
                </div>
              </div>
              <button
                onClick={() => setApprovingApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
              Approving this application will automatically create an official Partner Club entity, set up their dedicated revenue policy & balance account, activate their user login credentials as a Partner, and optionally dispatch an approval email with login access details.
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Club Share (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={approveClubShare}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setApproveClubShare(v);
                      setApprovePlatformFee(100 - v);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Platform Fee (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={approvePlatformFee}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setApprovePlatformFee(v);
                      setApproveClubShare(100 - v);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Internal Admin Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Verified official federation credentials, premier division partner..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={approveSendEmail}
                  onChange={(e) => setApproveSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Send official approval email with Partner Portal login link to <strong>{approvingApp.contactEmail || approvingApp.email}</strong>
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setApprovingApp(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveApplication}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Approval & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: REJECT PARTNER APPLICATION
          ========================================================================= */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Reject Partner Application</h3>
                  <p className="text-xs text-slate-500">{rejectingApp.clubName}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingApp(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Rejecting this application will mark it as rejected and deactivate the pending applicant account.
            </p>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Rejection (Included in notification email)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why the application could not be approved at this time..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Internal Admin Notes
                </label>
                <input
                  type="text"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Internal audit remarks..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rejectSendEmail}
                  onChange={(e) => setRejectSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Send notification email explaining status to <strong>{rejectingApp.contactEmail || rejectingApp.email}</strong>
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setRejectingApp(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectApplication}
                disabled={actionLoading}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CREATE / EDIT ONBOARDING FIELD BUILDER
          ========================================================================= */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingField ? 'Edit Dynamic Requirement' : 'Add New Onboarding Field'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure partner application question</p>
                </div>
              </div>
              <button
                onClick={() => setShowFieldModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Field Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fieldFormKey}
                    onChange={(e) => setFieldFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. streaming_quality"
                    disabled={!!editingField}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Unique identifier (snake_case)</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Input Type
                  </label>
                  <select
                    value={fieldFormType}
                    onChange={(e) => setFieldFormType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="textarea">Textarea (Multi-line)</option>
                    <option value="select">Dropdown Select</option>
                    <option value="number">Numeric</option>
                    <option value="checkbox">Checkbox (Yes/No)</option>
                    <option value="url">URL Link</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Field Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldFormLabel}
                  onChange={(e) => setFieldFormLabel(e.target.value)}
                  placeholder="e.g. Broadcast Camera Setup & Resolution"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {fieldFormType === 'select' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Dropdown Options (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={fieldFormOptions}
                    onChange={(e) => setFieldFormOptions(e.target.value)}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Placeholder / Input Hint
                </label>
                <input
                  type="text"
                  value={fieldFormPlaceholder}
                  onChange={(e) => setFieldFormPlaceholder(e.target.value)}
                  placeholder="e.g. 1080p60 multi-camera setup"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Helper Description
                </label>
                <input
                  type="text"
                  value={fieldFormDescription}
                  onChange={(e) => setFieldFormDescription(e.target.value)}
                  placeholder="Brief explanatory note shown under the field"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Wizard Step
                  </label>
                  <select
                    value={fieldFormStep}
                    onChange={(e) => setFieldFormStep(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={2}>Step 2: Club & Organization</option>
                    <option value={3}>Step 3: Broadcast & Digital Operations</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={fieldFormOrder}
                    onChange={(e) => setFieldFormOrder(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldFormRequired}
                    onChange={(e) => setFieldFormRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Mandatory / Required Field</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldFormActive}
                    onChange={(e) => setFieldFormActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Active (Visible in Form)</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowFieldModal(false)}
                disabled={fieldSaving}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                disabled={fieldSaving}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {fieldSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingField ? 'Save Changes' : 'Create Requirement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

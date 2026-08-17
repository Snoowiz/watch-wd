import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store';
import { 
  Mail, Settings, FileText, Check, AlertCircle, Save, Send, 
  RefreshCw, Lock as LockIcon, User as UserIcon, Globe, Info,
  Trash2, Copy, Eye, Code, Layers, Sparkles, TrendingUp, BarChart2,
  Plus, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Paintbrush, Image as ImageIcon
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { MediaPickerModal } from '../../components/MediaPickerModal';

interface EmailBranding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  button_style: 'rounded-sm' | 'rounded-lg' | 'rounded-full';
  footer_content: string;
  social_twitter: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  contact_info: string;
  copyright_text: string;
}

interface EmailSettings {
  host: string;
  port: number;
  auth_user: string;
  auth_pass: string;
  from_email: string;
  from_name: string;
  secure: boolean;
  is_active: boolean;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'resend' | 'postmark';
  api_key?: string;
  reply_to?: string;
}

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  variables_hint: string;
  is_custom?: boolean;
  is_active?: boolean;
  updated_at: string;
}

interface TemplateVersion {
  id: string;
  template_id: string;
  subject: string;
  body: string;
  version_number: number;
  created_at: string;
  created_by: string;
}

interface TemplateAnalytics {
  id: string;
  name: string;
  slug: string;
  category: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounce_rate: number;
  open_rate: number;
  click_rate: number;
  last_sent_at: string;
}

interface AnalyticsStats {
  globals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    bounce_rate: number;
  };
  templatesList: TemplateAnalytics[];
}

export function EmailManagement() {
  const { token } = useAuthStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'templates' | 'settings' | 'branding' | 'analytics' | 'firebase'>('templates');
  
  // Configurations
  const [settings, setSettings] = useState<EmailSettings>({
    host: 'smtp.example.com',
    port: 465,
    auth_user: '',
    auth_pass: '',
    from_email: 'noreply@watchwds.com',
    from_name: 'WatchWDS Team',
    secure: true,
    is_active: false,
    provider: 'smtp',
    api_key: '',
    reply_to: 'support@watchwds.com'
  });

  const [branding, setBranding] = useState<EmailBranding>({
    logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop',
    primary_color: '#fbbf24',
    secondary_color: '#0f172a',
    button_style: 'rounded-lg',
    footer_content: 'Thank you for being part of the WatchWDS community. Keep playing, keep watching, and stay connected!',
    social_twitter: 'https://twitter.com/watchwds',
    social_facebook: 'https://facebook.com/watchwds',
    social_instagram: 'https://instagram.com/watchwds',
    social_youtube: 'https://youtube.com/watchwds',
    contact_info: '123 Sports Arena Blvd, Chicago, IL 60601 | support@watchwds.com',
    copyright_text: '© 2026 WatchWDS Inc. All rights reserved.'
  });

  // Templates & Editing
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [editorMode, setEditorMode] = useState<'rich' | 'html' | 'preview'>('rich');
  
  // Custom template creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({
    name: '',
    subject: '',
    category: 'Welcome',
    variables_hint: 'user_name, user_email',
    body: '<h2>Custom Template</h2><p>Replace this content with your messaging.</p>'
  });

  // Global UI
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showLogoMediaPicker, setShowLogoMediaPicker] = useState(false);

  // Stats / Analytics
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Template categories
  const categoriesList = [
    'All', 'Welcome', 'Authentication', 'Subscription', 'Events/Matches', 
    'Billing/Payment', 'Creator Updates', 'Admin Alert', 'Team/League', 'Marketing/Promo', 'Custom'
  ];

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      // SMTP & Branding Settings
      const settingsRes = await fetch('/api/admin/email/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const { branding: brandingData, ...smtpData } = settingsData;
        
        setSettings({
          ...smtpData,
          secure: smtpData.secure === true,
          is_active: smtpData.is_active === true,
          provider: smtpData.provider || 'smtp'
        });
        
        if (brandingData) {
          setBranding(brandingData);
        }
      }

      // Templates
      const templatesRes = await fetch('/api/admin/email/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
        if (templatesData && templatesData.length > 0) {
          // Select default
          fetchTemplateDetail(templatesData[0].slug || templatesData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load initial SMTP/Email data:", err);
    }
  };

  const fetchTemplateDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullTemplate = await res.json();
        setSelectedTemplate({
          id: fullTemplate.id || fullTemplate.slug,
          slug: fullTemplate.slug,
          name: fullTemplate.name,
          subject: fullTemplate.subject,
          body: fullTemplate.body,
          category: fullTemplate.category,
          variables_hint: fullTemplate.variables_hint,
          is_custom: fullTemplate.is_custom === true,
          is_active: fullTemplate.is_active !== false,
          updated_at: fullTemplate.updated_at
        });
        setVersions(fullTemplate.versions || []);
      }
    } catch (err) {
      console.error("Failed to load detailed template:", err);
    }
  };

  const fetchAnalytics = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/email/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const statsData = await res.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch notification stats:", err);
    }
    setStatsLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/email/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...settings,
          branding
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'SMTP relay credentials & branding preferences updated' });
      } else {
        setMessage({ type: 'error', text: 'Forbidden: Failed to save email server settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to write SMTP configurations' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${selectedTemplate.slug}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          subject: selectedTemplate.subject,
          body: selectedTemplate.body,
          name: selectedTemplate.name,
          category: selectedTemplate.category,
          is_active: selectedTemplate.is_active,
          variables_hint: selectedTemplate.variables_hint
        })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Template changes saved and archived in version history!' });
        
        // Refresh detail to capture new version lists
        await fetchTemplateDetail(selectedTemplate.slug);
        
        // Update collection list state
        setTemplates(templates.map(t => t.slug === selectedTemplate.slug ? {
          ...t,
          subject: selectedTemplate.subject,
          name: selectedTemplate.name,
          category: selectedTemplate.category,
          is_active: selectedTemplate.is_active
        } : t));
      } else {
        setMessage({ type: 'error', text: 'Failed to update template' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error executing template write API' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTemplateData)
      });
      if (res.ok) {
        const added = await res.json();
        setMessage({ type: 'success', text: 'Custom transactional email template generated!' });
        setTemplates([added, ...templates]);
        setSelectedTemplate(added);
        setShowCreateModal(false);
        setNewTemplateData({
          name: '',
          subject: '',
          category: 'Welcome',
          variables_hint: 'user_name, user_email',
          body: '<h2>Custom Template</h2><p>Replace this content with your messaging.</p>'
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to create custom template' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network crash executing create templates' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDuplicateTemplate = async (slug: string) => {
    if (!confirm('Are you sure you want to duplicate this template?')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${slug}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: 'Template duplicated successfully!' });
        
        // Reload list
        const listRes = await fetch('/api/admin/email/templates', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          setTemplates(listData);
          fetchTemplateDetail(result.id);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to duplicate template' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Duplicate API failed' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDeleteTemplate = async (slug: string) => {
    if (!confirm('DANGER! This will permanently delete this custom template and its entire version history. Continue?')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Custom template removed permanently.' });
        const remaining = templates.filter(t => t.slug !== slug);
        setTemplates(remaining);
        if (remaining.length > 0) {
          fetchTemplateDetail(remaining[0].slug);
        } else {
          setSelectedTemplate(null);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to delete template' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete API crash' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedTemplate) return;
    if (!confirm('Are you sure you want to restore this historical template layout? A backup copy of your current editor will be created.')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${selectedTemplate.slug}/restore-version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ version_id: versionId })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Historical version successfully restored to current editor!' });
        fetchTemplateDetail(selectedTemplate.slug);
      } else {
        setMessage({ type: 'error', text: 'Failed to restore old version' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Restore version API crashed' });
    }
    setIsSaving(false);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleTestConnection = async () => {
    if (!testEmail) return;
    setIsTesting(true);
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ to: testEmail })
      });
      const data = await res.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: 'SMTP server test dispatch timed out' });
    }
    setIsTesting(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSendTemplateTest = async () => {
    if (!selectedTemplate || !testEmail) return;
    setIsTesting(true);
    try {
      const res = await fetch(`/api/admin/email/templates/${selectedTemplate.slug}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ to: testEmail })
      });
      const data = await res.json();
      setMessage({ type: data.success ? 'success' : 'error', text: data.message });
    } catch (err) {
      setMessage({ type: 'error', text: 'Template test execution failed' });
    }
    setIsTesting(false);
    setTimeout(() => setMessage(null), 5000);
  };

  // Live previews rendering with dummy data replacement & master layout wrapping
  const renderLivePreviewHTML = () => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.body;
    let subject = selectedTemplate.subject;

    const dummyVars = {
      first_name: 'John',
      last_name: 'Doe',
      user_name: 'johndoe',
      user_email: 'johndoe@gmail.com',
      match_name: 'Real Madrid vs. Barcelona (Derby)',
      match_date: new Date().toLocaleDateString(),
      match_time: '19:45 EST',
      league_name: 'La Liga EA Sports',
      club_name: 'Los Blancos Club',
      subscription_name: 'WD Premium Monthly Pass',
      purchase_amount: '14.99',
      transaction_id: 'TXN-908271AOB',
      invoice_number: 'INV-2026-4402',
      support_email: 'support@watchwds.com',
      company_name: 'WatchWDS Live',
      website_url: '#',
      reset_password_link: '#',
      verification_link: '#',
      creator_name: 'SportsStreamPro X'
    };

    // Replaces
    Object.entries(dummyVars).forEach(([key, val]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      body = body.replace(regex, val);
      subject = subject.replace(regex, val);
    });

    const buttonClassRadius = branding.button_style === 'rounded-full' ? '9999px' : (branding.button_style === 'rounded-sm' ? '4px' : '8px');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; }
    .email-container { max-width: 580px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .email-header { padding: 24px; text-align: center; }
    .email-logo { max-height: 40px; }
    .email-body { padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.5; }
    .email-body h2 { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .email-footer { padding: 24px; text-align: center; color: #cbd5e1; font-size: 11px; }
    .email-footer a { color: #f1f5f9; text-decoration: none; font-weight: bold; margin: 0 4px; }
    .button { display: inline-block; padding: 10px 20px; font-weight: bold; text-decoration: none; font-size: 13px; margin: 20px 0; border-radius: ${buttonClassRadius}; background-color: ${branding.primary_color}; color: #0d1720; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .meta-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .meta-table td.label { font-weight: bold; color: #64748b; width: 35%; }
    .meta-table td.value { color: #1e293b; font-weight: 500; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header" style="background-color: ${branding.secondary_color};">
      <img src="${branding.logo_url}" alt="WatchWDS" class="email-logo" />
    </div>
    <div class="email-body">
      ${body}
    </div>
    <div class="email-footer" style="background-color: ${branding.secondary_color};">
      <div style="margin-bottom: 12px; color: #cbd5e1;">${branding.footer_content}</div>
      <div style="margin-bottom: 12px;">
        <a href="${branding.social_twitter}">Twitter</a> &bull; 
        <a href="${branding.social_facebook}">Facebook</a> &bull; 
        <a href="${branding.social_instagram}">Instagram</a> &bull; 
        <a href="${branding.social_youtube}">YouTube</a>
      </div>
      <div style="font-size: 10px; color: #94a3b8; line-height: 1.4;">
        ${branding.contact_info}<br/>
        ${branding.copyright_text}
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  // Inserts visual block snippets to template body
  const insertVisualSnippet = (type: 'button' | 'table' | 'divider' | 'callout') => {
    if (!selectedTemplate) return;
    let snippet = '';
    
    if (type === 'button') {
      snippet = `<p style="text-align: center;"><a href="#" class="button" style="color: #0f171e; background-color: ${branding.primary_color}; padding: 12px 24px; text-decoration: none; font-weight: bold; display: inline-block; margin: 16px 0; border-radius: 8px;">Action Call Button</a></p>`;
    } else if (type === 'table') {
      snippet = `<table class="meta-table" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 10px; border-bottom: 1px solid #e2e8f0;">Transaction Description</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 10px; border-bottom: 1px solid #e2e8f0;">Order #{{invoice_number}}</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 10px; border-bottom: 1px solid #e2e8f0;">Charged Amount</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 10px; border-bottom: 1px solid #e2e8f0;">£{{purchase_amount}} GBP</td></tr>
  <tr><td class="label" style="font-weight: bold; color: #64748b; padding: 10px; border-bottom: 1px solid #e2e8f0;">Merchant Reference</td><td class="value" style="color: #1e293b; font-weight: 500; padding: 10px; border-bottom: 1px solid #e2e8f0;">{{transaction_id}}</td></tr>
</table>`;
    } else if (type === 'divider') {
      snippet = `<hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />`;
    } else if (type === 'callout') {
      snippet = `<div style="background-color: #f8fafc; border-left: 4px solid ${branding.primary_color}; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
  <p style="margin: 0; font-weight: 600; color: #1e293b;">Important Warning Details</p>
  <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Place critical highlight details here. Fits perfect for subscription notices and registration alerts!</p>
</div>`;
    }

    setSelectedTemplate({
      ...selectedTemplate,
      body: selectedTemplate.body + snippet
    });
  };

  // Filter templates list
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = (t.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                          (t.subject || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                          (t.slug || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Mail className="w-8 h-8 text-yellow-500" />
            Transactional Email Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure secure SMTP, apply central HTML layouts, design custom templates, and monitor mail analytics.</p>
        </div>
        
        {/* TABS SELECTOR */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl self-start border border-slate-200/50 dark:border-slate-800/10">
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <FileText className="w-4 h-4" /> Templates Manager
          </button>
          <button 
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'branding' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Paintbrush className="w-4 h-4" /> Visual Branding
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Settings className="w-4 h-4" /> Server & SMTP Setup
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <BarChart2 className="w-4 h-4" /> Delivery Metrics
          </button>
          <button 
            onClick={() => setActiveTab('firebase')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'firebase' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-200 hover:text-indigo-400 font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/10'}`}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Firebase Auth Mail
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-500/20'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-bold text-sm leading-relaxed">{message.text}</span>
        </div>
      )}

      {/* TABS INTERFACE */}

      {/* TAB 1: TEMPLATE MANAGER */}
      {activeTab === 'templates' && (
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: TEMPLATES DIRECTORIES & SEARCHING */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider">Templates ({filteredTemplates.length})</h3>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Custom
                </button>
              </div>

              {/* SEARCH */}
              <input 
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-yellow-500 transition-all dark:text-white"
              />

              {/* CATEGORIES DIRECTORY */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Filter Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:yellow-500 dark:text-white"
                >
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TEMPLATE CONTAINER LIST */}
            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-2">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(template => (
                  <button 
                    key={template.slug || template.id}                    onClick={() => fetchTemplateDetail(template.slug || template.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTemplate?.slug === template.slug ? 'bg-yellow-500/10 border-yellow-500/40 ring-1 ring-yellow-500/40' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[80%]">{template.name}</h4>
                      {template.is_custom && (
                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-350 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Custom</span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-bold tracking-wider truncate">{template.slug.replace(/_/g, ' ')}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400 font-bold">{template.category}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${template.is_active !== false ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs font-medium">No results matches active filters</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: EDITOR CANVASES */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {selectedTemplate ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 xl:p-8 space-y-6 shadow-sm">
                
                {/* ACTIVE TEMPLATE HEADER ACTIONS */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                      <span className="text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-slate-500 font-bold">{selectedTemplate.category}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">SLUG: {selectedTemplate.slug}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => handleDuplicateTemplate(selectedTemplate.slug)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700 dark:text-slate-350 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5"
                      title="Duplicate Template"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate
                    </button>
                    
                    {selectedTemplate.is_custom && (
                      <button 
                        onClick={() => handleDeleteTemplate(selectedTemplate.slug)}
                        className="bg-rose-50/50 hover:bg-rose-50 hover:text-rose-600 dark:bg-rose-500/5 dark:hover:bg-rose-500/10 text-rose-500 p-2.5 rounded-xl border border-rose-100 dark:border-rose-500/10 text-xs font-bold flex items-center gap-1.5"
                        title="Delete Custom Template Layout"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}

                    <div className="relative inline-flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/50 dark:border-slate-700">
                      <button 
                        onClick={() => setEditorMode('rich')}
                        className={`px-3 py-1.5 rounded-lg text-3xs font-extrabold flex items-center gap-1 px-3 py-1.5 ${editorMode === 'rich' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                      >
                        <Sparkles className="w-3 h-3" /> Rich Editor
                      </button>
                      <button 
                        onClick={() => setEditorMode('html')}
                        className={`px-3 py-1.5 rounded-lg text-3xs font-extrabold flex items-center gap-1 px-3 py-1.5 ${editorMode === 'html' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                      >
                        <Code className="w-3 h-3" /> HTML Code
                      </button>
                      <button 
                        onClick={() => setEditorMode('preview')}
                        className={`px-3 py-1.5 rounded-lg text-3xs font-extrabold flex items-center gap-1 px-3 py-1.5 ${editorMode === 'preview' ? 'bg-white bg-slate-800 text-slate-800 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                      >
                        <Eye className="w-3 h-3" /> Live Sandbox
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid xl:grid-cols-12 gap-8">
                  {/* WORKSPACE AREA */}
                  <div className="xl:col-span-8 space-y-6">
                    
                    {/* INPUTS FOR SUBJECT */}
                    <div className="grid md:grid-cols-12 gap-4">
                      <div className="md:col-span-9">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Subject</label>
                        <input 
                          type="text"
                          value={selectedTemplate.subject}
                          onChange={(e) => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                          disabled={editorMode === 'preview'}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white transition-all disabled:opacity-60"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Template Status</label>
                        <select
                          value={selectedTemplate.is_active !== false ? 'active' : 'disabled'}
                          onChange={(e) => setSelectedTemplate({...selectedTemplate, is_active: e.target.value === 'active'})}
                          disabled={editorMode === 'preview'}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-1 focus:ring-yellow-500 dark:text-white transition-all disabled:opacity-60"
                        >
                          <option value="active">Active System</option>
                          <option value="disabled">Disabled (No-Send)</option>
                        </select>
                      </div>
                    </div>

                    {/* DYNAMIC EDITOR MODES */}
                    {editorMode === 'rich' && (
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Body Content</label>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                          <ReactQuill
                            value={selectedTemplate.body}
                            onChange={(content) => setSelectedTemplate({...selectedTemplate, body: content})}
                            className="bg-white dark:bg-slate-950 dark:text-white"
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                                ['link', 'image', 'clean']
                              ]
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {editorMode === 'html' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Raw HTML Layout Code</label>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 rounded">Developer mode</span>
                        </div>
                        <textarea 
                          value={selectedTemplate.body}
                          onChange={(e) => setSelectedTemplate({...selectedTemplate, body: e.target.value})}
                          rows={16}
                          className="w-full bg-slate-950 text-slate-100 font-mono text-xs rounded-xl p-5 border border-slate-350 focus:ring-1 focus:ring-yellow-500 transition-all focus:outline-none"
                        />
                      </div>
                    )}

                    {editorMode === 'preview' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 text-slate-400">Master Rendered Output (Dummy Data applied)</label>
                          <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/15 px-2 py-0.5 rounded font-black">Live matching active</span>
                        </div>
                        <div className="min-h-[500px] bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200">
                          <iframe 
                            srcDoc={renderLivePreviewHTML()}
                            title="Live Mock Frame Output"
                            className="w-full h-[65vh] border-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC SNIPPETS SELECTOR (Only in editors) */}
                    {editorMode !== 'preview' && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> Insert visual components layout blocks:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            type="button"
                            onClick={() => insertVisualSnippet('button')}
                            className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-3xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            + CTA Button
                          </button>
                          <button 
                            type="button"
                            onClick={() => insertVisualSnippet('table')}
                            className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-3xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            + Invoice Table
                          </button>
                          <button 
                            type="button"
                            onClick={() => insertVisualSnippet('divider')}
                            className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-3xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            + Line Separator
                          </button>
                          <button 
                            type="button"
                            onClick={() => insertVisualSnippet('callout')}
                            className="bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-350 border border-slate-200 dark:border-slate-800 text-3xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            + Highlight Callout
                          </button>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleSaveTemplate}
                      disabled={isSaving}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? 'Compiling Template schemas...' : 'Save template edits and create new minor version'}
                    </button>

                  </div>

                  {/* SIDEBAR: VERSIONS & TEST DISPENSARY */}
                  <div className="xl:col-span-4 space-y-6">
                    
                    {/* PLACEHOLDERS */}
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 space-y-3">
                      <h4 className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                        <Info className="w-4 h-4 text-amber-500" /> Supported Variable Placeholders
                      </h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-relaxed">
                        Wrap custom variables in double curly brackets to compile raw attributes dynamically:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {selectedTemplate.variables_hint.split(',').map(v => (
                          <span key={v} className="bg-white dark:bg-slate-900 border border-amber-500/10 px-2 py-1 rounded text-[10px] font-bold text-amber-700 dark:text-amber-350">{`{{${v.trim()}}}`}</span>
                        ))}
                      </div>
                    </div>

                    {/* LIVE DISPATCH TESTING SECTION */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-yellow-500" /> Dispatch Test Email
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">Runs dynamic parser models against your custom layout, sending actual HTML copies directly to your terminal address.</p>
                      <div className="space-y-3">
                        <input 
                          type="email"
                          placeholder="johndoe@gmail.com"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:text-white"
                        />
                        <button 
                          onClick={handleSendTemplateTest}
                          disabled={isTesting || !testEmail}
                          className="w-full bg-slate-950 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity rounded-lg py-2.5 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                        >
                          {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Dispatch Template Test
                        </button>
                      </div>
                    </div>

                    {/* VERSION HISTORY ARCHIVES */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-cyan-500" /> Historical Layer History
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Every template edit compiles a rollback layer. Rollback any layout to previous states safely.
                      </p>

                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                        {versions.length > 0 ? (
                          versions.map(v => (
                            <div key={v.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between text-left shadow-2xs">
                              <div>                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">Version #{v.version_number}</h5>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(v.created_at).toLocaleTimeString()} ({v.created_by.split('@')[0]})</p>
                              </div>
                              <button 
                                onClick={() => handleRestoreVersion(v.id)}
                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-black text-yellow-500 dark:text-yellow-450 px-2.5 py-1 rounded-lg transition-all"
                              >
                                Restore
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-[11px] text-slate-400 font-medium">No previous versions. Make changes to start compiling archives.</div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl h-[65vh] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-1.5">No Template Selected</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">Select a template from directories list or click on + Custom Template to engineer full custom mail catalogs from scratch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL BRANDING HUBS */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveSettings} className="grid lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 xl:p-8 space-y-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Paintbrush className="w-5 h-5 text-yellow-500" />
                Theme & Layout Styling
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Primary Branding Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                      className="w-12 h-10 bg-transparent border-0 outline-none rounded cursor-pointer"
                    />                    <input 
                      type="text"
                      value={branding.primary_color}
                      onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-semibold uppercase focus:ring-1 focus:ring-yellow-500 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Secondary Branding Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                      className="w-12 h-10 bg-transparent border-0 outline-none rounded cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={branding.secondary_color}
                      onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-semibold uppercase focus:ring-1 focus:ring-yellow-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Email System Header Logo
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      This logo appears at the top of all outgoing emails sent to users.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoMediaPicker(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Choose from Media Library</span>
                  </button>
                </div>

                {/* Logo Preview & Input controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div 
                    className="w-32 h-16 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 overflow-hidden shadow-inner flex-shrink-0 relative group"
                    style={{ backgroundColor: branding.secondary_color || '#0f172a' }}
                  >
                    {branding.logo_url ? (
                      <img 
                        src={branding.logo_url} 
                        alt="Email Header Logo Preview" 
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">No Logo Set</span>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={branding.logo_url}
                        onChange={(e) => setBranding({...branding, logo_url: e.target.value})}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                      />
                      {branding.logo_url && (
                        <button
                          type="button"
                          onClick={() => setBranding({...branding, logo_url: ''})}
                          className="px-2.5 py-2 text-xs text-slate-400 hover:text-red-500 font-semibold transition-colors"
                          title="Remove logo"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Recommended: Transparent PNG or SVG asset (3:1 horizontal ratio).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">CTA Button Roundness Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['rounded-sm', 'rounded-lg', 'rounded-full'].map((btnStyle) => (
                    <button 
                      key={btnStyle}
                      type="button"
                      onClick={() => setBranding({...branding, button_style: btnStyle as any})}
                      className={`text-2xs font-extrabold py-2.5 border rounded-lg transition-all ${branding.button_style === btnStyle ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' : 'bg-white hover:bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                    >
                      {btnStyle === 'rounded-sm' ? 'Flat/Sharp' : btnStyle === 'rounded-lg' ? 'Standard Safe' : 'Full Rounded'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Branding Footer message</label>
                <textarea 
                  value={branding.footer_content}
                  onChange={(e) => setBranding({...branding, footer_content: e.target.value})}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white leading-relaxed"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Contact coordinates</label>
                  <input 
                    type="text"
                    value={branding.contact_info}
                    onChange={(e) => setBranding({...branding, contact_info: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Copyright Statement</label>
                  <input 
                    type="text"
                    value={branding.copyright_text}
                    onChange={(e) => setBranding({...branding, copyright_text: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 border border-transparent rounded-2xl p-5 space-y-4 transition-all">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Footer Social Accounts URLs</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Twitter / X Link</label>
                    <input 
                      type="text"
                      value={branding.social_twitter}
                      onChange={(e) => setBranding({...branding, social_twitter: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-3xs font-semibold dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Facebook Link</label>
                    <input 
                      type="text"
                      value={branding.social_facebook}
                      onChange={(e) => setBranding({...branding, social_facebook: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-3xs font-semibold dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Instagram Link</label>
                    <input 
                      type="text"
                      value={branding.social_instagram}
                      onChange={(e) => setBranding({...branding, social_instagram: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-3xs font-semibold dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">YouTube Channel Link</label>
                    <input 
                      type="text"
                      value={branding.social_youtube}
                      onChange={(e) => setBranding({...branding, social_youtube: e.target.value})}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-3xs font-semibold dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow shadow-yellow-500/10 transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Updating...' : 'Apply Central Styling across templates'}
                </button>
              </div>

            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 xl:p-8 space-y-5">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Live Mock Email Frame Preview</h3>
              <p className="text-2xs text-slate-450 leading-relaxed">
                Centralized templates merge layout properties dynamically from visual configurations above. Preview the master shell architecture.
              </p>
              <div className="min-h-[560px] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                {/* Embedded mock template wrapper just to preview styles logo, header, buttons and layouts */}
                <iframe 
                  srcDoc={`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #f1f5f9; padding: 20px; text-align: center; }
    .email-container { max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; text-align: left;}
    .email-header { padding: 20px; text-align: center; background-color: ${branding.secondary_color}; }
    .email-body { padding: 28px; line-height: 1.5; color: #334155; font-size: 14px;}
    .email-footer { padding: 20px; text-align: center; background-color: ${branding.secondary_color}; color: #94a3b8; font-size: 10px;}
    .button { display: inline-block; padding: 10px 20px; font-weight: bold; text-decoration: none; border-radius: ${branding.button_style === 'rounded-full' ? '9999px' : (branding.button_style === 'rounded-sm' ? '4px' : '8px')}; background-color: ${branding.primary_color}; color: #0d1720; margin: 15px 0;}
    .f-links a { color: #f1f5f9; text-decoration: none; font-weight: bold; margin: 0 4px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header"><img src="${branding.logo_url}" style="max-height: 36px;" /></div>
    <div class="email-body">
      <h3>Central Styling Layout Preview</h3>
      <p>This is a simulated transactional newsletter showcasing how branding attributes apply to matches, billing invoices, streaks and verification emails automatically!</p>
      <a href="#" class="button">Interactive Action Button</a>
      <p>Colors, branding logo, footer coordinates and roundness map safely instantly.</p>
    </div>
    <div class="email-footer">
      <div style="margin-bottom: 8px; color: #cbd5e1;">${branding.footer_content}</div>
      <div class="f-links" style="margin-bottom: 8px;">
        <a href="#">Twitter</a> &bull; <a href="#">Facebook</a> &bull; <a href="#">Instagram</a>
      </div>
      <div>${branding.contact_info}</div>
    </div>
  </div>
</body>
</html>`}
                  className="w-full h-[65vh] border-0"
                />
              </div>
            </div>
          </div>

        </form>
      )}

      {/* TAB 3: SERVER & SMTP SETUP */}
      {activeTab === 'settings' && (
        <div className="grid lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 xl:p-8 border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 gap-4">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                     <LockIcon className="w-5 h-5 text-yellow-500" />
                     Relay Server Credentials
                  </h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={settings.is_active}
                      onChange={(e) => setSettings({...settings, is_active: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-3 text-xs font-black text-slate-700 dark:text-slate-300">System Enabled</span>
                  </label>
                </div>

                {/* EMAIL PROVIDERS DROPDOWN */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 PX-0.5">Physical Mail Provider</label>
                  <select
                    value={settings.provider}
                    onChange={(e) => setSettings({...settings, provider: e.target.value as any})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold dark:text-white"
                  >
                    <option value="smtp">Direct SMTP Relay Connection</option>
                    <option value="sendgrid">SendGrid Web API V3</option>
                    <option value="mailgun">Mailgun HTTP Service</option>
                    <option value="ses">Amazon SES Dispatcher</option>
                    <option value="resend">Resend API Portal</option>
                    <option value="postmark">Postmark Mailbox Link</option>
                  </select>
                </div>

                {/* SMTP CONDITIONAL PAROMETERS */}
                {settings.provider === 'smtp' ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">SMTP Host</label>
                        <input 
                          type="text"
                          value={settings.host}
                          onChange={(e) => setSettings({...settings, host: e.target.value})}
                          placeholder="smtp.gmail.com"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">SMTP Port</label>
                        <input 
                          type="number"
                          value={settings.port}
                          onChange={(e) => setSettings({...settings, port: Number(e.target.value)})}
                          placeholder="465"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">SMTP Username</label>
                        <input 
                          type="text"
                          value={settings.auth_user}
                          onChange={(e) => setSettings({...settings, auth_user: e.target.value})}
                          placeholder="username@gmail.com"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">SMTP Password</label>
                        <input 
                          type="password"
                          value={settings.auth_pass}
                          onChange={(e) => setSettings({...settings, auth_pass: e.target.value})}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 py-2">
                      <button 
                        type="button"
                        onClick={() => setSettings({...settings, secure: !settings.secure})}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${settings.secure ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-505'}`}
                      >
                        <LockIcon className="w-3.5 h-3.5" /> Use SSL/TLS protocol
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-200/50 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                      <Globe className="w-4 h-4 text-cyan-500" /> Web API Configuration
                    </div>
                    <p className="text-2xs text-slate-400 leading-relaxed">
                      Provider {settings.provider.toUpperCase()} dispatches transactional emails optimized via their native API. No server host or port setups required. 
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1.5 tracking-wider">Secret API key</label>
                      <input 
                        type="password"
                        value={settings.api_key || ''}
                        onChange={(e) => setSettings({...settings, api_key: e.target.value})}
                        placeholder="SG.xxxxxxx / or Bearer Token key"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl text-xs dark:text-white"
                      />
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-black text-slate-900 dark:text-white pt-4 border-t border-slate-100 dark:border-slate-700/60 uppercase tracking-wider">Sender Headers</h3>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">From Display Name</label>
                    <input 
                      type="text"
                      value={settings.from_name}
                      onChange={(e) => setSettings({...settings, from_name: e.target.value})}
                      placeholder="WatchWDS Support"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">From Mail Address</label>
                    <input 
                      type="email"
                      value={settings.from_email}
                      onChange={(e) => setSettings({...settings, from_email: e.target.value})}
                      placeholder="info@watchwds.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Reply To Address</label>
                    <input 
                      type="email"
                      value={settings.reply_to || ''}
                      onChange={(e) => setSettings({...settings, reply_to: e.target.value})}
                      placeholder="support@watchwds.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold focus:ring-1 focus:ring-yellow-500 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow shadow-yellow-500/10 transition-all disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {isSaving ? 'Saving Configurations...' : 'Save server configuration settings'}
                  </button>
                </div>

              </div>
            </form>
          </div>

          {/* RIGHT PANELS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* CONNECTION TESTER */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                Test Mail Gateway Connection
              </h3>
              <p className="text-2xs text-slate-400 leading-relaxed">
                Send an actual SMTP relay transaction verification email to check validity of credentials, routing SSL layers, hosts and security tunnels.
              </p>
              <div className="space-y-3 pt-2">
                <input 
                  type="email"
                  placeholder="recipient@test.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none dark:text-white"
                />
                <button 
                  onClick={handleTestConnection}
                  disabled={isTesting || !testEmail}
                  className="w-full bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950 font-extrabold py-2.5 rounded-xl hover:opacity-95 transition-opacity duration-150 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Verify Gateway Conn
                </button>
              </div>
            </div>

            {/* QUICK INFORMATION PANEL */}
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-yellow-500" />
                SMTP Help Notes
              </h3>
              <ul className="space-y-3.5 text-2xs text-slate-450 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold leading-none">•</span>
                  <span><strong>Gmail / GSuite:</strong> Use <code>smtp.gmail.com</code> on port <strong>465</strong> (SSL checking required) or port <strong>587</strong> (TLS). Must map and generate Google Account "App Password".</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold leading-none">•</span>
                  <span><strong>Amazon SES:</strong> Ensure your domain and sender address are verified in verified lists inside AWS Management Console before executing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold leading-none">•</span>
                  <span><strong>Security Tunnels:</strong> If connection fails, toggle port structures (465 SSL, 587 TLS with SSL unchecked or 25 for non-secured links).</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: METRICS & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {statsLoading && !stats ? (
            <div className="flex items-center justify-center py-[20vh] gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
              <span className="text-slate-400 font-bold text-sm">Aggregating transactional logs...</span>
            </div>
          ) : stats ? (
            <div className="space-y-8">
              
              {/* BENTO CARDS METRICS CONTAINER */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><Send className="w-3.5 h-3.5 text-indigo-500" /> Total Dispatched</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.globals.sent}</h3>
                  <p className="text-[9px] text-[#cbd5e1] font-bold mt-1 leading-none">Cumulative logs count</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Delivery Rate</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{stats.globals.delivery_rate}%</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 leading-none">{stats.globals.delivered} of {stats.globals.sent} delivered</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-yellow-500" /> Open Rate</p>
                  <h3 className="text-3xl font-black text-yellow-600 dark:text-yellow-500">{stats.globals.open_rate}%</h3>
                  <p className="text-[9px] text-slate-400 mt-1 leading-none font-bold">{stats.globals.opened} opens tracked</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-cyan-500" /> Click Rate</p>
                  <h3 className="text-3xl font-black text-cyan-600 dark:text-cyan-500">{stats.globals.click_rate}%</h3>
                  <p className="text-[9px] text-slate-400 mt-1 leading-none font-bold">{stats.globals.clicked} clicks tracked</p>
                </div>
                <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-2xs">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Bounce Rate</p>
                  <h3 className="text-3xl font-black text-rose-600 dark:text-rose-500">{stats.globals.bounce_rate}%</h3>
                  <p className="text-[9px] text-slate-400 mt-1 leading-none font-bold">{stats.globals.failed} failed/refuses</p>
                </div>
              </div>

              {/* STATS TABLES FOR EACH INDIVIDUAL TEMPLATE */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Template Level Performance Analytics</h3>
                  <button 
                    onClick={fetchAnalytics}
                    className="p-1 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-2xs rounded-lg flex items-center gap-1 font-bold dark:text-white"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh logs
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-600 dark:text-slate-350">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-450 tracking-wider border-b border-slate-100 dark:border-slate-700">
                        <th className="p-4 px-6">Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4 text-center">Sends</th>
                        <th className="p-4 text-center">Delivered</th>
                        <th className="p-4 text-center">Open Rate</th>
                        <th className="p-4 text-center">Click Rate</th>
                        <th className="p-4 text-center">Bounce %</th>
                        <th className="p-4 px-6 text-right">Last Dispatched</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs font-semibold">
                      {stats.templatesList.map(item => (
                        <tr key={item.slug} className="hover:bg-slate-55/40 dark:hover:bg-slate-900/30">
                          <td className="p-4 px-6 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="p-4"><span className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold px-2 py-0.5 rounded text-[10px]">{item.category}</span></td>
                          <td className="p-4 text-center">{item.sent}</td>
                          <td className="p-4 text-center">{item.delivered}</td>
                          <td className="p-4 text-center text-yellow-600 dark:text-yellow-405">{item.open_rate}%</td>
                          <td className="p-4 text-center text-cyan-600 dark:text-cyan-405">{item.click_rate}%</td>
                          <td className="p-4 text-center text-rose-500">{item.bounce_rate}%</td>
                          <td className="p-4 px-6 text-right text-slate-400 text-3xs font-black uppercase">{item.last_sent_at ? new Date(item.last_sent_at).toLocaleDateString() + ' ' + new Date(item.last_sent_at).toLocaleTimeString().slice(0, 5) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">Error rendering performance stats boards</div>
          )}

        </div>
      )}

      {/* TAB 5: FIREBASE AUTHENTICATION MAIL INSTRUCTIONS */}
      {activeTab === 'firebase' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
          
          {/* INSTRUCTIONAL HERO BLOCK */}
          <div className="bg-gradient-to-br from-indigo-550/10 via-indigo-650/5 to-transparent border border-indigo-500/10 p-8 rounded-3xl space-y-5">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-indigo-500/15 rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm">
              <LockIcon className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-indigo-400 tracking-tight">Firebase Custom Authentication Emails</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Security-defined auth actions—such as <strong>Verification Emails, Password Reset codes, Account verification links and device confirmations</strong>—are controlled under rigorous encryption policies. By compliance specs, Firebase manages those protocols directly.
              </p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-500/20 flex gap-3.5 items-start">
              <Info className="w-5 h-5 text-indigo-505 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-350 uppercase">Security compliance notification</h4>
                <p className="text-2xs text-indigo-700 dark:text-indigo-300/80 leading-relaxed">
                  Firebase Authentication uses client-side secured hashes and direct secure SMTP links on their cloud services. Customizing subjects/bodies outside Firebase Console isn't secure since credentials shouldn't be shared beyond secure token configurations.
                </p>
              </div>
            </div>
          </div>

          {/* DOCUMENTATION TIMELINE */}
          <div className="bg-white dark:bg-slate-800 p-6 xl:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6 shadow-sm">
            <h3 className="font-extrabold text-[#0d1720] dark:text-white uppercase text-base">Step-by-step custom identity credentials</h3>
            
            <div className="space-y-6">
              {[
                {
                  step: '01',
                  title: 'Navigate to Google Firebase Console',
                  desc: 'Visit your authorized Firebase web management console portal (https://console.firebase.google.com), and click to open the WatchWDS Firebase app cluster.'
                },
                {
                  step: '02',
                  title: 'Open Authentication Section',
                  desc: 'Navigate to the sidebar and expand the Build registry, selecting the "Authentication" sub-dashboard, then route tab links to "Templates" at the top.'
                },
                {
                  step: '03',
                  title: 'Choose Trigger Event Action',
                  desc: 'Firebase lists standard triggers: Email Verification, Password Reset, Email Address Change. Select individual records to toggle edit forms.'
                },
                {
                  step: '04',
                  title: 'Branding, Logos, Headers and Sender details',
                  desc: 'Under the "Templates" tab toolbar, configure the Sender header, display name, verified Reply-To domain, platform company name and deep link redirect targets.'
                },
                {
                  step: '05',
                  title: 'Map customized local relay servers',
                  desc: 'Inside the email templates settings, you can toggle "SMTP custom settings" and link Firebase to verify credentials matching your SMTP setup defined here, ensuring matching header sender styles!'
                }
              ].map((timeline, index) => (
                <div key={timeline.step} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-extrabold flex items-center justify-center text-slate-500 shrink-0">{timeline.step}</span>
                    {index < 4 && <div className="w-px bg-slate-200 dark:bg-slate-800 grow my-2" />}
                  </div>
                  <div className="space-y-1.5 pb-2.5">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm">{timeline.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{timeline.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-2xs text-slate-400 font-bold">WatchWDS Firebase SDK identity verification model v5</span>
              <a 
                href="https://console.firebase.google.com" 
                target="_blank" 
                rel="no-referrer"
                className="bg-slate-950 hover:bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-2xs font-extrabold px-4.5 py-2.5 rounded-xl flex items-center gap-1 shadow transition-all self-start"
              >
                Launch Firebase Console <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
      )}

      {/* CREATE DYNAMIC MODAL CANVAS */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-xl shadow-2xl p-6 xl:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-indigo-50/10">
              <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2"><Plus className="text-yellow-500" /> Create Custom Mail Template</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-black p-1 px-2.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Template Display Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Creator Application Received"
                  value={newTemplateData.name}
                  onChange={(e) => setNewTemplateData({...newTemplateData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catalog Directory Category</label>
                  <select
                    value={newTemplateData.category}
                    onChange={(e) => setNewTemplateData({...newTemplateData, category: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs dark:text-white"
                  >
                    {categoriesList.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Variables Hint list</label>
                  <input 
                    type="text"
                    placeholder="user_name, user_email, match_name"
                    value={newTemplateData.variables_hint}
                    onChange={(e) => setNewTemplateData({...newTemplateData, variables_hint: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email Subject Line</label>
                <input 
                  type="text"
                  required
                  placeholder="Verify your registration ticket {{user_name}}"
                  value={newTemplateData.subject}
                  onChange={(e) => setNewTemplateData({...newTemplateData, subject: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-xs dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow shadow-yellow-500/10 transition-all text-xs disabled:opacity-55"
                >
                  <Plus className="w-4 h-4" />
                  {isSaving ? 'Compiling layout schemas...' : 'Build template blueprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={showLogoMediaPicker}
        onClose={() => setShowLogoMediaPicker(false)}
        onSelect={(url) => {
          setBranding({ ...branding, logo_url: url });
          setShowLogoMediaPicker(false);
        }}
        title="Select Email Header Logo"
      />
    </div>
  );
}

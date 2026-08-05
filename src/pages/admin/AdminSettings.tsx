import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../store';
import { DollarSign, CheckCircle, CreditCard, Layout, Search, Globe, Image as ImageIcon, FileText, Share2, Cookie, Chrome, Newspaper, Database, ShieldCheck } from 'lucide-react';
import { AdminSliders } from './AdminSliders';
import { AdminPagesSettings } from './AdminPagesSettings';
import { AdminSocialSettings } from './AdminSocialSettings';
import { AdminCookieSettings } from './AdminCookieSettings';
import { AdminGoogleAuthSettings } from './AdminGoogleAuthSettings';
import { MediaPicker } from '../../components/MediaPicker';
import { AdminFirebaseSettings } from './AdminFirebaseSettings';

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'payment' | 'appearance' | 'seo' | 'pages' | 'social' | 'cookie' | 'google-auth' | 'firebase' | 'security'>('seo');
  
  // Payment States
  const { 
    currency, setCurrency,
    currencySymbol, setCurrencySymbol,
    paymentSettings, setPaymentSettings,
    seoSettings, setSeoSettings,
    captchaEnabled, setCaptchaEnabled,
    captchaTolerance, setCaptchaTolerance
  } = useSettingsStore();

  const [localCurrency, setLocalCurrency] = useState(currency);
  const [isSaved, setIsSaved] = useState(false);

  const [localPaymentSettings, setLocalPaymentSettings] = useState(paymentSettings);
  const [isPaymentSaved, setIsPaymentSaved] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  useEffect(() => {
    if (activeTab === 'payment') {
      setIsLoadingPayment(true);
      fetch('/api/admin/payment/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.stripe) {
          setLocalPaymentSettings(data);
          setPaymentSettings(data);
        }
      })
      .finally(() => setIsLoadingPayment(false));
    }
  }, [activeTab, setPaymentSettings]);

  const [localSeoSettings, setLocalSeoSettings] = useState(seoSettings);
  const [isSeoSaved, setIsSeoSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    setCurrency(localCurrency);
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵', NGN: '₦' };
    setCurrencySymbol(symbols[localCurrency] || localCurrency);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };



  const handlePaymentSave = async () => {
    setIsPaymentSaved(true);
    try {
      await fetch('/api/admin/payment/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(localPaymentSettings)
      });
      setPaymentSettings(localPaymentSettings);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setIsPaymentSaved(false), 2000);
  };

  const handleSeoSave = () => {
    setSeoSettings(localSeoSettings);
    setIsSeoSaved(true);
    setTimeout(() => setIsSeoSaved(false), 2000);
  };

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSeoSettings({ ...localSeoSettings, ogImage: reader.result as string });
        setIsSeoSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Platform Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage configurations, appearance, and SEO.</p>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scbar-none">
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'payment'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Configuration
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'appearance'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Layout className="w-4 h-4" />
          Appearance & Themes
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'seo'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Search className="w-4 h-4" />
          SEO Configuration
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'pages'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pages
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'social'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Social Meta
        </button>
        <button
          onClick={() => setActiveTab('cookie')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'cookie'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Cookie className="w-4 h-4" />
          Cookie Banner
        </button>
        <button
          onClick={() => setActiveTab('google-auth')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'google-auth'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Chrome className="w-4 h-4 text-red-500" />
          Google Login
        </button>
        <button
          onClick={() => setActiveTab('firebase')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'firebase'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <Database className="w-4 h-4 text-orange-500" />
          Firebase Config
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Security
        </button>
      </div>

      {activeTab === 'payment' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Currency Settings</h2>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Platform Currency
              </label>
              <div className="flex gap-3">
                <select 
                  value={localCurrency}
                  onChange={(e) => {
                    setLocalCurrency(e.target.value);
                    setIsSaved(false);
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 dark:text-white transition-colors"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">Pounds (£)</option>
                </select>
                <button
                  onClick={handleSave}
                  disabled={localCurrency === currency && !isSaved}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                    isSaved 
                      ? 'border-transparent bg-green-500 text-white' 
                      : localCurrency !== currency
                        ? 'border-transparent bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This currency will be used across the entire platform for wallets, betting, and analytics.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Payment Providers</h2>
            <div className="space-y-8 max-w-2xl">
              {/* Stripe Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-500" />
                    Stripe Configuration
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={localPaymentSettings.stripe.enabled}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, enabled: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${localPaymentSettings.stripe.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localPaymentSettings.stripe.enabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Enable</span>
                  </label>
                </div>
                
                {localPaymentSettings.stripe.enabled && (
                  <div className="space-y-4 pl-7 border-l-2 border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Public Key
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.stripe.publicKey}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, publicKey: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={localPaymentSettings.stripe.secretKey}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, secretKey: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                        placeholder="sk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Merchant Currency Code (e.g. GBP)
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.stripe.merchantCurrency || ''}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, merchantCurrency: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                        placeholder="Leave empty to use base app currency"
                      />
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localPaymentSettings.stripe.isTestMode}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            stripe: { ...prev.stripe, isTestMode: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Test Mode</span>
                    </label>
                  </div>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* PayPal Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-500" />
                    PayPal Configuration
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={localPaymentSettings.paypal.enabled}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paypal: { ...prev.paypal, enabled: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${localPaymentSettings.paypal.enabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localPaymentSettings.paypal.enabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Enable</span>
                  </label>
                </div>
                
                {localPaymentSettings.paypal.enabled && (
                  <div className="space-y-4 pl-7 border-l-2 border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.paypal.clientId}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paypal: { ...prev.paypal, clientId: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                        placeholder="Client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Secret
                      </label>
                      <input
                        type="password"
                        value={localPaymentSettings.paypal.secret}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paypal: { ...prev.paypal, secret: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
                        placeholder="Secret"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Merchant Currency Code (e.g. GBP)
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.paypal.merchantCurrency || ''}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paypal: { ...prev.paypal, merchantCurrency: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                        placeholder="Leave empty to use base app currency"
                      />
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localPaymentSettings.paypal.isTestMode}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paypal: { ...prev.paypal, isTestMode: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="rounded text-blue-500 focus:ring-blue-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Test Mode</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Paystack Integration</h3>
                    <p className="text-sm text-slate-500">Enable Paystack for processing payments in Africa</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={localPaymentSettings.paystack?.enabled || false}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paystack: { ...(prev.paystack || { publicKey: '', secretKey: '', isTestMode: true }), enabled: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${localPaymentSettings.paystack?.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localPaymentSettings.paystack?.enabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Enable</span>
                  </label>
                </div>
                
                {localPaymentSettings.paystack?.enabled && (
                  <div className="space-y-4 pl-7 border-l-2 border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Public Key
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.paystack.publicKey || ''}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paystack: { ...prev.paystack!, publicKey: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-colors"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        value={localPaymentSettings.paystack.secretKey || ''}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paystack: { ...prev.paystack!, secretKey: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-colors"
                        placeholder="sk_test_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Merchant Currency Code (e.g. NGN)
                      </label>
                      <input
                        type="text"
                        value={localPaymentSettings.paystack?.merchantCurrency || ''}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paystack: { ...prev.paystack!, merchantCurrency: e.target.value }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                        placeholder="Leave empty to use base app currency"
                      />
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localPaymentSettings.paystack?.isTestMode ?? false}
                        onChange={(e) => {
                          setLocalPaymentSettings(prev => ({
                            ...prev,
                            paystack: { ...prev.paystack!, isTestMode: e.target.checked }
                          }));
                          setIsPaymentSaved(false);
                        }}
                        className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Test Mode</span>
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={handlePaymentSave}
                disabled={
                  JSON.stringify(localPaymentSettings) === JSON.stringify(paymentSettings) &&
                  !isPaymentSaved
                }
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                  isPaymentSaved
                    ? 'border-transparent bg-green-500 text-white'
                    : JSON.stringify(localPaymentSettings) !== JSON.stringify(paymentSettings)
                      ? 'border-transparent bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {isPaymentSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Payment Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <Search className="w-5 h-5 text-indigo-500" /> General Meta Tags
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meta Title</label>
                <input 
                  type="text" 
                  value={localSeoSettings.metaTitle}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, metaTitle: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                  placeholder="e.g., Watch WDS - Live Sports Streaming"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meta Keywords</label>
                <input 
                  type="text" 
                  value={localSeoSettings.metaKeywords}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, metaKeywords: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                  placeholder="e.g., sports, streaming, live matches"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Meta Description</label>
                <textarea 
                  value={localSeoSettings.metaDescription}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, metaDescription: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors min-h-[80px]"
                  placeholder="e.g., Watch live sports, follow your favorite creators..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
               <Globe className="w-5 h-5 text-indigo-500" /> Open Graph & Social Media
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">OG Title</label>
                <input 
                  type="text" 
                  value={localSeoSettings.ogTitle}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, ogTitle: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Twitter Handle</label>
                <input 
                  type="text" 
                  value={localSeoSettings.twitterHandle}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, twitterHandle: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                  placeholder="e.g., @watchwds"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">OG Description</label>
                <textarea 
                  value={localSeoSettings.ogDescription}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, ogDescription: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors min-h-[80px]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">OG Default Image URL</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                    {localSeoSettings.ogImage ? (
                      <img src={localSeoSettings.ogImage} alt="OG" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={localSeoSettings.ogImage}
                      onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, ogImage: e.target.value }); setIsSeoSaved(false); }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors mb-2"
                      placeholder="https://..."
                    />
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleOgImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      Or upload an image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Analytics & Crawlers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Google Analytics ID</label>
                <input 
                  type="text" 
                  value={localSeoSettings.googleAnalyticsId}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, googleAnalyticsId: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Google Tag Manager ID</label>
                <input 
                  type="text" 
                  value={localSeoSettings.googleTagManagerId}
                  onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, googleTagManagerId: e.target.value }); setIsSeoSaved(false); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors"
                  placeholder="GTM-XXXXXXX"
                />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">robots.txt config</label>
                 <textarea 
                   value={localSeoSettings.robotsTxt}
                   onChange={(e) => { setLocalSeoSettings({ ...localSeoSettings, robotsTxt: e.target.value }); setIsSeoSaved(false); }}
                   className="w-full font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors min-h-[100px]"
                 />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 mb-4">
            <button
              onClick={handleSeoSave}
              disabled={JSON.stringify(localSeoSettings) === JSON.stringify(seoSettings) && !isSeoSaved}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center gap-2 ${
                isSeoSaved 
                  ? 'border-transparent bg-green-500 text-white' 
                  : JSON.stringify(localSeoSettings) !== JSON.stringify(seoSettings)
                    ? 'border-transparent bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSeoSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save SEO Configuration'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
             <div className="flex items-center gap-3 mb-6">
               <Layout className="w-8 h-8 text-indigo-500" />
               <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Homepage Configuration</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Manage the visibility of sections on the homepage</p>
               </div>
             </div>
             <AppearanceSettings />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
             <div className="flex items-center gap-3 mb-5">
                <Newspaper className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Blog System Visibility</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enable or disable the global blog system and public visibility</p>
                </div>
             </div>
             <BlogVisibilitySettings />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
             <div className="flex items-center gap-3 mb-5">
                <Globe className="w-6 h-6 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Platform Branding</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure global platform identifier name and brand favicon asset</p>
                </div>
             </div>
             <PlatformBrandingSettings />
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 overflow-hidden">
             <AdminSliders embedded={true} />
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              Content Pages
            </h2>
            <AdminPagesSettings />
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Share2 className="w-6 h-6 text-indigo-500" />
              Social Media Links
            </h2>
            <AdminSocialSettings />
          </div>
        </div>
      )}

      {activeTab === 'cookie' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Cookie className="w-6 h-6 text-indigo-500" />
              Cookie Consent Banner
            </h2>
            <AdminCookieSettings />
          </div>
        </div>
      )}

      {activeTab === 'google-auth' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <Chrome className="w-6 h-6 text-indigo-500" />
              Google Sign-In Integration
            </h2>
            <AdminGoogleAuthSettings />
          </div>
        </div>
      )}

      {activeTab === 'firebase' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <Database className="w-6 h-6 text-orange-500" />
              Firebase Integration
            </h2>
            <AdminFirebaseSettings />
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Security Settings
            </h2>

            {/* Sliding Puzzle CAPTCHA Toggle & Tolerance Adjuster */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Sliding Puzzle CAPTCHA</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Require users to solve a sliding puzzle verification before logging in or registering. 
                    This helps prevent automated bot attacks and spam account creation.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={captchaEnabled}
                    onChange={(e) => setCaptchaEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Dynamic Alignment Tolerance Adjuster */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    Alignment Tolerance (Difficulty)
                  </label>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ±{captchaTolerance}px ({captchaTolerance <= 10 ? 'Strict' : captchaTolerance <= 20 ? 'Medium' : captchaTolerance <= 35 ? 'Standard' : 'Lenient'})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Set how precisely the user must align the puzzle piece with the notch. Lower values (e.g. ±5px) require exact precision, while higher values (e.g. ±40px) make verification easier.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-400">Strict (5px)</span>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={captchaTolerance}
                      onChange={(e) => setCaptchaTolerance(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-400">Lenient (50px)</span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: 'Strict (±5px)', val: 5 },
                      { label: 'Medium (±15px)', val: 15 },
                      { label: 'Standard (±25px)', val: 25 },
                      { label: 'Lenient (±40px)', val: 40 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setCaptchaTolerance(preset.val)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          captchaTolerance === preset.val
                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  captchaEnabled 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {captchaEnabled ? '🛡️ CAPTCHA Active' : '⚠️ CAPTCHA Disabled'}
                </span>
                {captchaEnabled && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Users must solve puzzle (±{captchaTolerance}px target tolerance) before login/register
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppearanceSettings() {
  const { homepageSettings, setHomepageSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(homepageSettings || {
    featuresSectionEnabled: true,
    latestNewsEnabled: true
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setHomepageSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.featuresSectionEnabled}
            onChange={(e) => {
              setLocalSettings({ ...localSettings, featuresSectionEnabled: e.target.checked });
              setIsSaved(false);
            }}
            className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
          <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Show Features Section</span>
        </label>
        
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localSettings.latestNewsEnabled}
            onChange={(e) => {
              setLocalSettings({ ...localSettings, latestNewsEnabled: e.target.checked });
              setIsSaved(false);
            }}
            className="rounded text-indigo-500 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
          <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Show Latest News Section</span>
        </label>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Update Homepage'}
        </button>
      </div>
    </div>
  );
}

function PlatformBrandingSettings() {
  const { platformName, setPlatformName, favicon, setFavicon, preloaderEnabled, setPreloaderEnabled } = useSettingsStore();
  const [localName, setLocalName] = useState(platformName || 'WatchWDS');
  const [localPreloaderEnabled, setLocalPreloaderEnabled] = useState(preloaderEnabled !== false);
  const [showPicker, setShowPicker] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalName(platformName || 'WatchWDS');
    setLocalPreloaderEnabled(preloaderEnabled !== false);
  }, [platformName, preloaderEnabled]);

  const handleSave = () => {
    setPlatformName(localName);
    setPreloaderEnabled(localPreloaderEnabled);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name Control */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Platform Name
          </label>
          <input
            type="text"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              setIsSaved(false);
            }}
            placeholder="e.g., MySportz"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This changes the display name of your platform across headers, footers, and page titles.
          </p>
        </div>

        {/* Favicon Control */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Platform Favicon
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="relative w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950 group shrink-0"
              title="Click to choose favicon from your media library"
              id="favicon-picker-btn"
            >
              {favicon ? (
                <img
                  src={favicon}
                  alt="Favicon"
                  className="w-10 h-10 object-contain group-hover:opacity-40 transition-all"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Globe className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] font-black text-white px-1 text-center">CHANGE</span>
              </div>
            </button>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-colors border border-indigo-100 dark:border-indigo-900/40"
              >
                Choose from Media
              </button>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Click the preview box or button to choose/upload an icon. Ideal sizes: 16x16, 32x32 or 48x48.
              </p>
            </div>
          </div>
        </div>

        {/* Preloader Control */}
        <div className="space-y-2 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-5">
          <label className="flex items-center cursor-pointer justify-between">
            <div>
              <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Enable Site Preloader</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Show an animated football bouncing effect when the site loads or performs routing.
              </span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={localPreloaderEnabled}
                onChange={(e) => {
                  setLocalPreloaderEnabled(e.target.checked);
                  setIsSaved(false);
                }}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${localPreloaderEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localPreloaderEnabled ? 'transform translate-x-4' : ''}`}></div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved Successfully</> : 'Save Brand Settings'}
        </button>
      </div>

      {showPicker && (
        <MediaPicker
          onSelect={(url) => {
            setFavicon(url);
            setShowPicker(false);
            setIsSaved(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function BlogVisibilitySettings() {
  const { blogSettings, setBlogSettings } = useSettingsStore();
  const [enabled, setEnabled] = useState(blogSettings?.enabled !== false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setEnabled(blogSettings?.enabled !== false);
  }, [blogSettings]);

  const handleSave = () => {
    setBlogSettings({ enabled });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-500" />
            <h4 className="font-bold text-slate-900 dark:text-white">Blog System Toggle</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Enable or disable the global blog system. When disabled, all blog pages, navigation links, widgets, search results, and admin management tools will be hidden without deleting any data.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked);
              setIsSaved(false);
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'}`}>
          Status: {enabled ? 'Active / Visible' : 'Disabled / Hidden'}
        </span>
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

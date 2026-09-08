import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../store';
import { DollarSign, CheckCircle, CreditCard, Layout, Globe, FileText, Share2, Cookie, Chrome, Newspaper, Database, ShieldCheck, Upload, Trash2, Image, LayoutGrid, ArrowRight, Wallet } from 'lucide-react';
import { AdminSliders } from './AdminSliders';
import { AdminPagesSettings } from './AdminPagesSettings';
import { AdminSocialSettings } from './AdminSocialSettings';
import { AdminCookieSettings } from './AdminCookieSettings';
import { AdminGoogleAuthSettings } from './AdminGoogleAuthSettings';
import { MediaPicker } from '../../components/MediaPicker';
import { AdminFirebaseSettings } from './AdminFirebaseSettings';
import { AdminSecuritySettings } from './AdminSecuritySettings';

export function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'payment' | 'appearance' | 'pages' | 'social' | 'cookie' | 'google-auth' | 'firebase' | 'security'>('payment');
  
  // Payment States
  const { 
    currency, setCurrency,
    currencySymbol, setCurrencySymbol,
    paymentSettings, setPaymentSettings,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Platform Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage configurations and appearance.</p>
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
            <div className="flex items-center gap-3 mb-5">
              <Wallet className="w-6 h-6 text-yellow-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">User Wallet & Balance System</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enable or disable user digital wallet balances and deposit capabilities</p>
              </div>
            </div>
            <WalletVisibilitySettings />
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
                <Wallet className="w-6 h-6 text-yellow-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">User Wallet & Balance System</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enable or disable user digital wallet balances and deposit capabilities</p>
                </div>
             </div>
             <WalletVisibilitySettings />
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
              Security Settings & Audit Logs
            </h2>
            <AdminSecuritySettings />
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
      {/* Homepage Builder Banner Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-indigo-500/10 border border-yellow-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-yellow-500 text-slate-900 shrink-0 shadow-sm">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Visual Homepage Builder Active
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag, drop, and configure dynamic content blocks like broadcasts, live matches, leagues, blogs, and ads.
            </p>
          </div>
        </div>
        <Link
          to="/admin/homepage"
          className="px-5 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 shrink-0 transition-all shadow-sm"
        >
          <span>Open Builder</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Quick Section Visibility</h4>
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
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Update Quick Settings'}
        </button>
      </div>
    </div>
  );
}

function PlatformBrandingSettings() {
  const { 
    platformName, setPlatformName, 
    logoUrl, setLogoUrl, 
    favicon, setFavicon, 
    preloaderEnabled, setPreloaderEnabled 
  } = useSettingsStore();

  const [localName, setLocalName] = useState(platformName !== undefined ? platformName : 'WatchWDS');
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl || '');
  const [localFavicon, setLocalFavicon] = useState(favicon || '/favicon.ico');
  const [localPreloaderEnabled, setLocalPreloaderEnabled] = useState(preloaderEnabled !== false);
  const [pickerTarget, setPickerTarget] = useState<'favicon' | 'logo' | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalName(platformName !== undefined ? platformName : 'WatchWDS');
    setLocalLogoUrl(logoUrl || '');
    setLocalFavicon(favicon || '/favicon.ico');
    setLocalPreloaderEnabled(preloaderEnabled !== false);
  }, [platformName, logoUrl, favicon, preloaderEnabled]);

  const handleSave = () => {
    setPlatformName(localName);
    setLogoUrl(localLogoUrl);
    setFavicon(localFavicon);
    setPreloaderEnabled(localPreloaderEnabled);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Compute initials preview if no logo is selected
  const computedInitials = (() => {
    const trimmed = (localName || '').trim();
    if (!trimmed) return 'WW';
    const words = trimmed.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Site Logo Control */}
        <div className="space-y-2 md:col-span-2 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Platform Logo (Replaces default "{computedInitials}" badge)
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Upload or choose a custom site logo (.png, .jpg, .jpeg, .webp, .svg). When added, this replaces the initials icon in the application header and footer.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              type="button"
              onClick={() => setPickerTarget('logo')}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all overflow-hidden flex items-center justify-center bg-white dark:bg-slate-950 group shrink-0 shadow-sm"
              title="Click to choose or upload logo from media library"
              id="logo-picker-btn"
            >
              {localLogoUrl ? (
                <img
                  src={localLogoUrl}
                  alt="Platform Logo Preview"
                  className="w-full h-full object-contain p-1 group-hover:opacity-40 transition-all"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-indigo-500">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                    {computedInitials}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Default Badge</span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-black text-white px-2 py-1 bg-indigo-600 rounded-lg text-center shadow">
                  CHANGE
                </span>
              </div>
            </button>

            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPickerTarget('logo')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose / Upload Logo
                </button>
                {localLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalLogoUrl('');
                      setIsSaved(false);
                    }}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-colors border border-red-200 dark:border-red-900/40 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Logo (Use Initials)
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={localLogoUrl}
                  onChange={(e) => {
                    setLocalLogoUrl(e.target.value);
                    setIsSaved(false);
                  }}
                  placeholder="Or enter image URL directly (e.g. https://.../logo.png)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Name Control */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Platform Text Name
          </label>
          <input
            type="text"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              setIsSaved(false);
            }}
            placeholder="WatchWDS (Leave blank to hide text)"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This changes the display text next to your logo in headers, footers, and browser page titles. <strong>Leave empty to hide text</strong> and show only the logo.
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
              onClick={() => setPickerTarget('favicon')}
              className="relative w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950 group shrink-0"
              title="Click to choose favicon from your media library"
              id="favicon-picker-btn"
            >
              {localFavicon ? (
                <img
                  src={localFavicon}
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
                onClick={() => setPickerTarget('favicon')}
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

      {pickerTarget && (
        <MediaPicker
          onSelect={(url) => {
            if (pickerTarget === 'logo') {
              setLocalLogoUrl(url);
            } else if (pickerTarget === 'favicon') {
              setLocalFavicon(url);
            }
            setPickerTarget(null);
            setIsSaved(false);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}

function BlogVisibilitySettings() {
  const { blogSettings, setBlogSettings } = useSettingsStore();
  const [enabled, setEnabled] = useState(blogSettings?.enabled === true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setEnabled(blogSettings?.enabled === true);
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

function WalletVisibilitySettings() {
  const { walletSettings, setWalletSettings } = useSettingsStore();
  const [enabled, setEnabled] = useState(walletSettings?.enabled !== false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setEnabled(walletSettings?.enabled !== false);
  }, [walletSettings]);

  const handleSave = () => {
    setWalletSettings({ enabled });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-500" />
            <h4 className="font-bold text-slate-900 dark:text-white">User Wallet & Balance System Toggle</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Enable or disable the global user wallet and account balance system. When disabled, balance badges, top-up options, and wallet checkout deductions will be hidden and locked without deleting user balances.
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
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-yellow-500"></div>
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
              : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
          }`}
        >
          {isSaved ? <><CheckCircle className="w-4 h-4" />Saved</> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

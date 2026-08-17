import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store';
import { ShieldCheck, Lock, AlertTriangle, Smartphone, Mail, Activity, CheckCircle, RefreshCw, Server } from 'lucide-react';

interface SecurityConfig {
  enable_device_verification: boolean;
  trusted_device_expiry_days: number;
  enable_suspicious_login_alerts: boolean;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  admin_ip_whitelist_enabled: boolean;
  admin_whitelisted_ips: string;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  reason: string;
  created_at: string;
}

export function AdminSecuritySettings() {
  const { captchaEnabled, setCaptchaEnabled, captchaTolerance, setCaptchaTolerance } = useSettingsStore();

  const [config, setConfig] = useState<SecurityConfig>({
    enable_device_verification: true,
    trusted_device_expiry_days: 60,
    enable_suspicious_login_alerts: true,
    max_failed_attempts: 5,
    lockout_duration_minutes: 15,
    admin_ip_whitelist_enabled: false,
    admin_whitelisted_ips: '',
  });

  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'policy' | 'audit'>('policy');

  useEffect(() => {
    fetchSecuritySettings();
    fetchAuditLogs();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const res = await fetch('/api/admin/security/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (e) {
      console.error('Error fetching security settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/security/login-attempts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLoginAttempts(data.attempts || []);
      }
    } catch (e) {
      console.error('Error fetching security audit logs:', e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (e) {
      console.error('Error saving security settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading security configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSubTab('policy')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'policy'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Security Policies & 2FA
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'audit'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Activity className="w-4 h-4" />
          Login Activity Logs ({loginAttempts.length})
        </button>
      </div>

      {activeSubTab === 'policy' && (
        <div className="space-y-6">
          {/* Layered Authentication & Device Verification */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-6">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Untrusted Device Verification (2FA via Email)
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Require a 6-digit verification code sent via SMTP whenever users log in from a new, untrusted, or expired device, or when high-risk login signals (e.g. new country or browser) are detected.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={config.enable_device_verification}
                  onChange={(e) => setConfig({ ...config, enable_device_verification: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {config.enable_device_verification && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Trusted Device Expiry Period (Days)
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Devices unused for longer than this duration will require 2FA email re-verification upon login.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={config.trusted_device_expiry_days}
                      onChange={(e) => setConfig({ ...config, trusted_device_expiry_days: Number(e.target.value) })}
                      className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-medium text-slate-500">days (Default: 60)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Suspicious Login Email Alerts</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Send an alert email to users when logins originate from an unfamiliar country or browser.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={config.enable_suspicious_login_alerts}
                      onChange={(e) => setConfig({ ...config, enable_suspicious_login_alerts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Brute-Force & Lockout Settings */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Brute-Force & Temporary Lockout Protection
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Automatically block IP addresses and temporarily lock accounts after repeated failed login attempts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Max Failed Login Attempts
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Number of failed attempts allowed within 15 minutes before triggering lockout.
                </p>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={config.max_failed_attempts}
                  onChange={(e) => setConfig({ ...config, max_failed_attempts: Number(e.target.value) })}
                  className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Lockout Duration (Minutes)
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Duration in minutes the account remains locked before permitting login retries.
                </p>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={config.lockout_duration_minutes}
                  onChange={(e) => setConfig({ ...config, lockout_duration_minutes: Number(e.target.value) })}
                  className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Admin IP Whitelist Settings */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-6">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Administrator IP Whitelist Enforcement
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Restrict administrator access exclusively to specified IP addresses or ranges.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={config.admin_ip_whitelist_enabled}
                  onChange={(e) => setConfig({ ...config, admin_ip_whitelist_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {config.admin_ip_whitelist_enabled && (
              <div className="pt-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Allowed Admin IP Addresses (Comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={config.admin_whitelisted_ips || ''}
                  onChange={(e) => setConfig({ ...config, admin_whitelisted_ips: e.target.value })}
                  placeholder="e.g. 192.168.1.1, 10.0.0.1, 127.0.0.1"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Ensure your current IP address is included before enabling, or administrator access will be blocked.
                </p>
              </div>
            )}
          </div>

          {/* Sliding Puzzle CAPTCHA Controls */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Sliding Puzzle CAPTCHA
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Require users to solve a sliding puzzle verification before logging in or registering.
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

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Alignment Tolerance (Difficulty)
                </label>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ±{captchaTolerance}px
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={captchaTolerance}
                onChange={(e) => setCaptchaTolerance(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                isSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'
              }`}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isSaved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Saved Successfully
                </>
              ) : (
                'Save Security Policy'
              )}
            </button>
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing recent 100 login events across all accounts.
            </p>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">User Email</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                  {loginAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No login activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(attempt.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {attempt.email || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {attempt.ip_address}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              attempt.success
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                            }`}
                          >
                            {attempt.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {attempt.reason || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

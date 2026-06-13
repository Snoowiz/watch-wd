import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store';
import { 
  Chrome, Key, Copy, Check, ExternalLink, 
  ShieldCheck, AlertCircle, Eye, EyeOff, 
  HelpCircle, Lock 
} from 'lucide-react';

export function AdminGoogleAuthSettings() {
  const { googleAuthSettings, setGoogleAuthSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  });

  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState('');

  // Dynamically set default Redirect URI on client load
  const currentRedirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth/google/callback` 
    : 'https://watchwds.com/api/auth/google/callback';

  useEffect(() => {
    if (googleAuthSettings) {
      setLocalSettings({
        enabled: googleAuthSettings.enabled || false,
        clientId: googleAuthSettings.clientId || '',
        clientSecret: googleAuthSettings.clientSecret || '',
        redirectUri: googleAuthSettings.redirectUri || currentRedirectUri
      });
    }
  }, [googleAuthSettings, currentRedirectUri]);

  const handleCopyUri = () => {
    navigator.clipboard.writeText(localSettings.redirectUri || currentRedirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidateAndSave = async () => {
    setValidationErrors([]);
    setValidationSuccess('');
    setIsValidating(true);

    // 1. Client-Side Format Validations
    const errors: string[] = [];
    if (localSettings.enabled) {
      if (!localSettings.clientId) {
        errors.push("Google Client ID is required when Google Sign-In is enabled.");
      } else if (!/^[0-9a-zA-Z._-]+.apps.googleusercontent.com$/.test(localSettings.clientId)) {
        errors.push("Invalid Client ID format. It must end with '.apps.googleusercontent.com'.");
      }

      if (!localSettings.clientSecret) {
        errors.push("Google Client Secret is required when Google Sign-In is enabled.");
      } else if (localSettings.clientSecret.length < 10) {
        errors.push("Google Client Secret appears too short to be a valid OAuth secret.");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidating(false);
      return;
    }

    try {
      // Retrieve auth token for admin endpoint check
      const token = localStorage.getItem('auth_token') || useSettingsStore.getState() as any; 
      // If we are testing configurations, we can ping the validation endpoint
      const res = await fetch('/api/auth/google/validate-credentials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // use token from localStorage
        },
        body: JSON.stringify({
          clientId: localSettings.clientId,
          clientSecret: localSettings.clientSecret
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.errors ? data.errors.join('\n') : (data.error || 'Validation failed.'));
      }

      // If valid, commit to the global settings store
      setGoogleAuthSettings({
        ...localSettings,
        redirectUri: localSettings.redirectUri || currentRedirectUri
      });

      setValidationSuccess("Google Sign-In configuration validated and saved successfully.");
    } catch (err: any) {
      setValidationErrors(err.message.split('\n'));
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Config Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Chrome className="w-5 h-5 text-red-500" />
                  Google OAuth Configuration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enable and configure Google OAuth for "Continue with Google" sign-ins.
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={localSettings.enabled}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, enabled: e.target.checked });
                      setValidationSuccess('');
                      setValidationErrors([]);
                    }}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${localSettings.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.enabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {localSettings.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Error alerts */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-200 dark:border-red-500/30 space-y-1">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Validation Errors:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 font-medium">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success alerts */}
            {validationSuccess && (
              <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm border border-green-200 dark:border-green-500/30 flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-5 h-5 shrink-0 text-green-500" />
                <span>{validationSuccess}</span>
              </div>
            )}

            {/* Config Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  Google Client ID
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!localSettings.enabled}
                    value={localSettings.clientId}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, clientId: e.target.value });
                      setValidationSuccess('');
                    }}
                    placeholder="1234567890-xyz.apps.googleusercontent.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Chrome className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                  The client ID generated for your application inside the Google Cloud credentials list.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  Google Client Secret
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    disabled={!localSettings.enabled}
                    value={localSettings.clientSecret}
                    onChange={(e) => {
                      setLocalSettings({ ...localSettings, clientSecret: e.target.value });
                      setValidationSuccess('');
                    }}
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  />
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    disabled={!localSettings.enabled}
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                  Keep this confidential. Securely verify logins against Google authentication API.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Authorized Redirect URI (Callback)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={localSettings.redirectUri || currentRedirectUri}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 cursor-not-allowed select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 hover:border-slate-300"
                    title="Copy redirect URI to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
                  Add this URI to the <strong>Authorized redirect URIs</strong> field inside Google Cloud OAuth settings.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={handleValidateAndSave}
                disabled={isValidating}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Validate and Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Setup Guide */}
        <div className="space-y-6">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Setup Instructions
            </h4>
            
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                Follow these steps to generate Google OAuth credentials:
              </p>
              
              <div className="space-y-2 border-l border-slate-300 dark:border-slate-700 pl-3">
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">1. Cloud Console</strong>
                  <p className="mt-0.5">
                    Open the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-500 font-bold inline-flex items-center gap-0.5 hover:underline">
                      Google Cloud Credentials Console
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>.
                  </p>
                </div>
                
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">2. Select Project</strong>
                  <p className="mt-0.5">Choose your project or create a new one (e.g. <code>watchwds</code>).</p>
                </div>

                <div>
                  <strong className="text-slate-800 dark:text-slate-200">3. OAuth Consent Screen</strong>
                  <p className="mt-0.5">Go to OAuth Consent Screen, select User Type <strong>External</strong>, and fill in the application details.</p>
                </div>

                <div>
                  <strong className="text-slate-800 dark:text-slate-200">4. Create Client ID</strong>
                  <p className="mt-0.5">Click <strong>+ Create Credentials</strong> &gt; <strong>OAuth Client ID</strong>.</p>
                </div>

                <div>
                  <strong className="text-slate-800 dark:text-slate-200">5. Configure Application</strong>
                  <p className="mt-0.5">Set Application type to <strong>Web application</strong>.</p>
                </div>

                <div>
                  <strong className="text-slate-800 dark:text-slate-200">6. Set Origins & Redirects</strong>
                  <p className="mt-0.5">
                    Authorized JS origin: <code className="block mt-0.5 bg-slate-200 dark:bg-slate-800 p-1 rounded font-mono text-2xs truncate select-all">{typeof window !== 'undefined' ? window.location.origin : 'https://watchwds.com'}</code>
                  </p>
                  <p className="mt-1">
                    Authorized redirect URI: <code className="block mt-0.5 bg-slate-200 dark:bg-slate-800 p-1 rounded font-mono text-2xs truncate select-all">{currentRedirectUri}</code>
                  </p>
                </div>

                <div>
                  <strong className="text-slate-800 dark:text-slate-200">7. Save & Copy</strong>
                  <p className="mt-0.5">Copy the client ID and client secret, paste them into the configuration inputs on the left, and click <strong>Validate and Save</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

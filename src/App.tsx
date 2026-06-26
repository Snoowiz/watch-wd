/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WifiOff, Loader2 } from 'lucide-react';
import { useAuthStore, useFeatureStore, useThemeStore, useSettingsStore, useAdStore, usePurchaseStore } from './store';
import { Preloader } from './components/Preloader';
import { Layout } from './components/Layout';
import { UIFeedbackProvider } from './components/UIFeedbackProvider';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { Forum } from './pages/Forum';
import { ForumCategory } from './pages/ForumCategory';
import { ForumTopic } from './pages/ForumTopic';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { CreatorDashboard } from './pages/creator/CreatorDashboard';
import { StudioDashboard } from './pages/creator/StudioDashboard';
import { StudioManagement } from './pages/admin/StudioManagement';
import { BlogList } from './pages/BlogList';
import { NotFound } from './pages/NotFound';
import { ServerError } from './pages/ServerError';
import { Unauthorized } from './pages/Unauthorized';
import { Forbidden } from './pages/Forbidden';
import { BlogPostDetails } from './pages/BlogPostDetails';
import { CategoryPage } from './pages/CategoryPage';
import { SavedMatches } from './pages/SavedMatches';
import { CompleteProfileModal } from './components/CompleteProfileModal';
import { Checkout } from './pages/Checkout';
import { CheckoutSuccess } from './pages/CheckoutSuccess';
import { CheckoutCancel } from './pages/CheckoutCancel';
import { Plans } from './pages/Plans';
import { MyPlans } from './pages/MyPlans';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { About } from './pages/About';
import { TermsOfUse } from './pages/TermsOfUse';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { LogoutModal } from './components/LogoutModal';
import { SearchPage } from './pages/SearchPage';

export default function App() {
  const { token, setAuth, logout, user, originalUser, revertLoginAs } = useAuthStore();
  const { theme, setDarkMode } = useThemeStore();
  const { seoSettings, platformName: storedPlatformName, preloaderEnabled } = useSettingsStore();
  const platformName = storedPlatformName || 'WatchWDS';

  const { setFeatures } = useFeatureStore();
  const { fetchAds } = useAdStore();
  const { fetchPurchases, fetchTransactions } = usePurchaseStore();
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileModalDismissed, setProfileModalDismissed] = useState(
    () => localStorage.getItem('profileModalDismissed') === 'true'
  );
  
  const handleDismissProfileModal = () => {
    setProfileModalDismissed(true);
    localStorage.setItem('profileModalDismissed', 'true');
  };

  const showCompleteProfile = !!(user && (!user.phone || !user.dob || !user.gender) && !profileModalDismissed);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Apply global SEO Settings
    if (seoSettings) {
      const baseTitle = seoSettings.metaTitle || 'Watch WDS - Live Sports Streaming';
      document.title = baseTitle.replace(/WD\s*Sportz|WatchWDS/gi, platformName);
      
      const updateMeta = (name: string, content: string, isProperty = false) => {
        let el = document.querySelector(isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          if (isProperty) {
            el.setAttribute('property', name);
          } else {
            el.setAttribute('name', name);
          }
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      updateMeta('description', seoSettings.metaDescription);
      updateMeta('keywords', seoSettings.metaKeywords);
      updateMeta('og:title', seoSettings.ogTitle, true);
      updateMeta('og:description', seoSettings.ogDescription, true);
      if (seoSettings.ogImage) updateMeta('og:image', seoSettings.ogImage, true);
      if (seoSettings.twitterHandle) updateMeta('twitter:site', seoSettings.twitterHandle);

      // Inject Google Analytics if present
      if (seoSettings.googleAnalyticsId) {
        let gaScript = document.getElementById('ga-script');
        if (!gaScript) {
          gaScript = document.createElement('script');
          gaScript.id = 'ga-script';
          gaScript.setAttribute('async', '');
          gaScript.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${seoSettings.googleAnalyticsId}`);
          document.head.appendChild(gaScript);

          const gaInit = document.createElement('script');
          gaInit.id = 'ga-init-script';
          gaInit.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${seoSettings.googleAnalyticsId}');
          `;
          document.head.appendChild(gaInit);
        }
      }

      // Inject GTM if present
      if (seoSettings.googleTagManagerId) {
        let gtmScript = document.getElementById('gtm-script');
        if (!gtmScript) {
          gtmScript = document.createElement('script');
          gtmScript.id = 'gtm-script';
          gtmScript.innerHTML = `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${seoSettings.googleTagManagerId}');
          `;
          document.head.appendChild(gtmScript);
        }
      }
    }
  }, [seoSettings, platformName]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = () => {
      const activeIsDark = theme === 'system' ? mediaQuery.matches : theme === 'dark';
      
      if (activeIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      setDarkMode(activeIsDark);
    };
    
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme, setDarkMode]);

  useEffect(() => {
    let featuresLoaded = false;
    let authChecked = false;
    let timeoutCompleted = false;
    let adsFetched = false;

    const checkFinished = () => {
      if (featuresLoaded && authChecked && timeoutCompleted && adsFetched) {
        setInitialLoading(false);
      }
    };

    // 1. Minimum 1.5s duration timer
    const timer = setTimeout(() => {
      timeoutCompleted = true;
      checkFinished();
    }, 1500);

    // 2. Fetch features
    fetch('/api/features')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFeatures(data);
        }
        featuresLoaded = true;
        checkFinished();
      })
      .catch(() => {
        featuresLoaded = true;
        checkFinished();
      });

    // Fetch Ads
    fetchAds().finally(() => {
      adsFetched = true;
      checkFinished();
    });

    // 3. Fetch user if token exists
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Invalid token');
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error('Invalid response type');
          }
          return res.json();
        })
        .then(data => {
          setAuth(data.user, token);
          fetchPurchases();
          fetchTransactions();
          authChecked = true;
          checkFinished();
        })
        .catch(() => {
          logout();
          authChecked = true;
          checkFinished();
        });
    } else {
      authChecked = true;
      checkFinished();
    }

    return () => clearTimeout(timer);
  }, [token, setAuth, logout, setFeatures, fetchAds, fetchPurchases, fetchTransactions]);

  if (preloaderEnabled !== false && initialLoading) {
    return <Preloader />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {originalUser && (
          <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-bold flex items-center justify-center gap-4 sticky top-0 z-[100]">
            <span>Logged in as: {user?.name} (Admin: {originalUser.name})</span>
            <button 
              onClick={revertLoginAs}
              className="bg-white text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Revert to Admin
            </button>
          </div>
        )}
        <CompleteProfileModal 
          isOpen={showCompleteProfile} 
          onClose={handleDismissProfileModal} 
        />
        <LogoutModal />
        {isOffline && (
          <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 font-bold text-sm flex items-center gap-3">
              <div className="relative">
                <WifiOff className="w-5 h-5 text-red-400" />
                <Loader2 className="w-3 h-3 text-red-200 animate-spin absolute -bottom-1 -right-1" />
              </div>
              <div>
                <p>You are offline</p>
                <p className="text-xs text-slate-400 font-normal">Reconnecting...</p>
              </div>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/creator/*" element={<CreatorDashboard />} />
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/matches/:slug" element={<MatchDetail />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/forum/category/:id" element={<ForumCategory />} />
                <Route path="/forum/topic/:id" element={<ForumTopic />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/blog" element={<BlogList />} />
                <Route path="/blog/:slug" element={<BlogPostDetails />} />
                <Route path="/saved" element={<SavedMatches />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/checkout/cancel" element={<CheckoutCancel />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/my-plans" element={<MyPlans />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/creator/studio" element={<StudioDashboard />} />
                <Route path="/401" element={<Unauthorized />} />
                <Route path="/403" element={<Forbidden />} />
                <Route path="/500" element={<ServerError />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          } />
        </Routes>
        <UIFeedbackProvider />
      </div>
    </Router>
  );
}

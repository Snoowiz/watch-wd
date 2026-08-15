import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store';

export function SEOHeadManager() {
  const location = useLocation();
  const { seoSettings, perPageSeo, platformName: storedPlatformName } = useSettingsStore();
  const platformName = storedPlatformName || 'WatchWDS';

  useEffect(() => {
    if (!seoSettings) return;

    // Find per-page config if matching path
    const pageConfig = perPageSeo?.find(p => p.path === location.pathname);

    // Title
    const title = pageConfig?.title || seoSettings.metaTitle || 'Watch WDS - Live Sports Streaming';
    document.title = title.replace(/WD\s*Sportz|WatchWDS/gi, platformName);

    // Helper to set/create meta element
    const updateMeta = (name: string, content: string, isProperty = false) => {
      if (!content) return;
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

    // Description, Keywords
    updateMeta('description', pageConfig?.description || seoSettings.metaDescription);
    updateMeta('keywords', pageConfig?.keywords || seoSettings.metaKeywords);

    // OpenGraph
    updateMeta('og:title', pageConfig?.title || seoSettings.ogTitle || title, true);
    updateMeta('og:description', pageConfig?.description || seoSettings.ogDescription || seoSettings.metaDescription, true);
    if (pageConfig?.ogImage || seoSettings.ogImage) {
      updateMeta('og:image', pageConfig?.ogImage || seoSettings.ogImage, true);
    }
    updateMeta('og:url', window.location.href, true);
    updateMeta('og:type', 'website', true);

    // Twitter
    if (seoSettings.twitterHandle) updateMeta('twitter:site', seoSettings.twitterHandle);
    updateMeta('twitter:card', seoSettings.twitterCardType || 'summary_large_image');
    updateMeta('twitter:title', pageConfig?.title || seoSettings.ogTitle || title);
    updateMeta('twitter:description', pageConfig?.description || seoSettings.ogDescription || seoSettings.metaDescription);

    // Robots / Indexing
    const isNoIndex = pageConfig?.noIndex || seoSettings.allowIndexing === false;
    const isNoFollow = pageConfig?.noFollow;
    let robotsContent = 'index, follow';
    if (isNoIndex && isNoFollow) {
      robotsContent = 'noindex, nofollow';
    } else if (isNoIndex) {
      robotsContent = 'noindex, follow';
    } else if (isNoFollow) {
      robotsContent = 'index, nofollow';
    }
    updateMeta('robots', robotsContent);

    // Site Verification Meta Tags
    if (seoSettings.googleVerification) updateMeta('google-site-verification', seoSettings.googleVerification);
    if (seoSettings.bingVerification) updateMeta('msvalidate.01', seoSettings.bingVerification);
    if (seoSettings.yandexVerification) updateMeta('yandex-verification', seoSettings.yandexVerification);
    if (seoSettings.pinterestVerification) updateMeta('p:domain_verify', seoSettings.pinterestVerification);
    if (seoSettings.baiduVerification) updateMeta('baidu-site-verification', seoSettings.baiduVerification);

    // Canonical Tag
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    const canonicalHref = pageConfig?.canonicalUrl || 
      (seoSettings.canonicalBaseUrl ? `${seoSettings.canonicalBaseUrl.replace(/\/$/, '')}${location.pathname}` : window.location.href);
    
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalHref);

    // JSON-LD Per-Page Schema
    let perPageSchemaScript = document.getElementById('seo-jsonld-perpage');
    if (pageConfig?.jsonLdSchema) {
      if (!perPageSchemaScript) {
        perPageSchemaScript = document.createElement('script');
        perPageSchemaScript.id = 'seo-jsonld-perpage';
        perPageSchemaScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(perPageSchemaScript);
      }
      perPageSchemaScript.textContent = pageConfig.jsonLdSchema;
    } else if (perPageSchemaScript) {
      perPageSchemaScript.remove();
    }

    // Default Organization JSON-LD Schema
    if (seoSettings.organizationName) {
      let orgSchemaScript = document.getElementById('seo-jsonld-org');
      if (!orgSchemaScript) {
        orgSchemaScript = document.createElement('script');
        orgSchemaScript.id = 'seo-jsonld-org';
        orgSchemaScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(orgSchemaScript);
      }
      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': seoSettings.organizationType || 'Organization',
        'name': seoSettings.organizationName,
        'url': seoSettings.canonicalBaseUrl || window.location.origin,
        'logo': seoSettings.organizationLogo || undefined
      };
      orgSchemaScript.textContent = JSON.stringify(orgSchema);
    }

    // Analytics: GA
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

    // Analytics: GTM
    if (seoSettings.googleTagManagerId) {
      let gtmScript = document.getElementById('gtm-script');
      if (!gtmScript) {
        gtmScript = document.createElement('script');
        gtmScript.id = 'gtm-script';
        gtmScript.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtag/id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${seoSettings.googleTagManagerId}');
        `;
        document.head.appendChild(gtmScript);
      }
    }
  }, [location.pathname, seoSettings, perPageSeo, platformName]);

  return null;
}

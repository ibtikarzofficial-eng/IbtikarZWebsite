(function () {
  "use strict";

  const GA4_ID = "G-PWP9SL8SKG";
  const CLARITY_ID = "ycv9neolgw";
  const CONSENT_KEY = "ibtikarz_analytics_consent";

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  function readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY) || "unknown";
    } catch (_) {
      return "unknown";
    }
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch (_) {
      // The preference still applies for the current page.
    }
  }

  const initiallyGranted = readConsent() === "granted";

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: initiallyGranted ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500
  });

  window.gtag("set", "ads_data_redaction", true);

  function loadGoogleAnalytics() {
    if (document.getElementById("ibtikarz-ga4")) return;

    const script = document.createElement("script");
    script.id = "ibtikarz-ga4";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(GA4_ID);
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", GA4_ID, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function loadMicrosoftClarity() {
    if (document.getElementById("ibtikarz-clarity")) return;

    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    const script = document.createElement("script");
    script.id = "ibtikarz-clarity";
    script.async = true;
    script.src = "https://www.clarity.ms/tag/" + CLARITY_ID;
    document.head.appendChild(script);

    window.clarity("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "granted"
    });
  }

  function grant() {
    saveConsent("granted");
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    loadGoogleAnalytics();
    loadMicrosoftClarity();
    window.dispatchEvent(new CustomEvent("ibtikarz:consent", {
      detail: { analytics: true }
    }));
  }

  function deny() {
    const scriptsLoaded = Boolean(
      document.getElementById("ibtikarz-ga4") ||
      document.getElementById("ibtikarz-clarity")
    );

    saveConsent("denied");
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied"
    });

    if (typeof window.clarity === "function") {
      window.clarity("consentv2", {
        ad_Storage: "denied",
        analytics_Storage: "denied"
      });
      window.clarity("consent", false);
    }

    window.dispatchEvent(new CustomEvent("ibtikarz:consent", {
      detail: { analytics: false }
    }));

    if (scriptsLoaded) {
      window.setTimeout(function () {
        window.location.reload();
      }, 80);
    }
  }

  window.IbtikarZConsent = {
    current: readConsent,
    grant,
    deny
  };

  if (initiallyGranted) {
    loadGoogleAnalytics();
    loadMicrosoftClarity();
  }
})();

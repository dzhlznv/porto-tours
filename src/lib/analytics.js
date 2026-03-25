const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

function getStoredUtmParams() {
  return UTM_KEYS.reduce((accumulator, key) => {
    const value = window.localStorage.getItem(key);
    if (value) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

export function initAnalyticsContext() {
  if (typeof window === 'undefined') {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value) {
      window.localStorage.setItem(key, value);
    }
  });
}

export function trackEvent(name, data = {}) {
  if (typeof window === 'undefined' || typeof window.va !== 'function') {
    return;
  }

  window.va('event', {
    name,
    data: {
      ...data,
      ...getStoredUtmParams()
    }
  });
}

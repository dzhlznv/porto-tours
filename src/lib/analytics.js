export function trackEvent(name, data = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.va === 'function') {
    window.va('event', {
      name,
      data
    });
  }
}

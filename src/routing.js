export function normalizePathname(pathname) {
  if (!pathname) {
    return '/';
  }

  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

export function normalizeHostname(hostname) {
  if (!hostname) {
    return '';
  }

  return hostname.toLowerCase().replace(/:\d+$/, '');
}

export function isMapHost(hostname) {
  const normalizedHost = normalizeHostname(hostname);

  if (!normalizedHost) {
    return false;
  }

  if (normalizedHost === 'map.porto2you.com') {
    return true;
  }

  return normalizedHost.startsWith('map.');
}

export function getRouteKey({ pathname, hostname }) {
  const normalizedPath = normalizePathname(pathname);
  const mapHost = isMapHost(hostname);

  if (normalizedPath === '/map') {
    return 'map';
  }

  if (normalizedPath === '/' && mapHost) {
    return 'map';
  }

  return 'landing';
}

/**
 * Safely generates the public, customer-facing store link.
 * If the application is running in a private developer preview (ais-dev-),
 * it translates the origin to the public shared preview URL (ais-pre-)
 * so that customers do not face "Permission Denied" or "حدث خطأ غير معروف" errors.
 */
export function getStoreLink(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-pre-lb77c3cfcml44alz4xw36x-105836077369.europe-west2.run.app?store=true';
  }
  
  let origin = window.location.origin;
  
  // If we are on the developer private URL, rewrite it to the shared public URL
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  
  return `${origin}?store=true`;
}

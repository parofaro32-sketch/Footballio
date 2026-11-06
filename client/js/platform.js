export const isMobileUA = () => /Android|webOS|iPhone|iPad|iPod|Mobile|IEMobile/i.test(navigator.userAgent);
export const isPointerCoarse = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
export const detectMobile = () => isMobileUA() || isPointerCoarse();

let preferred = null;
export function setPreferredScheme(scheme) { preferred = scheme; localStorage.setItem('fb_controls', scheme); }
export function getPreferredScheme() {
  if (preferred !== null) return preferred;
  const stored = localStorage.getItem('fb_controls');
  if (stored === 'pc' || stored === 'mobile') return stored;
  return null;
}
export function controlScheme() {
  const p = getPreferredScheme();
  if (p) return p;
  return detectMobile() ? 'mobile' : 'pc';
}
export function isMobile() { return controlScheme() === 'mobile'; }
export function isPC() { return controlScheme() === 'pc'; }

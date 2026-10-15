const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Logo : un calendrier qui se remplit, du gris à l'orange foncé ; la dernière case, bleue, est le chômage qui bascule. */
export const Logo = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
    <rect x="1" y="1" width="8" height="8" rx="2" fill="#ECEEF2" />
    <rect x="11" y="1" width="8" height="8" rx="2" fill="#F6A66A" />
    <rect x="21" y="1" width="8" height="8" rx="2" fill="#E8762B" />
    <rect x="1" y="11" width="8" height="8" rx="2" fill="#F6A66A" />
    <rect x="11" y="11" width="8" height="8" rx="2" fill="#E8762B" />
    <rect x="21" y="11" width="8" height="8" rx="2" fill="#B4500F" />
    <rect x="1" y="21" width="8" height="8" rx="2" fill="#E8762B" />
    <rect x="11" y="21" width="8" height="8" rx="2" fill="#B4500F" />
    <rect x="21" y="21" width="8" height="8" rx="2" fill="#2F6FE4" />
  </svg>
);
export const Plus = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base}><path d="M12 5v14M5 12h14" /></svg>;
export const Sliders = () => <svg width="20" height="20" viewBox="0 0 24 24" {...base}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /></svg>;
export const Save = () => <svg width="18" height="18" viewBox="0 0 24 24" {...base}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
export const Left = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base}><path d="M15 5l-7 7 7 7" /></svg>;
export const Right = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base}><path d="M9 5l7 7-7 7" /></svg>;
export const Target = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></svg>;
export const Info = () => <svg width="20" height="20" viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h0" /></svg>;
export const Warn = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base}><path d="M12 3 2 21h20L12 3zM12 10v5M12 18h0" /></svg>;
export const Check = () => <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={3}><path d="M5 12l5 5 9-10" /></svg>;
export const Close = () => <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth={2.6}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Trash = () => <svg width="15" height="15" viewBox="0 0 24 24" {...base}><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>;
export const Calendar = () => <svg width="20" height="20" viewBox="0 0 24 24" {...base}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>;
export const Clock = () => <svg width="20" height="20" viewBox="0 0 24 24" {...base}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>;
export const GitHub = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z" /></svg>
);

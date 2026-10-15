import { useEffect, useState } from 'react';

/** Routage par le fragment d'URL (#/…) : fonctionne sur n'importe quel hébergement statique. */
export function useRoute(): string {
  const [route, setRoute] = useState(() => location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const on = () => {
      setRoute(location.hash.replace(/^#/, '') || '/');
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string) {
  location.hash = path;
}

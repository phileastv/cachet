import { useEffect, useLayoutEffect, useState } from 'react';
import { useStore } from '../state/store';

export interface TourStep {
  /** Élément ciblé : valeur de son attribut data-tour. */
  target: string;
  title: string;
  body: React.ReactNode;
}

/**
 * Petite visite guidée : met un élément en valeur et affiche une bulle d'explication.
 * Ne s'affiche qu'une fois par visite (mémorisé dans les données de l'utilisateur).
 */
export function Tour({ id, steps }: { id: string; steps: TourStep[] }) {
  const { data, update } = useStore();
  const seen = (data.toursSeen ?? []).includes(id);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[i];

  useEffect(() => {
    if (seen || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [seen, step]);

  useLayoutEffect(() => {
    if (seen || !step) return;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const t = setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearInterval(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [seen, step]);

  if (seen || !step) return null;

  const finish = () => update((d) => ({ ...d, toursSeen: [...new Set([...(d.toursSeen ?? []), id])] }));
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const bubbleW = Math.min(380, vw - 32);
  let top = vh / 2 - 100;
  let left = vw / 2 - bubbleW / 2;
  if (box) {
    const below = box.top + box.height + 14;
    const above = box.top - 14 - 220;
    top = below + 220 < vh ? below : above > 0 ? above : Math.max(16, Math.min(vh - 236, box.top + 16));
    left = Math.max(16, Math.min(vw - bubbleW - 16, box.left));
  }

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title">
      {box ? <div className="tour-spot" style={box} /> : <div className="tour-dim" />}
      <div className="tour-bubble" style={{ top, left, width: bubbleW }}>
        <span className="tiny muted" style={{ fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{i + 1} / {steps.length}</span>
        <strong id="tour-title" style={{ fontFamily: 'var(--hand)', fontSize: 28, lineHeight: 1.1 }}>{step.title}</strong>
        <div className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>{step.body}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <button className="btn ghost sm" onClick={finish}>Passer</button>
          <span style={{ display: 'flex', gap: 6 }}>
            {i > 0 && <button className="btn sm" onClick={() => setI(i - 1)}>← Précédent</button>}
            {i < steps.length - 1
              ? <button className="btn dark sm" onClick={() => setI(i + 1)}>Suivant →</button>
              : <button className="btn dark sm" onClick={finish}>C'est parti !</button>}
          </span>
        </div>
      </div>
    </div>
  );
}

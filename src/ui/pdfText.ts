import { itemsToRows, type Row } from '../domain/releve';

/**
 * Texte d'un PDF, ligne par ligne, lu dans le navigateur avec pdf.js (chargé seulement au premier import).
 * Le fichier ne quitte jamais l'ordinateur ; le document est détruit après lecture.
 */
export async function pdfRows(file: File): Promise<Row[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const rows: Row[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      const items = content.items.flatMap((it) => ('str' in it ? [{ str: it.str, x: it.transform[4], y: it.transform[5] }] : []));
      rows.push(...itemsToRows(items));
    }
    return rows;
  } finally {
    await doc.destroy();
  }
}

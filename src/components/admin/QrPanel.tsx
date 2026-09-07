'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  eventId: string;
  url: string;
  hosts: string;
}

/**
 * The QR code that goes on the dessert table.
 *
 * Rendered client-side onto a canvas so "Download PNG" hands back exactly what
 * is on screen, at print resolution rather than screen resolution.
 */
export default function QrPanel({ eventId, url, hosts }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw at print resolution so the PNG download is usable on a printed
    // table card, then drop the inline sizing the library writes so the
    // canvas displays at its CSS size instead of 1024px square.
    QRCode.toCanvas(canvas, url, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#4a2c33ff', light: '#ffffffff' },
    })
      .then(() => {
        canvas.removeAttribute('style');
        setReady(true);
      })
      .catch(() => setReady(false));
  }, [url]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `wish-wall-${eventId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-5">
      <div className="rounded-2xl border border-[var(--card-line)] bg-white p-3">
        <canvas ref={canvasRef} className="size-44 rounded-lg" aria-label={`QR code for ${hosts}`} />
      </div>

      <p className="break-all text-center text-[0.78rem] text-[var(--ink-soft)]">{url}</p>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={download}
          disabled={!ready}
          className="h-10 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={copy}
          className="h-10 rounded-full border border-[var(--card-line)] px-5 text-[0.85rem] font-medium text-[var(--ink)] transition-colors hover:bg-cocoa-50"
        >
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

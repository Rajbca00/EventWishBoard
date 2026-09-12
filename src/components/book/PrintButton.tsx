'use client';

/**
 * "Print or save as PDF" is how a browser turns this page into the physical
 * keepsake, so it gets a real button rather than leaving people to find Ctrl+P.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.88rem] font-medium text-white transition-transform active:scale-[0.97]"
      style={{ background: 'linear-gradient(135deg,var(--accent-fill,var(--accent)),var(--accent-2))' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 9V4h10v5M7 19H5.5A2.5 2.5 0 0 1 3 16.5v-4A2.5 2.5 0 0 1 5.5 10h13a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <rect x="7" y="15" width="10" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
      Print or save as PDF
    </button>
  );
}

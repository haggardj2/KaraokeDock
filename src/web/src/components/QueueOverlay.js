import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
export const DEFAULT_OVERLAY_SETTINGS = {
    visible: true,
    height: 90,
    qrSize: 60,
    customMessage: '',
    showRoller: true,
    showQrCode: true,
    hideSingerQueue: false
};
export default function QueueOverlay({ now, upNext, settings = DEFAULT_OVERLAY_SETTINGS }) {
    // Don't render if not visible
    if (!settings.visible) {
        return null;
    }
    // Build ticker text parts
    const parts = useMemo(() => {
        const items = [];
        const fmt = (q) => {
            if (settings.hideSingerQueue) {
                return q.requested_by ? `${q.requested_by}` : 'Anonymous';
            }
            return `${q.artist || 'Unknown'} — ${q.title}${q.requested_by ? `  (requested by ${q.requested_by})` : ''}`;
        };
        if (now)
            items.push(`NOW: ${fmt(now)}`);
        if (upNext?.length) {
            items.push(`UP NEXT: ` +
                upNext
                    .map(fmt)
                    .join('  •  '));
        }
        return items;
    }, [now, upNext]);
    const text = parts.length ? parts.join('   •   ') : 'Waiting for next singer…';
    // Measure width to compute a smooth speed (px/sec)
    const scrollerRef = useRef(null);
    const [duration, setDuration] = useState(30); // fallback
    useEffect(() => {
        const el = scrollerRef.current;
        if (!el)
            return;
        // Width of one copy of the content
        const inner = el.querySelector('.ticker-copy');
        if (!inner)
            return;
        const w = inner.scrollWidth;
        // Tune speed here (lower = faster). ~120 px/sec feels good for long strings.
        const pxPerSec = 120;
        const d = Math.max(12, Math.ceil((w + window.innerWidth) / pxPerSec));
        setDuration(d);
    }, [text]);
    return (_jsxs("div", { style: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            // leave space for the QR at bottom-left (approx 140px incl. padding)
            padding: '10px 16px 10px 160px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(8,8,10,0.85) 45%, rgba(8,8,10,0.92) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: '#e5e7eb',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans"',
            zIndex: 25
        }, children: [_jsx("style", { children: `
        .ticker {
          position: relative;
          width: 100%;
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 48px, black calc(100% - 48px), transparent 100%);
          white-space: nowrap;
          user-select: none;
        }
        .ticker-track {
          display: inline-flex;
          will-change: transform;
          gap: 64px; /* space between copies */
          padding-block: 2px;
          align-items: center;
        }
        .ticker-copy {
          display: inline-block;
          white-space: nowrap;
          font-weight: 700;
          letter-spacing: .2px;
          font-size: clamp(14px, 1.8vw, 20px);
          color: #e5e7eb;
        }
        .pill-now {
          display:inline-block; margin-right:10px; padding:2px 8px; border-radius:999px;
          font-size: 12px; font-weight:800; color:#111; background:#fde047;
        }
        .pill-next {
          display:inline-block; margin:0 10px 0 22px; padding:2px 8px; border-radius:999px;
          font-size: 12px; font-weight:800; color:#bfdbfe; background:rgba(29,78,216,.2); border:1px solid rgba(147,197,253,.25);
        }
      ` }), _jsx("div", { className: "ticker", ref: scrollerRef, children: _jsxs("div", { className: "ticker-track", style: {
                        animation: `ticker-move linear ${duration}s infinite`
                    }, children: [_jsx("div", { className: "ticker-copy", children: renderRichText(text) }), _jsx("div", { className: "ticker-copy", "aria-hidden": true, children: renderRichText(text) })] }) }), _jsx("style", { children: `
        @keyframes ticker-move {
          from { transform: translateX(0%); }
          to   { transform: translateX(-50%); }
        }
      ` })] }));
}
/** Render pills inline when keywords are present */
function renderRichText(s) {
    // Replace leading NOW:/UP NEXT: labels with styled pills for readability
    // We only style the first occurrences to avoid over-highlighting.
    const firstNow = s.indexOf('NOW:');
    const firstNext = s.indexOf('UP NEXT:');
    const parts = [];
    let i = 0;
    while (i < s.length) {
        if (i === firstNow) {
            parts.push(_jsx("span", { className: "pill-now", children: "NOW" }, `now-${i}`));
            i += 'NOW:'.length + 1; // skip colon + space
            continue;
        }
        if (i === firstNext) {
            parts.push(_jsx("span", { className: "pill-next", children: "UP NEXT" }, `next-${i}`));
            i += 'UP NEXT:'.length + 1;
            continue;
        }
        // normal text
        const nextSpecial = [firstNow, firstNext].filter(x => x > i).sort((a, b) => a - b)[0] ?? s.length;
        parts.push(_jsx("span", { children: s.slice(i, nextSpecial) }, i));
        i = nextSpecial;
    }
    return _jsx(_Fragment, { children: parts });
}

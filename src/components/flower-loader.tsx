"use client";

import { useId } from "react";

/**
 * Looping flower animation used as the chat streaming indicator.
 * Loosely based on RoseAnimation but self-contained with unique gradient
 * ids (via useId) so multiple instances never conflict, and loops forever.
 */
export function FlowerLoader({ size = 160 }: { size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const stemGrad = `${uid}-stemGrad`;
  const leafGrad = `${uid}-leafGrad`;
  const pOuter = `${uid}-pOuter`;
  const pMid = `${uid}-pMid`;
  const pInner = `${uid}-pInner`;
  const glow = `${uid}-glow`;

  return (
    <div
      className="animate-fade-in-up mb-4"
      role="status"
      aria-label="Thinking"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px] font-medium text-[var(--color-cb-text-muted)]">
          Thinking
        </span>
      </div>
      <svg
        className="overflow-visible"
        width={size}
        height={size * 0.32}
        viewBox="0 0 500 160"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={stemGrad} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a7a4a" />
            <stop offset="50%" stopColor="#5a9060" />
            <stop offset="100%" stopColor="#4a7a4a" />
          </linearGradient>
          <linearGradient id={leafGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6aaa6a" />
            <stop offset="100%" stopColor="#3d7a3d" />
          </linearGradient>
          <radialGradient id={pOuter} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fce8cc" />
            <stop offset="40%" stopColor="#f0c090" />
            <stop offset="100%" stopColor="#c89060" />
          </radialGradient>
          <radialGradient id={pMid} cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f5d4a8" />
            <stop offset="50%" stopColor="#e0a870" />
            <stop offset="100%" stopColor="#b07848" />
          </radialGradient>
          <radialGradient id={pInner} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#e8a050" />
            <stop offset="70%" stopColor="#c07838" />
            <stop offset="100%" stopColor="#905020" />
          </radialGradient>
          <radialGradient id={glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5d4a8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f5d4a8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <style>{`
          .fl-stem{stroke:url(#${stemGrad});stroke-width:4;fill:none;stroke-linecap:round;stroke-dasharray:500;animation:flStemLoop 6s cubic-bezier(.25,1,.5,1) infinite}
          @keyframes flStemLoop{0%{stroke-dashoffset:500;opacity:1}18%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:1}}
          .fl-leaf{opacity:0;transform-origin:center;animation:flLeafLoop 6s cubic-bezier(.34,1.56,.64,1) infinite}
          @keyframes flLeafLoop{0%,8%{opacity:0;transform:scale(0) rotate(-25deg)}16%{opacity:1;transform:scale(1.1) rotate(4deg)}20%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          .fl-bloom{opacity:0;transform-origin:460px 80px;animation:flBloomLoop 6s cubic-bezier(.22,1,.36,1) infinite}
          @keyframes flBloomLoop{0%,22%{opacity:0;transform:scale(.2) rotate(-25deg)}32%{opacity:1;transform:scale(1.08) rotate(3deg)}38%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          .fl-sway{transform-origin:460px 80px;animation:flSwayLoop 6s ease-in-out infinite}
          @keyframes flSwayLoop{0%,45%{transform:rotate(0deg)}55%{transform:rotate(2deg)}65%{transform:rotate(-1.5deg)}75%{transform:rotate(1deg)}100%{transform:rotate(0deg)}}
          .fl-breath{transform-origin:460px 80px;animation:flBreathLoop 6s ease-in-out infinite}
          @keyframes flBreathLoop{0%,45%{transform:scale(1)}58%{transform:scale(1.05)}72%{transform:scale(1)}100%{transform:scale(1)}}
          .fl-sparkle{opacity:0;animation:flSparkleLoop 6s ease-in-out infinite}
          @keyframes flSparkleLoop{0%,28%{opacity:0;transform:translate(0,0) scale(.3)}40%{opacity:.8;transform:translate(6px,-12px) scale(1)}55%{opacity:.4;transform:translate(12px,-24px) scale(.6)}70%{opacity:0;transform:translate(18px,-36px) scale(.2)}100%{opacity:0;transform:translate(0,0) scale(.3)}}
        `}</style>

        <path className="fl-stem" d="M 10 80 C 80 78, 150 82, 220 80 S 350 78, 460 80" />

        <g className="fl-leaf" style={{ animationDelay: "0.7s" }}>
          <path d="M 90 80 Q 92 58, 120 52 Q 112 68, 108 80 Z" fill={`url(#${leafGrad})`} />
          <path d="M 90 80 Q 92 102, 120 108 Q 112 92, 108 80 Z" fill={`url(#${leafGrad})`} />
          <line x1="90" y1="80" x2="118" y2="56" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="90" y1="80" x2="118" y2="104" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>
        <g className="fl-leaf" style={{ animationDelay: "1.1s" }}>
          <path d="M 180 80 Q 182 56, 215 50 Q 206 66, 200 80 Z" fill={`url(#${leafGrad})`} />
          <path d="M 180 80 Q 182 104, 215 110 Q 206 94, 200 80 Z" fill={`url(#${leafGrad})`} />
          <line x1="180" y1="80" x2="212" y2="54" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="180" y1="80" x2="212" y2="106" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>
        <g className="fl-leaf" style={{ animationDelay: "1.5s" }}>
          <path d="M 280 80 Q 282 58, 315 52 Q 306 68, 300 80 Z" fill={`url(#${leafGrad})`} />
          <path d="M 280 80 Q 282 102, 315 108 Q 306 92, 300 80 Z" fill={`url(#${leafGrad})`} />
          <line x1="280" y1="80" x2="312" y2="56" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="280" y1="80" x2="312" y2="104" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>

        <g className="fl-bloom">
          <g className="fl-sway">
            <g className="fl-breath">
              <ellipse cx="460" cy="80" rx="30" ry="24" fill={`url(#${pOuter})`} transform="rotate(-25 460 80)" />
              <ellipse cx="460" cy="80" rx="30" ry="24" fill={`url(#${pOuter})`} transform="rotate(25 460 80)" />
              <ellipse cx="460" cy="80" rx="28" ry="26" fill={`url(#${pOuter})`} transform="rotate(65 460 80)" />
              <ellipse cx="460" cy="80" rx="28" ry="26" fill={`url(#${pOuter})`} transform="rotate(-65 460 80)" />
              <ellipse cx="460" cy="80" rx="26" ry="28" fill={`url(#${pOuter})`} transform="rotate(90 460 80)" />
              <ellipse cx="460" cy="80" rx="26" ry="28" fill={`url(#${pOuter})`} transform="rotate(0 460 80)" />
              <ellipse cx="460" cy="80" rx="22" ry="18" fill={`url(#${pMid})`} transform="rotate(-40 460 80)" />
              <ellipse cx="460" cy="80" rx="22" ry="18" fill={`url(#${pMid})`} transform="rotate(40 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill={`url(#${pMid})`} transform="rotate(80 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill={`url(#${pMid})`} transform="rotate(-80 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill={`url(#${pMid})`} transform="rotate(0 460 80)" />
              <ellipse cx="460" cy="80" rx="14" ry="12" fill={`url(#${pInner})`} transform="rotate(-20 460 80)" />
              <ellipse cx="460" cy="80" rx="14" ry="12" fill={`url(#${pInner})`} transform="rotate(20 460 80)" />
              <ellipse cx="460" cy="80" rx="12" ry="14" fill={`url(#${pInner})`} transform="rotate(70 460 80)" />
              <ellipse cx="460" cy="80" rx="12" ry="14" fill={`url(#${pInner})`} transform="rotate(-70 460 80)" />
              <circle cx="460" cy="80" r="8" fill="#b06830" />
              <circle cx="460" cy="80" r="5" fill="#d08040" />
              <path d="M 456 77 L 464 83 M 464 77 L 456 83 M 460 75 L 460 85" stroke="#904820" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
            </g>
            <path d="M 445 85 Q 450 96, 460 100 Q 470 96, 475 85" fill="none" stroke="#4a8a4a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 448 82 L 445 90 M 472 82 L 475 90" stroke="#4a8a4a" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        <circle className="fl-sparkle" style={{ animationDelay: "0s" }} cx="475" cy="65" r="3" fill={`url(#${glow})`} />
        <circle className="fl-sparkle" style={{ animationDelay: "0.5s" }} cx="485" cy="55" r="2.5" fill={`url(#${glow})`} />
        <circle className="fl-sparkle" style={{ animationDelay: "1s" }} cx="465" cy="60" r="2" fill={`url(#${glow})`} />
        <circle className="fl-sparkle" style={{ animationDelay: "1.5s" }} cx="490" cy="70" r="2.5" fill={`url(#${glow})`} />
      </svg>
    </div>
  );
}

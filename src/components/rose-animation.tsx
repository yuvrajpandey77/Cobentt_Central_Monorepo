"use client";

import { useState, useCallback, useRef } from "react";

export function RoseAnimation() {
  const [animKey, setAnimKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHover = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(false);
    // Force re-render with new key to restart animation
    requestAnimationFrame(() => {
      setAnimKey((k) => k + 1);
      setIsHovered(true);
      // After animation duration (~6s), go stale
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 6200);
    });
  }, []);

  return (
    <div
      className="w-full max-w-[420px] mx-auto h-[120px] mb-4 cursor-pointer"
      onMouseEnter={handleHover}
    >
      <svg
        key={animKey}
        className="w-full h-full overflow-visible"
        viewBox="0 0 500 160"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="stemGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4a7a4a" />
            <stop offset="50%" stopColor="#5a9060" />
            <stop offset="100%" stopColor="#4a7a4a" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6aaa6a" />
            <stop offset="100%" stopColor="#3d7a3d" />
          </linearGradient>
          <radialGradient id="pOuter" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fce8cc" />
            <stop offset="40%" stopColor="#f0c090" />
            <stop offset="100%" stopColor="#c89060" />
          </radialGradient>
          <radialGradient id="pMid" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f5d4a8" />
            <stop offset="50%" stopColor="#e0a870" />
            <stop offset="100%" stopColor="#b07848" />
          </radialGradient>
          <radialGradient id="pInner" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#e8a050" />
            <stop offset="70%" stopColor="#c07838" />
            <stop offset="100%" stopColor="#905020" />
          </radialGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5d4a8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f5d4a8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <style>{`
          .stem-anim{stroke:url(#stemGrad);stroke-width:4;fill:none;stroke-linecap:round;stroke-dasharray:500;animation:stemOnce 6s cubic-bezier(.25,1,.5,1) forwards}
          @keyframes stemOnce{0%{stroke-dashoffset:500;opacity:1}20%{stroke-dashoffset:0;opacity:1}80%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:1}}
          .thorn-anim{opacity:0;transform-origin:center;animation:thornOnce 6s cubic-bezier(.34,1.56,.64,1) forwards}
          @keyframes thornOnce{0%,12%{opacity:0;transform:scale(0) rotate(-15deg)}18%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          .leaf-anim{opacity:0;transform-origin:center;animation:leafOnce 6s cubic-bezier(.34,1.56,.64,1) forwards}
          @keyframes leafOnce{0%,10%{opacity:0;transform:scale(0) rotate(-25deg)}18%{opacity:1;transform:scale(1.1) rotate(4deg)}22%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          .bloom-anim{opacity:0;transform-origin:460px 80px;animation:bloomOnce 6s cubic-bezier(.22,1,.36,1) forwards}
          @keyframes bloomOnce{0%,25%{opacity:0;transform:scale(.2) rotate(-25deg)}35%{opacity:1;transform:scale(1.08) rotate(3deg)}40%{opacity:1;transform:scale(1) rotate(0deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
          .sway-anim{transform-origin:460px 80px;animation:swayOnce 6s ease-in-out forwards}
          @keyframes swayOnce{0%,40%{transform:rotate(0deg)}50%{transform:rotate(2deg)}60%{transform:rotate(-1.5deg)}70%{transform:rotate(1deg)}100%{transform:rotate(0deg)}}
          .breath-anim{transform-origin:460px 80px;animation:breathOnce 6s ease-in-out forwards}
          @keyframes breathOnce{0%,40%{transform:scale(1)}55%{transform:scale(1.04)}70%{transform:scale(1)}100%{transform:scale(1)}}
          .sparkle-anim{opacity:0;animation:sparkleOnce 6s ease-in-out forwards}
          @keyframes sparkleOnce{0%,30%{opacity:0;transform:translate(0,0) scale(.3)}40%{opacity:.8;transform:translate(6px,-12px) scale(1)}55%{opacity:.4;transform:translate(12px,-24px) scale(.6)}70%{opacity:0;transform:translate(18px,-36px) scale(.2)}100%{opacity:0;transform:translate(0,0) scale(.3)}}
        `}</style>

        <path className="stem-anim" d="M 10 80 C 80 78, 150 82, 220 80 S 350 78, 460 80" />

        <g className="thorn-anim" style={{ animationDelay: "0.9s" }}>
          <path d="M 100 79 L 96 74 L 102 78 Z" fill="#5a8a5a" />
        </g>
        <g className="thorn-anim" style={{ animationDelay: "1.2s" }}>
          <path d="M 200 81 L 204 86 L 198 82 Z" fill="#5a8a5a" />
        </g>
        <g className="thorn-anim" style={{ animationDelay: "1.5s" }}>
          <path d="M 320 79 L 316 74 L 322 78 Z" fill="#5a8a5a" />
        </g>

        <g className="leaf-anim" style={{ animationDelay: "0.7s" }}>
          <path d="M 90 80 Q 92 58, 120 52 Q 112 68, 108 80 Z" fill="url(#leafGrad)" />
          <path d="M 90 80 Q 92 102, 120 108 Q 112 92, 108 80 Z" fill="url(#leafGrad)" />
          <line x1="90" y1="80" x2="118" y2="56" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="90" y1="80" x2="118" y2="104" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>
        <g className="leaf-anim" style={{ animationDelay: "1.0s" }}>
          <path d="M 170 80 Q 172 56, 205 50 Q 196 66, 190 80 Z" fill="url(#leafGrad)" />
          <path d="M 170 80 Q 172 104, 205 110 Q 196 94, 190 80 Z" fill="url(#leafGrad)" />
          <line x1="170" y1="80" x2="202" y2="54" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="170" y1="80" x2="202" y2="106" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>
        <g className="leaf-anim" style={{ animationDelay: "1.3s" }}>
          <path d="M 260 80 Q 262 58, 295 52 Q 286 68, 280 80 Z" fill="url(#leafGrad)" />
          <path d="M 260 80 Q 262 102, 295 108 Q 286 92, 280 80 Z" fill="url(#leafGrad)" />
          <line x1="260" y1="80" x2="292" y2="56" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
          <line x1="260" y1="80" x2="292" y2="104" stroke="#3d6b3d" strokeWidth="0.6" opacity="0.4" />
        </g>
        <g className="leaf-anim" style={{ animationDelay: "1.6s" }}>
          <path d="M 370 80 Q 372 64, 395 60 Q 388 72, 382 80 Z" fill="url(#leafGrad)" />
          <path d="M 370 80 Q 372 96, 395 100 Q 388 88, 382 80 Z" fill="url(#leafGrad)" />
        </g>

        <g className="bloom-anim">
          <g className="sway-anim">
            <g className="breath-anim">
              <ellipse cx="460" cy="80" rx="30" ry="24" fill="url(#pOuter)" transform="rotate(-25 460 80)" />
              <ellipse cx="460" cy="80" rx="30" ry="24" fill="url(#pOuter)" transform="rotate(25 460 80)" />
              <ellipse cx="460" cy="80" rx="28" ry="26" fill="url(#pOuter)" transform="rotate(65 460 80)" />
              <ellipse cx="460" cy="80" rx="28" ry="26" fill="url(#pOuter)" transform="rotate(-65 460 80)" />
              <ellipse cx="460" cy="80" rx="26" ry="28" fill="url(#pOuter)" transform="rotate(90 460 80)" />
              <ellipse cx="460" cy="80" rx="26" ry="28" fill="url(#pOuter)" transform="rotate(0 460 80)" />
              <ellipse cx="460" cy="80" rx="22" ry="18" fill="url(#pMid)" transform="rotate(-40 460 80)" />
              <ellipse cx="460" cy="80" rx="22" ry="18" fill="url(#pMid)" transform="rotate(40 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill="url(#pMid)" transform="rotate(80 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill="url(#pMid)" transform="rotate(-80 460 80)" />
              <ellipse cx="460" cy="80" rx="20" ry="20" fill="url(#pMid)" transform="rotate(0 460 80)" />
              <ellipse cx="460" cy="80" rx="14" ry="12" fill="url(#pInner)" transform="rotate(-20 460 80)" />
              <ellipse cx="460" cy="80" rx="14" ry="12" fill="url(#pInner)" transform="rotate(20 460 80)" />
              <ellipse cx="460" cy="80" rx="12" ry="14" fill="url(#pInner)" transform="rotate(70 460 80)" />
              <ellipse cx="460" cy="80" rx="12" ry="14" fill="url(#pInner)" transform="rotate(-70 460 80)" />
              <circle cx="460" cy="80" r="8" fill="#b06830" />
              <circle cx="460" cy="80" r="5" fill="#d08040" />
              <path d="M 456 77 L 464 83 M 464 77 L 456 83 M 460 75 L 460 85" stroke="#904820" strokeWidth="0.7" opacity="0.5" strokeLinecap="round" />
            </g>
            <path d="M 445 85 Q 450 96, 460 100 Q 470 96, 475 85" fill="none" stroke="#4a8a4a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 448 82 L 445 90 M 472 82 L 475 90" stroke="#4a8a4a" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>

        <circle className="sparkle-anim" style={{ animationDelay: "0s" }} cx="475" cy="65" r="3" fill="url(#glow)" />
        <circle className="sparkle-anim" style={{ animationDelay: "0.4s" }} cx="485" cy="55" r="2.5" fill="url(#glow)" />
        <circle className="sparkle-anim" style={{ animationDelay: "0.8s" }} cx="465" cy="60" r="2" fill="url(#glow)" />
        <circle className="sparkle-anim" style={{ animationDelay: "1.2s" }} cx="490" cy="70" r="2.5" fill="url(#glow)" />
      </svg>
    </div>
  );
}

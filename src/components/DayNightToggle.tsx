import React from 'react';
import type { ResolvedTheme } from '@/hooks/useTheme';

interface DayNightToggleProps {
  theme: ResolvedTheme;
  onToggle: () => void;
}

/**
 * Skeuomorphic day/night toggle.
 * Sized 56×28 to fit our header row while leaving room for visual polish.
 */
export const DayNightToggle: React.FC<DayNightToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';
  const W = 56;
  const H = 28;
  const THUMB_DIAM = 22;
  const PAD = 3;
  const TRAVEL = W - THUMB_DIAM - PAD * 2;
  const thumbX = isDark ? PAD : PAD + TRAVEL;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={onToggle}
      style={{
        width: W,
        height: H,
        padding: 0,
        border: 'none',
        borderRadius: H / 2,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(180deg, #87CEEB 0%, #B0E0FF 100%)',
        boxShadow:
          'inset 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.25)',
        transition: 'background 300ms ease-in-out',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <g style={{ opacity: isDark ? 0 : 1, transition: 'opacity 300ms ease-in-out' }}>
          <g fill="white" fillOpacity="0.55">
            <ellipse cx="14" cy="18" rx="6" ry="2.5" />
            <ellipse cx="9" cy="17" rx="3.5" ry="1.8" />
          </g>
          <g fill="white" fillOpacity="0.95">
            <ellipse cx="10" cy="13" rx="4.5" ry="2.2" />
            <ellipse cx="13" cy="11" rx="3" ry="1.6" />
            <ellipse cx="7" cy="12" rx="2.3" ry="1.3" />
          </g>
        </g>
        <g
          style={{ opacity: isDark ? 1 : 0, transition: 'opacity 300ms ease-in-out' }}
          fill="white"
        >
          <circle cx="33" cy="7" r="0.9" />
          <circle cx="40" cy="10" r="1.3" />
          <circle cx="36" cy="15" r="0.8" />
          <circle cx="45" cy="6" r="1.0" />
          <circle cx="48" cy="14" r="1.2" />
          <circle cx="42" cy="19" r="0.7" opacity="0.8" />
          <circle cx="31" cy="20" r="0.6" opacity="0.6" />
          <circle cx="51" cy="20" r="0.5" opacity="0.7" />
          <path
            d="M 45 11 L 45.5 12.5 L 47 13 L 45.5 13.5 L 45 15 L 44.5 13.5 L 43 13 L 44.5 12.5 Z"
            fill="white"
            opacity="0.9"
          />
        </g>
      </svg>

      <span
        style={{
          position: 'absolute',
          top: PAD,
          left: thumbX,
          width: THUMB_DIAM,
          height: THUMB_DIAM,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle at 35% 30%, #F5F5F5 0%, #D3D3D3 60%, #9A9A9A 100%)'
            : 'radial-gradient(circle at 35% 30%, #FFF8C8 0%, #FFD700 55%, #DAA520 100%)',
          boxShadow: isDark
            ? '0 2px 4px rgba(0,0,0,0.5), inset 0 -2px 3px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)'
            : '0 0 10px rgba(255, 215, 0, 0.8), 0 0 18px rgba(255,215,0,0.45), 0 0 28px rgba(255,215,0,0.2), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.5)',
          transition:
            'left 300ms ease-in-out, background 300ms ease-in-out, box-shadow 300ms ease-in-out, transform 150ms ease-out',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLSpanElement).style.transform = 'scale(1)';
        }}
      >
        {isDark && (
          <svg
            viewBox={`0 0 ${THUMB_DIAM} ${THUMB_DIAM}`}
            width={THUMB_DIAM}
            height={THUMB_DIAM}
            style={{ display: 'block' }}
            aria-hidden="true"
          >
            <g>
              <circle cx="7.5" cy="9.5" r="2" fill="#8a8a8a" opacity="0.55" />
              <circle cx="7.5" cy="9.5" r="1.6" fill="#9a9a9a" opacity="0.5" />
            </g>
            <g>
              <circle cx="14.5" cy="14" r="1.6" fill="#8a8a8a" opacity="0.5" />
              <circle cx="14.5" cy="14" r="1.2" fill="#9a9a9a" opacity="0.5" />
            </g>
            <g>
              <circle cx="15" cy="7" r="1" fill="#8a8a8a" opacity="0.5" />
              <circle cx="15" cy="7" r="0.7" fill="#9a9a9a" opacity="0.5" />
            </g>
          </svg>
        )}
      </span>
    </button>
  );
};
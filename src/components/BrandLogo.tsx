import React from 'react';
import icon from '../assets/brit-logo-icon.png';

interface BrandLogoProps {
  variant?: 'sidebar' | 'hero';
  subtitle?: string;
  align?: 'left' | 'center';
}

export default function BrandLogo({
  variant = 'sidebar',
  subtitle,
  align = 'left',
}: BrandLogoProps) {
  const isHero = variant === 'hero';
  const iconSize = isHero ? 92 : 64;
  const titleSize = isHero ? 'clamp(34px, 5vw, 52px)' : '18px';
  const gap = isHero ? '18px' : '14px';

  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
          gap,
          flexWrap: isHero ? 'wrap' : 'nowrap',
          width: isHero ? 'auto' : '100%',
        }}
      >
        <div
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={icon}
            alt="Brit Institute logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: align === 'center' ? 'center' : 'flex-start',
              gap: isHero ? '10px' : '6px',
              flexWrap: isHero ? 'wrap' : 'nowrap',
              lineHeight: isHero ? 0.95 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                color: '#2457d3',
                letterSpacing: '-0.04em',
                textShadow: '0 8px 20px rgba(36,87,211,0.14)',
              }}
            >
              Brit
            </span>
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                color: '#ddb43b',
                letterSpacing: '-0.04em',
                textShadow: '0 8px 20px rgba(221,180,59,0.12)',
              }}
            >
              Institute
            </span>
          </div>

          {subtitle && (
            <div
              style={{
                marginTop: isHero ? '10px' : '4px',
                fontSize: isHero ? '13px' : '11px',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: isHero ? '0.12em' : '0.1em',
                fontWeight: 700,
                lineHeight: isHero ? 1.35 : 1.5,
                whiteSpace: isHero ? 'normal' : 'pre-line',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

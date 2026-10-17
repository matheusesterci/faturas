import React from 'react';

interface BeTravelLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  customLogoUrl?: string | null;
  color?: string;
}

export const BeTravelLogo: React.FC<BeTravelLogoProps> = ({
  className = '',
  size = 'md',
  customLogoUrl,
  color = '#4e5d8a',
}) => {
  // If user uploaded their genuine logo, display it directly
  if (customLogoUrl) {
    const heightClass =
      size === 'xs'
        ? 'h-6'
        : size === 'sm'
        ? 'h-9'
        : size === 'lg'
        ? 'h-16'
        : 'h-12';
    return (
      <div className={`flex items-center select-none ${className}`}>
        <img
          src={customLogoUrl}
          alt="BE Travel"
          className={`${heightClass} w-auto object-contain`}
        />
      </div>
    );
  }

  // Fallback: Clean geometric brand lockup
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div
        className="rounded-full flex items-center justify-center text-white font-bold"
        style={{
          backgroundColor: color,
          width: size === 'xs' ? '24px' : size === 'sm' ? '32px' : size === 'lg' ? '56px' : '44px',
          height: size === 'xs' ? '24px' : size === 'sm' ? '32px' : size === 'lg' ? '56px' : '44px',
        }}
      >
        <span className={size === 'xs' ? 'text-[10px]' : size === 'sm' ? 'text-xs' : 'text-base'}>
          BE
        </span>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-extrabold tracking-tight"
          style={{
            color: color,
            fontSize: size === 'xs' ? '14px' : size === 'sm' ? '18px' : size === 'lg' ? '30px' : '24px',
          }}
        >
          BE
        </span>
        <span
          className="font-bold tracking-[0.24em]"
          style={{
            color: color,
            fontSize: size === 'xs' ? '6.5px' : size === 'sm' ? '8px' : size === 'lg' ? '12px' : '10px',
          }}
        >
          TRAVEL
        </span>
      </div>
    </div>
  );
};

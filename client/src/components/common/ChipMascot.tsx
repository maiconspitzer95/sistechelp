import React from 'react';
import chipImage from '../../assets/mascote-chip.png';

export type ChipMascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'banner' | 'custom';

export interface ChipMascotProps {
  size?: ChipMascotSize;
  className?: string;
  alt?: string;
  showStatus?: boolean;
  statusColor?: string;
  interactive?: boolean;
  onClick?: () => void;
}

const sizeClasses: Record<Exclude<ChipMascotSize, 'custom'>, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-20 h-20 sm:w-24 sm:h-24',
  xl: 'w-28 h-28 sm:w-32 sm:h-32',
  banner: 'w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44',
};

export const ChipMascot: React.FC<ChipMascotProps> = ({
  size = 'md',
  className = '',
  alt = 'Chip — Mascote e Assistente Virtual da TI',
  showStatus = false,
  statusColor = 'bg-emerald-500',
  interactive = false,
  onClick,
}) => {
  const dimensionClass = size === 'custom' ? '' : sizeClasses[size];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${
        interactive ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200' : ''
      } ${className}`}
    >
      <img
        src={chipImage}
        alt={alt}
        className={`${dimensionClass} object-contain drop-shadow-md transition-all duration-300 pointer-events-none`}
        loading="eager"
      />
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${statusColor} border-2 border-white dark:border-navy-900 rounded-full shadow-sm`}
          title="Chip Online"
        />
      )}
    </div>
  );
};

export default ChipMascot;

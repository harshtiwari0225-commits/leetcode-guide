import React from 'react';
import { cn } from '@/utils/helpers';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  default: 'bg-gray-700/60 text-gray-200 border-gray-600',
  success: 'bg-green-900/40 text-green-400 border-green-700/60',
  warning: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/60',
  danger: 'bg-red-900/40 text-red-400 border-red-700/60',
  info: 'bg-blue-900/40 text-blue-400 border-blue-700/60',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
}) => (
  <span
    className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      VARIANTS[variant],
      className,
    )}
  >
    {children}
  </span>
);
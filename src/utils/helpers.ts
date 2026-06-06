/**
 * Tiny utility helpers — no external deps to keep the content-script
 * bundle lean (PRD perf budget).
 */

/** Conditionally join class names; falsy values are dropped. */
export const cn = (
  ...classes: (string | undefined | null | false)[]
): string => classes.filter(Boolean).join(' ');

/** Truncate a string with an ellipsis. */
export const truncate = (str: string, maxLength: number): string =>
  str.length <= maxLength ? str : `${str.slice(0, maxLength - 1)}…`;

/** Tailwind-compatible class for difficulty text colour. */
export const difficultyColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'hard':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
};

/** Tailwind-compatible classes for difficulty background pill. */
export const difficultyBgColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'bg-green-400/10 border-green-400/30';
    case 'medium':
      return 'bg-yellow-400/10 border-yellow-400/30';
    case 'hard':
      return 'bg-red-400/10 border-red-400/30';
    default:
      return 'bg-gray-400/10 border-gray-400/30';
  }
};
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


/** Format an integer number of seconds as a compact h/m/s string. */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
};

/** Format a Unix timestamp as a relative "x ago" string. */
export const formatRelativeTime = (ts: number): string => {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
};
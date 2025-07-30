import { v4 as uuidv4 } from 'uuid';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility function for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a random game code
export function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a unique session ID
export function generateSessionId(): string {
  return uuidv4();
}

// Format time remaining
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Calculate ranking score based on position
export function calculateRankingScore(correctPosition: number, playerPosition: number, totalItems: number): number {
  const maxScore = 100;
  const positionDifference = Math.abs(correctPosition - playerPosition);
  const maxDifference = totalItems - 1;
  
  // Linear scoring: closer positions get higher scores
  const score = maxScore * (1 - (positionDifference / maxDifference));
  return Math.round(Math.max(0, score));
}

// Aggregate rankings from multiple players
interface RankingItem {
  itemId: string;
  position: number;
}

interface RankingData {
  rankings: RankingItem[];
}

interface AggregatedRanking {
  itemId: string;
  averagePosition: number;
  totalVotes: number;
  positions: number[];
}

export function aggregateRankings(rankings: RankingData[]): AggregatedRanking[] {
  const itemScores: { [itemId: string]: { totalScore: number; count: number; positions: number[] } } = {};
  
  rankings.forEach(ranking => {
    ranking.rankings.forEach((item: RankingItem) => {
      if (!itemScores[item.itemId]) {
        itemScores[item.itemId] = { totalScore: 0, count: 0, positions: [] };
      }
      itemScores[item.itemId].totalScore += item.position;
      itemScores[item.itemId].count += 1;
      itemScores[item.itemId].positions.push(item.position);
    });
  });
  
  // Calculate average positions and sort
  const aggregated = Object.entries(itemScores).map(([itemId, data]) => ({
    itemId,
    averagePosition: data.totalScore / data.count,
    totalVotes: data.count,
    positions: data.positions
  }));
  
  return aggregated.sort((a, b) => a.averagePosition - b.averagePosition);
}

// Validate game code format
export function isValidGameCode(code: string): boolean {
  return /^[A-Z0-9]{4,6}$/.test(code);
}

// Generate random colors for charts
export function generateChartColors(count: number): string[] {
  const baseColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  
  return colors;
}

// Debounce function for search/input
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format player count
export function formatPlayerCount(count: number): string {
  if (count === 0) return 'No players';
  if (count === 1) return '1 player';
  return `${count} players`;
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Local storage helpers
export const storage = {
  get: (key: string): unknown | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: unknown): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage errors silently
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Handle storage errors silently
    }
  }
};

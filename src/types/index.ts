// Core domain types — kept lean for M0; expanded across M2–M5 as features land.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ApproachType = 'Brute Force' | 'Optimal' | 'Advanced';
export type HintLevel = 1 | 2 | 3 | 4 | 5;
export type ProgrammingLanguage =
  | 'python'
  | 'javascript'
  | 'java'
  | 'c'
  | 'cpp';

export interface LeetCodeProblem {
  id: string; // URL slug, e.g. "two-sum"
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  examples: string[];
  constraints: string[];
  url: string;
}

export interface Approach {
  id: string;
  name: string;
  technique: string;
  type: ApproachType;
  timeComplexity: string;
  spaceComplexity: string;
  description: string;
  difficultyScore: number; // 1–5
}

export interface ProblemAnalysis {
  problem: LeetCodeProblem;
  approaches: Approach[];
  analyzedAt: number;
  cacheKey: string;
}

export interface Hint {
  level: HintLevel;
  content: string;
  approachId: string;
  generatedAt: number;
}

export interface HintSession {
  problemId: string;
  approachId: string;
  hintsRevealed: HintLevel[];
  hints: Hint[];
}

export interface Solution {
  approachId: string;
  language: ProgrammingLanguage;
  code: string;
  explanation: string[];
  timeComplexity: string;
  spaceComplexity: string;
  keyTakeaways: string[];
}

export interface SolutionReveal {
  problemId: string;
  solutions: Solution[];
  alternativeApproaches: string[];
  revealedAt: number;
}

export interface ProblemProgress {
  problemId: string;
  problemTitle: string;
  difficulty: Difficulty;
  status: 'attempted' | 'solved' | 'given-up';
  hintsUsed: number;
  attempts: number;
  timeSpentSeconds: number;
  approachesExplored: string[];
  solvedWithApproach?: string;
  startedAt: number;
  solvedAt?: number;
  lastUpdatedAt: number;
}

export interface GlobalStats {
  totalProblems: number;
  solvedProblems: number;
  attemptedProblems: number;
  totalHintsUsed: number;
  averageAttemptsBeforeSolve: number;
  averageHintsPerProblem: number;
  techniquesLearned: Record<string, number>;
  streakDays: number;
  lastActiveDateStr: string;
}

export interface UserPreferences {
  defaultLanguage: ProgrammingLanguage;
  autoExpandApproaches: boolean;
  showComplexityOnLoad: boolean;
  hintConfirmation: boolean;
}
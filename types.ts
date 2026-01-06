export type ChildId = 'seoa' | 'seou';

export interface ChildProfile {
  id: ChildId;
  name: string;
  themeColor: string; // Tailwind class prefix e.g., 'rose' or 'sky'
  avatarEmoji: string;
}

export type TransactionType = 'deposit' | 'withdraw' | 'interest'; 

export type StudyCategory = 'workbook' | 'book' | 'video';
export type WithdrawCategory = 'youtube_game' | 'tv_watch';

export interface Transaction {
  id: string;
  childId: ChildId;
  type: TransactionType;
  studyCategory?: StudyCategory; // Only for deposits
  withdrawCategory?: WithdrawCategory; // Only for withdraws
  amount: number; // Final calculated amount
  baseAmount?: number; // Original input amount (before multiplier)
  multiplier?: number; // Applied multiplier
  timestamp: number;
  note?: string;
  aiMessage?: string;
}

export interface AppSettings {
  multipliers: {
    workbook: number;
    book: number;
    video: number;
  };
  withdrawMultipliers: {
    youtube_game: number;
    tv_watch: number;
  };
  interestRate: number; // e.g., 0.05 for 5%
  interestThresholdHours: number; // e.g., 48
}

export const DEFAULT_SETTINGS: AppSettings = {
  multipliers: {
    workbook: 2.0,
    book: 1.5,
    video: 1.2,
  },
  withdrawMultipliers: {
    youtube_game: 1.2,
    tv_watch: 1.0,
  },
  interestRate: 0.05,
  interestThresholdHours: 48,
};

export const CHILDREN: Record<ChildId, ChildProfile> = {
  seoa: {
    id: 'seoa',
    name: '최서아',
    themeColor: 'rose',
    avatarEmoji: '👧🏻'
  },
  seou: {
    id: 'seou',
    name: '최서우',
    themeColor: 'sky',
    avatarEmoji: '👦🏻'
  }
};
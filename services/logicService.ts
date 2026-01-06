import { Transaction, AppSettings, ChildId } from "../types";

// Helper to get current balance from a list of transactions
export const calculateBalance = (transactions: Transaction[], childId: ChildId): number => {
  return transactions
    .filter(t => t.childId === childId)
    .reduce((acc, curr) => {
      // Interest is also a deposit type of action (adds time)
      if (curr.type === 'deposit' || curr.type === 'interest') {
        return acc + curr.amount;
      } else {
        return acc - curr.amount;
      }
    }, 0);
};

// Logic to calculate missed interest payments
// This checks the history and adds interest transactions if criteria are met
export const processInterest = (
  currentTransactions: Transaction[], 
  childId: ChildId, 
  settings: AppSettings
): Transaction[] => {
  const childTransactions = currentTransactions
    .filter(t => t.childId === childId)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (childTransactions.length === 0) return [];

  const newTransactions: Transaction[] = [];
  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  // Find the last time interest was applied, or the very first transaction time if never applied
  const lastInterestTx = [...childTransactions].reverse().find(t => t.type === 'interest');
  let lastCheckTime = lastInterestTx ? lastInterestTx.timestamp : childTransactions[0].timestamp;

  // Find the last time TV was watched (withdraw)
  // We need to check this dynamically as we iterate through days
  
  // We iterate day by day from last check time until now
  // Start checking from the next day boundary relative to last check
  let nextCheckTime = lastCheckTime + ONE_DAY;

  // We need a running balance to calculate compound interest correctly
  let runningBalance = calculateBalance(childTransactions, childId);

  while (nextCheckTime <= now) {
    // 1. Check if TV was watched in the 'interestThresholdHours' before this check time
    const thresholdTime = nextCheckTime - (settings.interestThresholdHours * ONE_HOUR);
    
    const watchedTvRecently = childTransactions.some(t => 
      t.type === 'withdraw' && 
      t.timestamp > thresholdTime && 
      t.timestamp <= nextCheckTime
    );

    // Also check if any NEWLY added interest transactions interfere (unlikely for withdraws, but good practice)
    // Actually, we only care about real user withdraws.

    if (!watchedTvRecently && runningBalance > 0) {
      // 2. Apply Interest
      const interestAmount = Math.floor(runningBalance * settings.interestRate);
      
      if (interestAmount > 0) {
        const newTx: Transaction = {
          id: `interest-${childId}-${nextCheckTime}`,
          childId: childId,
          type: 'interest',
          amount: interestAmount,
          timestamp: nextCheckTime,
          note: `📺 TV 안 본지 ${settings.interestThresholdHours}시간 경과! 이자 ${settings.interestRate * 100}% 지급`,
          aiMessage: '참을성이 대단해요! 시간이 불어나고 있어요! 📈'
        };
        
        newTransactions.push(newTx);
        runningBalance += interestAmount; // Update running balance for compound effect
      }
    }

    nextCheckTime += ONE_DAY;
  }

  return newTransactions;
};

export const getStudyCategoryLabel = (cat: string) => {
  switch (cat) {
    case 'workbook': return '문제집 풀기';
    case 'book': return '책 읽기';
    case 'video': return '영상 공부';
    default: return '공부';
  }
};

export const getWithdrawCategoryLabel = (cat: string) => {
  switch (cat) {
    case 'youtube_game': return '유튜브/게임';
    case 'tv_watch': return 'TV 시청';
    default: return '사용';
  }
};
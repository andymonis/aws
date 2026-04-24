export function deriveSignals(events) {
  let skipStreak = 0;
  let completionStreak = 0;

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];

    if (event.type === 'skip') {
      skipStreak += 1;
    } else {
      break;
    }
  }

  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];

    if (event.type === 'complete') {
      completionStreak += 1;
    } else {
      break;
    }
  }

  const fatigueScore = Math.max(0, skipStreak * 2 - completionStreak);

  return {
    skipStreak,
    completionStreak,
    fatigueScore,
  };
}

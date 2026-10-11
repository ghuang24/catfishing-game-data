import { isGameDayUnlocked } from './gameDate.js';

export function selectVisibleReportData(
  gameData,
  scores,
  currentTime = new Date()
) {
  if (scores.length === 0) {
    return {
      visibleGameData: [],
      visibleScores: []
    };
  }

  const scoresByDay = new Map(scores.map(score => [score.day, score]));
  const earliestImportedDay = Math.min(...scoresByDay.keys());
  const visibleGameData = gameData.filter(dayData =>
    isGameDayUnlocked(dayData.day, currentTime) &&
    dayData.day >= earliestImportedDay
  );

  return {
    visibleGameData,
    visibleScores: visibleGameData.map(dayData => scoresByDay.get(dayData.day))
  };
}

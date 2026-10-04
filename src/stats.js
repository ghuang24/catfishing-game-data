export function calculateCorrectRateSummary(questions, correctValue) {
  if (questions.length === 0) return null;

  const userRate =
    questions.filter(({ answer }) => answer.correctness === correctValue).length /
    questions.length *
    100;
  const globalRate =
    questions.reduce((sum, { article }) => sum + article.correctRate, 0) /
    questions.length;

  return {
    questionCount: questions.length,
    userRate,
    globalRate,
    difference: userRate - globalRate
  };
}

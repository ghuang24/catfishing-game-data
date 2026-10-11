export const AnswerCorrectness = {
  CORRECT: 2,
  INCORRECT: 0,
  SKIPPED: 1,
  CLOSE: 3,
  HIDDEN: 4
} as const;

export type AnswerCorrectness =
  typeof AnswerCorrectness[keyof typeof AnswerCorrectness];

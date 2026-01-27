/**
 * Question Factory Exports
 *
 * Utilities for creating wizard questions from gaps and other sources.
 *
 * @module lib/questions
 */

export {
  createQuestionV1,
  createTextQuestion,
  createTextareaQuestion,
  createNumberQuestion,
  createToggleQuestion,
  createSelectQuestion,
  createMultiSelectQuestion,
  createRadioQuestion,
  gapToQuestion,
  gapsToQuestions,
  type CreateQuestionInput,
  type GapToQuestionInput,
} from "./createQuestionV1";

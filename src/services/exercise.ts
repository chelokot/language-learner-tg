export function checkTranslation(correct: string, answer: string): boolean {
  return correct.trim().toLowerCase() === answer.trim().toLowerCase();
}

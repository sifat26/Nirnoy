/**
 * Server-authoritative grading. This is the ONLY place answers are compared —
 * correct answers never reach the client before submission.
 */

function read(answers, qid) {
  if (answers instanceof Map) return answers.get(qid);
  return answers ? answers[qid] : undefined;
}

/**
 * Grade a set of answers against an exam.
 * @param exam Mongoose Exam doc (with questions + totalMarks())
 * @param answers Map or plain object of qid -> selected option key
 * @returns {{score: object, percentage: number}}
 */
export function gradeAnswers(exam, answers) {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let marksObtained = 0;
  const totalMarks = exam.totalMarks();

  for (const q of exam.questions) {
    const selected = read(answers, q.qid);
    if (selected == null || selected === '') {
      unanswered += 1;
      continue;
    }
    if (selected === q.correctAnswer) {
      correct += 1;
      marksObtained += q.marks || 1;
    } else {
      wrong += 1;
      marksObtained -= exam.negativeMarking || 0;
    }
  }

  // Never report a negative total; round to 2 dp for fractional negative marking.
  marksObtained = Math.max(0, Math.round(marksObtained * 100) / 100);
  const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

  return {
    score: { correct, wrong, unanswered, marksObtained, totalMarks },
    percentage,
  };
}

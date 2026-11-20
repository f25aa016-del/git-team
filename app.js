const QUESTION_COUNT = 10;

const elements = {
  score: document.querySelector("#score"),
  questionCount: document.querySelector("#question-count"),
  progressLabel: document.querySelector("#progress-label"),
  progressTrack: document.querySelector(".progress-track"),
  progressFill: document.querySelector("#progress-fill"),
  question: document.querySelector("#question"),
  answerButtons: [...document.querySelectorAll(".answer-button")],
  feedback: document.querySelector("#feedback"),
  feedbackResult: document.querySelector("#feedback-result"),
  feedbackExplanation: document.querySelector("#feedback-explanation"),
  nextButton: document.querySelector("#next-button"),
  restartButton: document.querySelector("#restart-button"),
  errorMessage: document.querySelector("#error-message"),
};

let questions = [];
let currentIndex = 0;
let correctAnswers = 0;

function parseCsvRow(row) {
  const fields = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"') {
      if (inQuotes && row[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

function parseQuestions(csv) {
  const rows = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((row) => row.trim().length > 0);

  if (rows.length < 2) {
    throw new Error("CSVに問題がありません。");
  }

  const headers = parseCsvRow(rows[0]);
  const questionIndex = headers.indexOf("question");
  const answerIndex = headers.indexOf("answer");
  const explanationIndex = headers.indexOf("explanation");

  if ([questionIndex, answerIndex, explanationIndex].some((index) => index < 0)) {
    throw new Error("CSVの見出しは question,answer,explanation にしてください。");
  }

  return rows.slice(1).map((row, index) => {
    const fields = parseCsvRow(row);
    const question = fields[questionIndex]?.trim();
    const answer = fields[answerIndex]?.trim();
    const explanation = fields[explanationIndex]?.trim();

    if (!question || !["〇", "×"].includes(answer) || !explanation) {
      throw new Error(`${index + 2}行目の問題データを確認してください。`);
    }

    return { question, answer, explanation };
  });
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function updateProgress() {
  const completed = Math.min(currentIndex, QUESTION_COUNT);
  const percentage = Math.round((completed / QUESTION_COUNT) * 100);
  elements.questionCount.textContent =
    completed === QUESTION_COUNT
      ? "チャレンジ完了！"
      : `QUESTION ${String(currentIndex + 1).padStart(2, "0")} / ${QUESTION_COUNT}`;
  elements.progressLabel.textContent = `${percentage}%`;
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(completed));
  elements.score.textContent = String(correctAnswers);
}

function showQuestion() {
  if (currentIndex >= questions.length) {
    showResults();
    return;
  }

  const currentQuestion = questions[currentIndex];
  elements.question.textContent = currentQuestion.question;
  elements.feedback.hidden = true;
  elements.nextButton.hidden = true;
  elements.restartButton.hidden = true;
  elements.answerButtons.forEach((button) => {
    button.disabled = false;
  });
  updateProgress();
}

function answerQuestion(selectedAnswer) {
  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion.answer;

  if (isCorrect) {
    correctAnswers += 1;
  }

  elements.score.textContent = String(correctAnswers);
  elements.feedbackResult.textContent = isCorrect
    ? "せいかい！ すごいね！"
    : `おしい！ 正解は「${currentQuestion.answer}」`;
  elements.feedbackExplanation.textContent = currentQuestion.explanation;
  elements.feedback.classList.toggle("is-wrong", !isCorrect);
  elements.feedback.hidden = false;
  elements.answerButtons.forEach((button) => {
    button.disabled = true;
  });

  currentIndex += 1;
  updateProgress();
  elements.nextButton.hidden = currentIndex >= QUESTION_COUNT;
  elements.restartButton.hidden = currentIndex < QUESTION_COUNT;
  if (currentIndex >= QUESTION_COUNT) {
    elements.questionCount.textContent = "チャレンジ完了！";
  }
}

function showResults() {
  elements.question.textContent = `10問中 ${correctAnswers}問正解！`;
  elements.feedbackResult.textContent =
    correctAnswers === QUESTION_COUNT
      ? "ねこ博士だね！ おみごと！"
      : correctAnswers >= 7
        ? "すごい！ ねこのことをよく知ってるね。"
        : "チャレンジありがとう！ またあそんでね。";
  elements.feedbackExplanation.textContent =
    "もう一度あそぶと、問題がシャッフルされるよ。";
  elements.feedback.classList.remove("is-wrong");
  elements.feedback.hidden = false;
  elements.answerButtons.forEach((button) => {
    button.disabled = true;
  });
  elements.restartButton.hidden = false;
  elements.nextButton.hidden = true;
  updateProgress();
}

function startQuiz() {
  questions = shuffle(questions).slice(0, QUESTION_COUNT);
  currentIndex = 0;
  correctAnswers = 0;
  showQuestion();
}

async function loadQuiz() {
  try {
    const response = await fetch("./cat-quiz.csv");
    if (!response.ok) {
      throw new Error(`CSVを読み込めませんでした（HTTP ${response.status}）。`);
    }

    const allQuestions = parseQuestions(await response.text());
    if (allQuestions.length < QUESTION_COUNT) {
      throw new Error(`問題は${QUESTION_COUNT}問以上必要です。`);
    }

    questions = allQuestions;
    startQuiz();
  } catch (error) {
    elements.question.textContent = "クイズを読み込めませんでした。";
    elements.questionCount.textContent = "読み込みエラー";
    elements.errorMessage.textContent =
      `${error.message} READMEの手順でWebサーバーから開いてください。`;
    elements.errorMessage.hidden = false;
  }
}

elements.answerButtons.forEach((button) => {
  button.addEventListener("click", () => answerQuestion(button.dataset.answer));
});
elements.nextButton.addEventListener("click", showQuestion);
elements.restartButton.addEventListener("click", startQuiz);

loadQuiz();

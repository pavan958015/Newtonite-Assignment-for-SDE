// State variables
let currentQuestionIndex = 0;
let userAnswers = []; // holds selected option keys ("a", "b", "c", "d")
let flaggedQuestions = new Set();
let startTime = Date.now();
let timerInterval = null;
let isPracticeMode = true;

// DOM Elements
const qNumSpan = document.getElementById("current-q-num");
const qText = document.getElementById("question-text");
const qVisual = document.getElementById("question-visual");
const optionsContainer = document.getElementById("options-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const flagBtn = document.getElementById("flag-btn");
const resetBtn = document.getElementById("reset-quiz-btn");
const modeToggle = document.getElementById("mode-toggle");
const timerDisplay = document.getElementById("timer");
const themeToggle = document.getElementById("theme-toggle");
const feedbackIndicator = document.getElementById("feedback-indicator");
const infoBody = document.getElementById("info-panel-body");
const progressGrid = document.getElementById("questions-grid");
const progressBar = document.getElementById("progress-bar");

// Sidebar Stats
const statsProgress = document.getElementById("stats-progress");
const statsScore = document.getElementById("stats-score");

// Modal Elements
const modal = document.getElementById("quiz-complete-modal");
const modalScore = document.getElementById("modal-score");
const modalAccuracy = document.getElementById("modal-accuracy");
const modalTime = document.getElementById("modal-time");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalPercentageText = document.getElementById("modal-percentage");
const modalProgressCircle = document.getElementById("modal-progress-circle");

// Core Explanations Database based on question text patterns
function getSmartExplanation(q) {
  const text = q.raw_text.toLowerCase();
  const correct = q.correct_answer ? q.correct_answer.toUpperCase() : "Unknown";
  
  if (text.includes("mirror image")) {
    return `<strong>Mirror Reflection Logic:</strong><br>A vertical mirror reflection flips the object horizontally (left-to-right). All right-side elements appear on the left, and left-side elements appear on the right, while vertical orientation remains unchanged. Examining the details of the shapes confirms that <strong>Option ${correct}</strong> is the exact reflection.`;
  }
  if (text.includes("paper is folded") || text.includes("paper is cut")) {
    return `<strong>Paper Unfolding Logic:</strong><br>To solve paper folding and cutting questions, trace the folds in reverse order. Each fold acts as a line of symmetry. Any holes punched will be mirrored across the fold lines. Unfolding step-by-step leads to the pattern shown in <strong>Option ${correct}</strong>.`;
  }
  if (text.includes("different from others") || text.includes("odd one out")) {
    return `<strong>Classification / Odd-One-Out Logic:</strong><br>Analyze the geometric properties: number of sides, rotation (clockwise vs. counter-clockwise), shading, or symmetry. <strong>Option ${correct}</strong> is the only figure that violates the shared rule governing the other options.`;
  }
  if (text.includes("sequence of symbols") || text.includes("completes the series") || text.includes("complete the sequence")) {
    return `<strong>Series Completion Logic:</strong><br>Look for step-by-step transformations between consecutive figures:
    <ul>
      <li>Rotation of elements (e.g., 45° or 90° clockwise/counter-clockwise).</li>
      <li>Addition or subtraction of line segments.</li>
      <li>Movement of symbols in a cycle.</li>
    </ul>
    Following the progression, <strong>Option ${correct}</strong> is the correct logical successor.`;
  }
  if (text.includes("perfect square")) {
    return `<strong>Square Construction Logic:</strong><br>Mental spatial assembly is key:
    <ul>
      <li>Look for complementary edges and angles that can join to form continuous straight lines.</li>
      <li>Combine shapes to eliminate notches and protrusions.</li>
      <li>Verify that the combined total area matches a full square box with 90° corners.</li>
    </ul>
    Fitting the pieces together confirms that <strong>Option ${correct}</strong> forms a perfect square.`;
  }
  if (text.includes("triangles") || text.includes("number of lines")) {
    return `<strong>Geometric Counting Logic:</strong><br>Count systematically:
    <ul>
      <li>Start with single, smallest individual triangles/lines.</li>
      <li>Then, count combinations of 2 adjacent triangles, then 3, and so on.</li>
      <li>Double-check overlapping regions.</li>
    </ul>
    The total count is exactly <strong>Option ${correct}</strong>.`;
  }
  if (text.includes("group the figures")) {
    return `<strong>Grouping Logic:</strong><br>The 9 figures can be grouped into 3 distinct classes of 3 shapes each:
    <ul>
      <li>Group 1: Shapes sharing the same number of lines or sides (e.g. triangles or quadrilaterals).</li>
      <li>Group 2: Hollow concentric figures vs. solid filled structures.</li>
      <li>Group 3: Single simple geometries vs. shapes enclosed within other shapes.</li>
    </ul>
    The unique grouping matching these properties is <strong>Option ${correct}</strong>.`;
  }
  
  return `<strong>Visual Reasoning Logic:</strong><br>Analyzing the pattern, geometric transitions, or spatial relationships shows that <strong>Option ${correct}</strong> satisfies the logical requirements of the question.`;
}

// Initialize Application
function init() {
  loadProgress();
  startTimer();
  generateProgressGrid();
  renderQuestion();
  updateSidebarStats();
  
  // Event Listeners
  prevBtn.addEventListener("click", navigatePrev);
  nextBtn.addEventListener("click", navigateNext);
  flagBtn.addEventListener("click", toggleFlag);
  resetBtn.addEventListener("click", resetQuiz);
  modeToggle.addEventListener("change", handleModeChange);
  themeToggle.addEventListener("click", toggleTheme);
  modalCloseBtn.addEventListener("click", closeModal);
  
  // Keyboard Navigation
  document.addEventListener("keydown", handleKeyDown);
}

// Timer Logic
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hours = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    timerDisplay.textContent = `${hours}:${mins}:${secs}`;
  }, 1000);
}

// Generate Question Buttons Grid
function generateProgressGrid() {
  progressGrid.innerHTML = "";
  quizQuestions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "q-btn";
    btn.id = `grid-btn-${idx}`;
    btn.textContent = q.id;
    
    // Add status classes
    updateGridButtonClass(idx, btn);
    
    btn.addEventListener("click", () => {
      currentQuestionIndex = idx;
      renderQuestion();
    });
    progressGrid.appendChild(btn);
  });
}

// Update specific grid button styling
function updateGridButtonClass(idx, btnElement = null) {
  const btn = btnElement || document.getElementById(`grid-btn-${idx}`);
  if (!btn) return;
  
  btn.className = "q-btn"; // reset
  
  if (idx === currentQuestionIndex) {
    btn.classList.add("active");
  }
  
  if (flaggedQuestions.has(quizQuestions[idx].id)) {
    btn.classList.add("flagged");
  }
  
  const answer = userAnswers[idx];
  if (answer) {
    if (isPracticeMode) {
      const q = quizQuestions[idx];
      if (answer === q.correct_answer) {
        btn.classList.add("correct");
      } else {
        btn.classList.add("incorrect");
      }
    } else {
      // In Exam Mode, just mark as answered (shaded)
      btn.classList.add("active");
    }
  }
}

// Render current question
function renderQuestion() {
  const q = quizQuestions[currentQuestionIndex];
  
  // Highlight active grid button
  quizQuestions.forEach((_, idx) => {
    updateGridButtonClass(idx);
  });
  
  // Header details
  qNumSpan.textContent = q.id;
  qText.textContent = q.text;
  
  // Update flag button state
  if (flaggedQuestions.has(q.id)) {
    flagBtn.classList.add("flagged");
    flagBtn.querySelector("i").className = "fa-solid fa-flag";
  } else {
    flagBtn.classList.remove("flagged");
    flagBtn.querySelector("i").className = "fa-regular fa-flag";
  }
  
  // Progress Bar
  const percent = ((currentQuestionIndex) / quizQuestions.length) * 100;
  progressBar.style.width = `${percent}%`;
  
  // Clear previous visual/options
  qVisual.innerHTML = "";
  optionsContainer.innerHTML = "";
  feedbackIndicator.textContent = "";
  feedbackIndicator.className = "feedback-indicator";
  
  // Question Visual (Main Image)
  if (q.images && q.images.length > 0) {
    const mainImg = document.createElement("img");
    mainImg.src = `images/${q.images[0]}`;
    mainImg.alt = `Question ${q.id} Visual`;
    
    // Zoom feature
    mainImg.addEventListener("click", () => {
      openImageInNewTab(mainImg.src);
    });
    
    qVisual.appendChild(mainImg);
    qVisual.style.display = "flex";
  } else {
    qVisual.style.display = "none";
  }
  
  // Render Options
  const hasAnswered = userAnswers[currentQuestionIndex] !== null && userAnswers[currentQuestionIndex] !== undefined;
  
  if (q.is_visual_options) {
    optionsContainer.className = "options-container visual-options";
    // 4 visual cards (A, B, C, D) using images 1-4
    const optionLetters = ["a", "b", "c", "d"];
    optionLetters.forEach((letter, i) => {
      const card = document.createElement("div");
      card.className = "option-card visual-option";
      
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.gap = "10px";
      
      const marker = document.createElement("div");
      marker.className = "option-marker";
      marker.textContent = letter;
      
      const label = document.createElement("span");
      label.className = "option-text";
      label.textContent = `Option ${letter.toUpperCase()}`;
      
      header.appendChild(marker);
      header.appendChild(label);
      card.appendChild(header);
      
      const imgWrapper = document.createElement("div");
      imgWrapper.className = "option-image-wrapper";
      const img = document.createElement("img");
      img.src = `images/${q.images[i + 1]}`;
      img.alt = `Option ${letter}`;
      imgWrapper.appendChild(img);
      card.appendChild(imgWrapper);
      
      // Select logic
      setupOptionClick(card, letter, hasAnswered);
      optionsContainer.appendChild(card);
    });
  } else {
    optionsContainer.className = "options-container text-options";
    // Normal text cards
    const optionKeys = ["a", "b", "c", "d"];
    optionKeys.forEach((key, idx) => {
      // Map option key to text if available in q.options
      // Sometimes options in q.options are e.g. ["Figure a", "Figure B", ...] or ["1", "2", "3", "4"]
      const optionText = q.options && q.options[idx] ? q.options[idx] : `Option ${key.toUpperCase()}`;
      
      const card = document.createElement("div");
      card.className = "option-card";
      
      const marker = document.createElement("div");
      marker.className = "option-marker";
      marker.textContent = key;
      
      const label = document.createElement("span");
      label.className = "option-text";
      label.textContent = optionText;
      
      card.appendChild(marker);
      card.appendChild(label);
      
      // Select logic
      setupOptionClick(card, key, hasAnswered);
      optionsContainer.appendChild(card);
    });
  }
  
  // Footer Button states
  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.innerHTML = currentQuestionIndex === quizQuestions.length - 1 
    ? 'Finish <i class="fa-solid fa-flag-checkered"></i>' 
    : 'Next <i class="fa-solid fa-chevron-right"></i>';
    
  // Handle already answered styling and side panel info
  if (hasAnswered) {
    revealAnswerStatus(q);
  } else {
    // Show guide/help
    infoBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-bolt"></i></div>
        <h3>Select your Answer</h3>
        <p>Choose the correct option to verify your understanding. ${isPracticeMode ? 'Practice mode will validate instantly.' : 'Exam mode will compile results at the end.'}</p>
      </div>
    `;
  }
}

// Setup Option Card Click Handler
function setupOptionClick(cardElement, optionKey, hasAnswered) {
  if (hasAnswered && isPracticeMode) {
    // In practice mode, lock once answered
    cardElement.style.cursor = "default";
    return;
  }
  
  // Highlight if selected (especially in Exam Mode)
  if (userAnswers[currentQuestionIndex] === optionKey) {
    cardElement.classList.add("selected");
  }
  
  cardElement.addEventListener("click", () => {
    if (isPracticeMode && userAnswers[currentQuestionIndex] !== null) return; // locked
    
    // Select this answer
    userAnswers[currentQuestionIndex] = optionKey;
    saveProgress();
    
    // Rerender question to show selected/correct state
    renderQuestion();
    updateSidebarStats();
    
    // Proactively check if all answered (for Exam Mode finish triggers)
    checkQuizCompletion();
  });
}

// Reveal correct/incorrect status
function revealAnswerStatus(q) {
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const correctAnswer = q.correct_answer;
  const cards = optionsContainer.children;
  
  // Apply visual styles to cards
  for (let card of cards) {
    const markerText = card.querySelector(".option-marker").textContent.toLowerCase();
    
    if (isPracticeMode) {
      if (markerText === correctAnswer) {
        card.classList.add("correct");
      } else if (markerText === selectedAnswer && selectedAnswer !== correctAnswer) {
        card.classList.add("incorrect");
      }
    } else {
      // Exam Mode: Just show the user's selected option as active/selected
      if (markerText === selectedAnswer) {
        card.classList.add("selected");
      }
    }
  }
  
  // Show side panel explanation in Practice Mode
  if (isPracticeMode) {
    const isCorrect = selectedAnswer === correctAnswer;
    
    // Feedback text
    if (isCorrect) {
      feedbackIndicator.textContent = "Correct! ✨";
      feedbackIndicator.className = "feedback-indicator correct";
    } else {
      feedbackIndicator.textContent = `Incorrect (Selected ${selectedAnswer.toUpperCase()}) ❌`;
      feedbackIndicator.className = "feedback-indicator incorrect";
    }
    
    // Explanation box
    infoBody.innerHTML = `
      <div class="solution-box">
        <div class="solution-title">
          <i class="fa-solid fa-square-check"></i>
          Correct Answer: Option ${correctAnswer.toUpperCase()}
        </div>
        <div class="solution-answer">
          Selected: Option ${selectedAnswer.toUpperCase()} (${isCorrect ? 'Correct' : 'Incorrect'})
        </div>
        <div class="solution-explanation">
          ${getSmartExplanation(q)}
        </div>
      </div>
    `;
  } else {
    // Exam mode text
    infoBody.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: var(--primary-color); background: rgba(99,102,241,0.1);"><i class="fa-solid fa-lock"></i></div>
        <h3>Answer Registered</h3>
        <p>You selected <strong>Option ${selectedAnswer.toUpperCase()}</strong>.</p>
        <p style="font-size: 11px; margin-top: 8px;">Switch to Practice Mode to see the correct answer immediately, or continue through the test.</p>
      </div>
    `;
  }
}

// Navigation Handlers
function navigatePrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function navigateNext() {
  if (currentQuestionIndex < quizQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    // Finish Quiz button clicked
    finishQuiz();
  }
}

// Flag Question Logic
function toggleFlag() {
  const q = quizQuestions[currentQuestionIndex];
  if (flaggedQuestions.has(q.id)) {
    flaggedQuestions.delete(q.id);
  } else {
    flaggedQuestions.add(q.id);
  }
  saveProgress();
  renderQuestion();
}

// Theme Toggle
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  themeToggle.innerHTML = newTheme === "dark" 
    ? '<i class="fa-solid fa-moon"></i>' 
    : '<i class="fa-solid fa-sun"></i>';
}

// Handle Mode Toggle (Practice vs Exam)
function handleModeChange() {
  isPracticeMode = modeToggle.checked;
  renderQuestion();
  updateSidebarStats();
}

// Keyboard Controls
function handleKeyDown(e) {
  if (e.key === "ArrowLeft") {
    navigatePrev();
  } else if (e.key === "ArrowRight") {
    navigateNext();
  } else if (e.key === "f" || e.key === "F") {
    toggleFlag();
  }
}

// Zoom Image Helper
function openImageInNewTab(src) {
  const win = window.open();
  win.document.write(`<img src="${src}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
  win.document.body.style.background = "#090d16";
  win.document.title = "Zoomed Question Image";
}

// Update Sidebar Stats
function updateSidebarStats() {
  const answeredCount = userAnswers.filter(ans => ans !== null).length;
  const progressPercent = Math.round((answeredCount / quizQuestions.length) * 100);
  statsProgress.textContent = `${progressPercent}%`;
  
  // Calculate score (only correct counts)
  let correctCount = 0;
  userAnswers.forEach((ans, idx) => {
    if (ans && ans === quizQuestions[idx].correct_answer) {
      correctCount++;
    }
  });
  statsScore.textContent = `${correctCount}/${answeredCount}`;
}

// Check if all questions are answered and trigger auto-complete if appropriate
function checkQuizCompletion() {
  const answeredCount = userAnswers.filter(ans => ans !== null).length;
  if (answeredCount === quizQuestions.length) {
    // Optionally trigger modal or alert
  }
}

// Finish Quiz Screen
function finishQuiz() {
  const answeredCount = userAnswers.filter(ans => ans !== null).length;
  let correctCount = 0;
  userAnswers.forEach((ans, idx) => {
    if (ans && ans === quizQuestions[idx].correct_answer) {
      correctCount++;
    }
  });
  
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const elapsedMs = Date.now() - startTime;
  const totalSecs = Math.floor(elapsedMs / 1000);
  const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const secs = String(totalSecs % 60).padStart(2, '0');
  
  // Set Modal Stats
  modalScore.textContent = `${correctCount}/${quizQuestions.length}`;
  modalAccuracy.textContent = `${accuracy}%`;
  modalTime.textContent = `${mins}:${secs}`;
  modalPercentageText.textContent = `${accuracy}%`;
  
  // SVG Circle animation
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracy / 100) * circumference;
  modalProgressCircle.style.strokeDashoffset = offset;
  
  // Show Modal
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  // Toggle practice mode back on so they can review their mistakes with correct answers visible!
  modeToggle.checked = true;
  isPracticeMode = true;
  renderQuestion();
  updateSidebarStats();
}

// LocalStorage Persistence
function saveProgress() {
  const data = {
    userAnswers,
    flaggedQuestions: Array.from(flaggedQuestions),
    startTime,
    currentQuestionIndex
  };
  localStorage.setItem("accenture_vr_prep_progress", JSON.stringify(data));
}

function loadProgress() {
  // Initialize userAnswers array with nulls
  userAnswers = new Array(quizQuestions.length).fill(null);
  
  const saved = localStorage.getItem("accenture_vr_prep_progress");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.userAnswers && data.userAnswers.length === quizQuestions.length) {
        userAnswers = data.userAnswers;
      }
      if (data.flaggedQuestions) {
        flaggedQuestions = new Set(data.flaggedQuestions);
      }
      if (data.startTime) {
        startTime = data.startTime;
      }
      if (data.currentQuestionIndex !== undefined) {
        currentQuestionIndex = data.currentQuestionIndex;
      }
    } catch (e) {
      console.error("Failed to restore progress", e);
    }
  }
}

// Reset Quiz Progress
function resetQuiz() {
  if (confirm("Are you sure you want to reset all progress and restart the timer?")) {
    userAnswers = new Array(quizQuestions.length).fill(null);
    flaggedQuestions.clear();
    startTime = Date.now();
    currentQuestionIndex = 0;
    saveProgress();
    
    generateProgressGrid();
    renderQuestion();
    updateSidebarStats();
    startTimer();
  }
}

// Initialize on Load
window.addEventListener("DOMContentLoaded", init);

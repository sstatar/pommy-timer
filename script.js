// ---------- Duration per mode (seconds) - user-editable ----------
const durations = {
  work: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

const MODE_LABELS = {
  work: "Let's focus!",
  short: 'Take a short break ☕',
  long: 'Long break, relax 🌙',
};

const SESSIONS_PER_CYCLE = 4;

let mode = 'work';
let secondsLeft = durations[mode];
let isRunning = false;
let intervalId = null;
let completedWorkSessions = 0;

// ---------- DOM ----------
const timerDisplay = document.getElementById('timer-display');
const timerInput = document.getElementById('timer-input');
const timerLabel = document.getElementById('timer-label');
const btnStart = document.getElementById('btn-start');
const btnReset = document.getElementById('btn-reset');
const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const modeTabs = document.querySelectorAll('.mode-tab');
const dots = document.querySelectorAll('.dot');
const sessionCountEl = document.getElementById('session-count');
const mascot = document.getElementById('mascot');

// ---------- Window controls ----------
btnMinimize.addEventListener('click', () => window.electronAPI.minimize());
btnClose.addEventListener('click', () => window.electronAPI.close());

// ---------- Render ----------
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function render() {
  timerDisplay.textContent = formatTime(secondsLeft);
  timerLabel.textContent = MODE_LABELS[mode];
  document.title = `${formatTime(secondsLeft)} - Pommy Timer`;

  modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle('filled', index < completedWorkSessions % SESSIONS_PER_CYCLE);
  });

  sessionCountEl.textContent = `${completedWorkSessions} done`;

  btnStart.textContent = isRunning ? 'Pause ⏸' : 'Start ▶';
  btnStart.classList.toggle('is-running', isRunning);
  timerDisplay.classList.toggle('locked', isRunning);

  mascot.classList.toggle('bounce', isRunning);
}

// ---------- Mode switching ----------
function switchMode(newMode, { autoStart = false } = {}) {
  mode = newMode;
  secondsLeft = durations[mode];
  stopTimer();
  render();
  if (autoStart) startTimer();
}

modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.mode !== mode) {
      switchMode(tab.dataset.mode);
    }
  });
});

// ---------- Timer ----------
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  intervalId = setInterval(tick, 1000);
  render();
}

function pauseTimer() {
  isRunning = false;
  clearInterval(intervalId);
  render();
}

function stopTimer() {
  isRunning = false;
  clearInterval(intervalId);
}

function resetTimer() {
  stopTimer();
  secondsLeft = durations[mode];
  render();
}

function tick() {
  secondsLeft -= 1;
  if (secondsLeft <= 0) {
    handleSessionEnd();
    return;
  }
  render();
}

function handleSessionEnd() {
  stopTimer();
  playChime();

  if (mode === 'work') {
    completedWorkSessions += 1;
    const isLongBreak = completedWorkSessions % SESSIONS_PER_CYCLE === 0;
    notify('Focus session done! 🍅', isLongBreak ? 'Time for a long break' : 'Take a short break');
    switchMode(isLongBreak ? 'long' : 'short', { autoStart: true });
  } else {
    notify("Break's over! 💪", 'Back to focus time');
    switchMode('work', { autoStart: true });
  }
}

btnStart.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

btnReset.addEventListener('click', resetTimer);

// ---------- Custom time (click the digits to type your own minutes) ----------
function openTimeEditor() {
  if (isRunning) return;
  timerInput.value = Math.round(durations[mode] / 60);
  timerDisplay.hidden = true;
  timerInput.hidden = false;
  timerInput.focus();
  timerInput.select();
}

function commitTimeEditor() {
  if (timerInput.hidden) return;
  const minutes = Math.min(180, Math.max(1, parseInt(timerInput.value, 10) || Math.round(durations[mode] / 60)));
  durations[mode] = minutes * 60;
  secondsLeft = durations[mode];
  timerInput.hidden = true;
  timerDisplay.hidden = false;
  render();
}

function cancelTimeEditor() {
  timerInput.hidden = true;
  timerDisplay.hidden = false;
}

timerDisplay.addEventListener('click', openTimeEditor);

timerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') commitTimeEditor();
  if (e.key === 'Escape') cancelTimeEditor();
});

timerInput.addEventListener('blur', commitTimeEditor);

// ---------- Chime (generated with Web Audio API, no sound file needed) ----------
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [880, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const startTime = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (err) {
    console.error('Could not play chime:', err);
  }
}

// ---------- System notification ----------
function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') new Notification(title, { body });
    });
  }
}

// ---------- Init ----------
render();

import { AutonomousEngine } from "./core/AutonomousEngine";
import { setLoggingEnabled } from "./utils/logger";
import "../style.css";

// Enable logging in development (can be toggled)
setLoggingEnabled(true);

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root element");
}

const engine = new AutonomousEngine();
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const bassToggle = document.getElementById("bassToggle") as HTMLInputElement;
const drumToggle = document.getElementById("drumToggle") as HTMLInputElement;
const padToggle = document.getElementById("padToggle") as HTMLInputElement;
const melodyToggle = document.getElementById("melodyToggle") as HTMLInputElement;
const complexitySlider = document.getElementById("complexitySlider") as HTMLInputElement;
const complexityValue = document.getElementById("complexityValue") as HTMLSpanElement;

if (!startBtn || !stopBtn || !statusEl || !bassToggle || !drumToggle || !padToggle || !melodyToggle || !complexitySlider || !complexityValue) {
  throw new Error("Missing required UI elements");
}

let isStarting = false; // Flag to prevent multiple simultaneous start attempts

function updateUI(): void {
  const isPlaying = engine.getIsPlaying();
  startBtn.disabled = isPlaying || isStarting;
  stopBtn.disabled = !isPlaying;
  statusEl.textContent = isStarting
    ? "Starting..."
    : isPlaying
      ? "Playing"
      : "Stopped";
}

startBtn.addEventListener("click", async () => {
  if (isStarting || engine.getIsPlaying()) {
    return;
  }

  isStarting = true;
  updateUI();
  statusEl.textContent = "Starting...";

  try {
    await engine.start();
  } catch (error) {
    console.error("Failed to start engine", error);
    statusEl.textContent = "Error starting";
  } finally {
    isStarting = false;
    updateUI();
  }
});

stopBtn.addEventListener("click", () => {
  if (!engine.getIsPlaying()) {
    return;
  }
  try {
    engine.stop();
  } catch (error) {
    console.error("Failed to stop engine", error);
    statusEl.textContent = "Error stopping";
  } finally {
    updateUI();
  }
});

// Layer toggle handlers
bassToggle.addEventListener("change", () => {
  engine.setBassEnabled(bassToggle.checked);
});

drumToggle.addEventListener("change", () => {
  engine.setDrumEnabled(drumToggle.checked);
});

padToggle.addEventListener("change", () => {
  engine.setPadEnabled(padToggle.checked);
});

melodyToggle.addEventListener("change", () => {
  engine.setMelodyEnabled(melodyToggle.checked);
});

// Complexity slider handler
complexitySlider.addEventListener("input", (e) => {
  const complexity = parseFloat((e.target as HTMLInputElement).value);
  engine.setMelodyComplexity(complexity);
  complexityValue.textContent = complexity.toFixed(1);
});

// Initialize complexity display and set initial complexity
const initialComplexity = parseFloat(complexitySlider.value);
engine.setMelodyComplexity(initialComplexity);
complexityValue.textContent = initialComplexity.toFixed(1);

updateUI();


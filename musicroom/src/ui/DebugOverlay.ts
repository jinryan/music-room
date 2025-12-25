import { CONFIG } from "../app/config";
import type { SensorFrame } from "../sensing/types";
import type { FeatureFrame } from "../features/types";

type OverlayElements = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  confidenceEl: HTMLSpanElement;
  speedEl: HTMLSpanElement;
  hud: HTMLDivElement;
  gestureEl: HTMLSpanElement;
  noteEl: HTMLSpanElement;
  pitchEl: HTMLSpanElement;
};

export type OverlayState = {
  gestureType: string | null;
  noteOn: boolean | null;
  pitchHz: number | null;
};

export class DebugOverlay {
  private elements: OverlayElements;

  constructor(root: HTMLElement) {
    this.elements = this.createElements();
    root.appendChild(this.elements.canvas);
    root.appendChild(this.elements.hud);
  }

  resize(width: number, height: number) {
    this.elements.canvas.width = width;
    this.elements.canvas.height = height;
  }

  render(
    frame: SensorFrame,
    featureFrame: FeatureFrame | null,
    state: OverlayState,
  ) {
    const {
      context,
      canvas,
      confidenceEl,
      speedEl,
      gestureEl,
      noteEl,
      pitchEl,
    } = this.elements;
    context.clearRect(0, 0, canvas.width, canvas.height);

    const source = frame.sources.camera_0;
    if (source.kind !== "camera.hand2d") {
      setHudValue(confidenceEl, null);
      setHudValue(speedEl, null);
      setHudLabel(gestureEl, null);
      setHudLabel(noteEl, null);
      setHudValue(pitchEl, null);
      return;
    }

    const hands = source.hands2d ?? [];
    let hand = null;
    for (let i = 0; i < hands.length; i += 1) {
      const candidate = hands[i];
      if (candidate?.handedness === "Left") {
        hand = candidate;
        break;
      }
    }
    if (!hand) {
      setHudValue(confidenceEl, null);
      setHudValue(speedEl, null);
      setHudLabel(gestureEl, null);
      setHudLabel(noteEl, null);
      setHudValue(pitchEl, null);
      return;
    }

    const rawX = hand.x * canvas.width;
    const rawY = hand.y * canvas.height;

    drawDot(
      context,
      rawX,
      rawY,
      CONFIG.ui.overlay.dotRadius.raw,
      CONFIG.ui.overlay.colors.raw,
    );

    setHudValue(confidenceEl, hand.confidence);
    setHudLabel(gestureEl, state.gestureType);
    setHudLabel(
      noteEl,
      state.noteOn === null ? null : state.noteOn ? "ON" : "OFF",
    );
    setHudValue(pitchEl, state.pitchHz);

    if (!featureFrame) {
      setHudValue(speedEl, null);
      return;
    }

    const smoothed = featureFrame.features.leftHand.position;
    const smoothX = smoothed.x * canvas.width;
    const smoothY = smoothed.y * canvas.height;

    drawDot(
      context,
      smoothX,
      smoothY,
      CONFIG.ui.overlay.dotRadius.smooth,
      CONFIG.ui.overlay.colors.smooth,
    );

    const velocity = featureFrame.features.leftHand.velocity;
    drawVelocityArrow(context, smoothX, smoothY, velocity, canvas);

    setHudValue(speedEl, featureFrame.features.leftHand.speed);
  }

  private createElements(): OverlayElements {
    const canvas = document.createElement("canvas");
    canvas.className = "debug-overlay";
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context unavailable");
    }

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `
      <div>Confidence: <span class="hud-value hud-confidence">${CONFIG.ui.hudEmpty}</span></div>
      <div>Speed: <span class="hud-value hud-speed">${CONFIG.ui.hudEmpty}</span></div>
      <div>Gesture: <span class="hud-value hud-gesture">${CONFIG.ui.hudEmpty}</span></div>
      <div>Note: <span class="hud-value hud-note">${CONFIG.ui.hudEmpty}</span></div>
      <div>Pitch: <span class="hud-value hud-pitch">${CONFIG.ui.hudEmpty}</span></div>
    `;
    const confidenceEl = hud.querySelector<HTMLSpanElement>(".hud-confidence");
    const speedEl = hud.querySelector<HTMLSpanElement>(".hud-speed");
    const gestureEl = hud.querySelector<HTMLSpanElement>(".hud-gesture");
    const noteEl = hud.querySelector<HTMLSpanElement>(".hud-note");
    const pitchEl = hud.querySelector<HTMLSpanElement>(".hud-pitch");

    if (!confidenceEl || !speedEl || !gestureEl || !noteEl || !pitchEl) {
      throw new Error("HUD element missing");
    }

    return {
      canvas,
      context,
      confidenceEl,
      speedEl,
      gestureEl,
      noteEl,
      pitchEl,
      hud,
    };
  }
}

function drawDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function setHudValue(target: HTMLSpanElement, value: number | null) {
  target.textContent = value === null ? CONFIG.ui.hudEmpty : value.toFixed(2);
}

function setHudLabel(target: HTMLSpanElement, value: string | null) {
  target.textContent = value ?? CONFIG.ui.hudEmpty;
}

function drawVelocityArrow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  velocity: { x: number; y: number },
  canvas: HTMLCanvasElement,
) {
  const scale =
    Math.min(canvas.width, canvas.height) * CONFIG.ui.overlay.velocityScale;
  const dx = velocity.x * scale;
  const dy = velocity.y * scale;
  const endX = x + dx;
  const endY = y + dy;

  context.strokeStyle = CONFIG.ui.overlay.colors.velocity;
  context.lineWidth = CONFIG.ui.overlay.velocityArrow.lineWidth;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(endX, endY);
  context.stroke();

  const angle = Math.atan2(dy, dx);
  const headLength = CONFIG.ui.overlay.velocityArrow.headLength;
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6),
  );
  context.lineTo(endX, endY);
  context.fillStyle = CONFIG.ui.overlay.colors.velocity;
  context.fill();
}

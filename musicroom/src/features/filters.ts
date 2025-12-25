export function ema(current: number, previous: number, alpha: number) {
  return alpha * current + (1 - alpha) * previous;
}

export function emaVector(
  current: { x: number; y: number },
  previous: { x: number; y: number },
  alpha: number,
) {
  return {
    x: ema(current.x, previous.x, alpha),
    y: ema(current.y, previous.y, alpha),
  };
}

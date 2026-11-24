/// <reference lib="webworker" />

/**
 * Independent pitch/tempo processing for the clean-room engine.
 *
 * Pitch is shifted by cubic resampling; tempo is changed with WSOLA
 * (waveform-similarity overlap-add) so the two controls stay independent.
 * The work is done in a worker because a 4-minute stereo buffer has ~40M
 * samples and must not block the player UI.
 */

export type PitchTempoRequest = {
  id: number;
  left: Float32Array;
  right: Float32Array;
  pitchSemitones: number;
  tempoPercent: number;
};

export type PitchTempoResponse = {
  id: number;
  left: Float32Array;
  right: Float32Array;
};

const FRAME = 2048;
const OVERLAP = FRAME / 2;
const HOP_OUT = FRAME - OVERLAP;
const CORR_LEN = 512;
const SEARCH_RADIUS = 512;
const SEARCH_STEP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resampleCubic(input: Float32Array, step: number): Float32Array {
  const outLength = Math.max(1, Math.floor(input.length / step));
  const output = new Float32Array(outLength);
  for (let index = 0; index < outLength; index += 1) {
    const position = index * step;
    const base = Math.floor(position);
    const fraction = position - base;
    const x0 = input[base] ?? 0;
    const x1 = input[base + 1] ?? 0;
    const xm1 = input[base - 1] ?? x0;
    const x2 = input[base + 2] ?? x1;
    const a = -0.5 * xm1 + 1.5 * x0 - 1.5 * x1 + 0.5 * x2;
    const b = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
    const c = -0.5 * xm1 + 0.5 * x1;
    output[index] = ((a * fraction + b) * fraction + c) * fraction + x0;
  }
  return output;
}

function makeWindow(): Float32Array {
  const window = new Float32Array(FRAME);
  for (let index = 0; index < FRAME; index += 1) {
    window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (FRAME - 1));
  }
  return window;
}

const hann = makeWindow();

function stretchStereo(
  left: Float32Array,
  right: Float32Array,
  factor: number,
): [Float32Array, Float32Array] {
  if (Math.abs(factor - 1) < 0.001) {
    return [left.slice(), right.slice()];
  }

  const outLength = Math.max(1, Math.floor(left.length * factor));
  const outLeft = new Float32Array(outLength);
  const outRight = new Float32Array(outLength);
  const hopIn = HOP_OUT / clamp(factor, 0.25, 4);
  let previousTailLeft = new Float32Array(OVERLAP);
  let previousTailRight = new Float32Array(OVERLAP);
  let outPosition = 0;
  let frameIndex = 0;

  while (outPosition < outLength) {
    const target = Math.round(frameIndex * hopIn);
    let bestOffset = 0;
    let bestScore = -Infinity;

    for (
      let offset = -SEARCH_RADIUS;
      offset <= SEARCH_RADIUS;
      offset += SEARCH_STEP
    ) {
      const start = target + offset;
      let score = 0;
      for (let index = 0; index < CORR_LEN; index += 1) {
        const a =
          (previousTailLeft[index] ?? 0) + (previousTailRight[index] ?? 0);
        const b =
          (left[start + index] ?? 0) + (right[start + index] ?? 0);
        score += a * b;
      }
      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }

    const start = target + bestOffset;
    for (let index = 0; index < FRAME; index += 1) {
      const inputIndex = start + index;
      const weighted = hann[index];
      const targetIndex = outPosition + index;
      if (targetIndex >= outLength) break;
      outLeft[targetIndex] += (left[inputIndex] ?? 0) * weighted;
      outRight[targetIndex] += (right[inputIndex] ?? 0) * weighted;
    }

    previousTailLeft = left.slice(
      Math.max(0, start + OVERLAP),
      Math.max(0, start + OVERLAP) + OVERLAP,
    );
    previousTailRight = right.slice(
      Math.max(0, start + OVERLAP),
      Math.max(0, start + OVERLAP) + OVERLAP,
    );

    outPosition += HOP_OUT;
    frameIndex += 1;
  }

  return [outLeft, outRight];
}

export function processPitchTempo(
  left: Float32Array,
  right: Float32Array,
  pitchSemitones: number,
  tempoPercent: number,
): [Float32Array, Float32Array] {
  const pitchRatio = Math.pow(2, pitchSemitones / 12);
  const tempoRatio = clamp(1 + tempoPercent / 100, 0.5, 2);

  let processedLeft = left;
  let processedRight = right;
  if (Math.abs(pitchRatio - 1) > 0.0005) {
    processedLeft = resampleCubic(processedLeft, pitchRatio);
    processedRight = resampleCubic(processedRight, pitchRatio);
  }

  const stretchFactor = pitchRatio / tempoRatio;
  if (Math.abs(stretchFactor - 1) > 0.0005) {
    [processedLeft, processedRight] = stretchStereo(
      processedLeft,
      processedRight,
      stretchFactor,
    );
  }

  return [processedLeft, processedRight];
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<PitchTempoRequest>) => {
  const { id, left, right, pitchSemitones, tempoPercent } = event.data;
  try {
    const [outLeft, outRight] = processPitchTempo(
      left,
      right,
      pitchSemitones,
      tempoPercent,
    );
    const response: PitchTempoResponse = {
      id,
      left: outLeft,
      right: outRight,
    };
    workerScope.postMessage(response, [outLeft.buffer, outRight.buffer]);
  } catch (error) {
    workerScope.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

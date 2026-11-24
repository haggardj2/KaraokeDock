// Soft aurora ribbons behind the lyrics. One small fragment shader, drawn at a third of
// the screen resolution and at most 30 times a second, so it stays light on TV boxes.

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// Every time-based angle is worked out on the CPU and kept within one turn: small GPUs
// (common in TV boxes) only have 16-bit floats, and a raw clock in the shader loses its
// precision within minutes, so the ribbons would jitter or vanish during a long song.
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uResolution;
uniform vec3 uWaveA;
uniform vec3 uWaveB;
uniform vec2 uShimmer;
uniform float uBass;
uniform float uMid;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(1.0, uResolution.y);
  float x = uv.x * aspect;
  vec3 color = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float phaseA = i == 0 ? uWaveA.x : (i == 1 ? uWaveA.y : uWaveA.z);
    float phaseB = i == 0 ? uWaveB.x : (i == 1 ? uWaveB.y : uWaveB.z);
    float wave = sin(x * (1.3 + fi * 0.45) + phaseA + fi * 2.1) * 0.16
               + sin(x * (2.9 + fi * 0.8) - phaseB + fi * 4.0) * 0.06;
    float center = 0.28 + fi * 0.2 + wave;
    float width = 0.07 + fi * 0.02 + uBass * 0.06;
    float d = (uv.y - center) / width;
    float glow = exp(-d * d);
    // Curtain-like vertical shimmer along each ribbon.
    float shimmer = 0.55 + 0.45 * sin(x * 16.0 + uShimmer.x + fi * 3.0 + sin(x * 4.0 - uShimmer.y) * 2.0);
    vec3 tint = i == 0 ? uColorA : (i == 1 ? uColorB : uColorC);
    color += tint * glow * shimmer * (0.5 + 0.7 * uMid);
  }
  float vignette = smoothstep(1.15, 0.25, length(uv - 0.5) * 1.5);
  gl_FragColor = vec4(color * vignette, 1.0);
}`;

const RESOLUTION_SCALE = 1 / 3;
const FRAME_INTERVAL_MS = 1000 / 30;
const SPEED = 0.22;
const TURN = Math.PI * 2;

/** An angle that advances `rate` radians per animation second, kept within one turn. */
function phase(seconds: number, rate: number): number {
  return (seconds * SPEED * rate) % TURN;
}

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const value = match ? parseInt(match[1], 16) : 0x2f9ff2;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function rotateHue([r, g, b]: [number, number, number], degrees: number): [number, number, number] {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const matrix = [
    0.299 + 0.701 * cos + 0.168 * sin, 0.587 - 0.587 * cos + 0.330 * sin, 0.114 - 0.114 * cos - 0.497 * sin,
    0.299 - 0.299 * cos - 0.328 * sin, 0.587 + 0.413 * cos + 0.035 * sin, 0.114 - 0.114 * cos + 0.292 * sin,
    0.299 - 0.300 * cos + 1.250 * sin, 0.587 - 0.588 * cos - 1.050 * sin, 0.114 + 0.886 * cos - 0.203 * sin,
  ];
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return [
    clamp(matrix[0] * r + matrix[1] * g + matrix[2] * b),
    clamp(matrix[3] * r + matrix[4] * g + matrix[5] * b),
    clamp(matrix[6] * r + matrix[7] * g + matrix[8] * b),
  ];
}

export class AuroraVisualizer {
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private colors: Array<[number, number, number]> = [];
  private lastFrame = 0;
  private startedAt = -1;
  private bass = 0;
  private mid = 0;
  private lost = false;

  // The GPU can drop the context (memory pressure, driver reset); keep the canvas
  // and rebuild once the browser gives it back.
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
    this.program = null;
    this.buffer = null;
  };
  private readonly onContextRestored = () => {
    this.lost = false;
    if (this.gl) this.setup(this.gl);
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (this.gl) this.setup(this.gl);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.setBaseColor("#2f9ff2");
  }

  get available(): boolean {
    return this.gl != null && (this.program != null || this.lost);
  }

  private setup(gl: WebGLRenderingContext): void {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    this.program = program;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    for (const name of ["uResolution", "uWaveA", "uWaveB", "uShimmer", "uBass", "uMid", "uColorA", "uColorB", "uColorC"]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  /** Ribbon colours follow the song's lyric colour. */
  setBaseColor(hex: string): void {
    const base = hexToRgb(hex);
    this.colors = [base, rotateHue(base, 70), rotateHue(base, -60)];
  }

  /** Canvas size in CSS pixels; the drawing buffer is a third of it. */
  resize(width: number, height: number): void {
    this.canvas.width = Math.max(1, Math.round(width * RESOLUTION_SCALE));
    this.canvas.height = Math.max(1, Math.round(height * RESOLUTION_SCALE));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  render(nowMs: number, spectrum: Uint8Array | null): void {
    const gl = this.gl;
    if (!gl || !this.program || this.lost) return;
    if (nowMs - this.lastFrame < FRAME_INTERVAL_MS) return;
    this.lastFrame = nowMs;
    if (this.startedAt < 0) this.startedAt = nowMs;
    const seconds = (nowMs - this.startedAt) / 1000;

    if (spectrum && spectrum.length > 64) {
      let bass = 0;
      let mid = 0;
      for (let index = 1; index < 9; index += 1) bass += spectrum[index];
      for (let index = 9; index < 64; index += 1) mid += spectrum[index];
      bass /= 8 * 255;
      mid /= 55 * 255;
      this.bass += (bass - this.bass) * 0.2;
      this.mid += (mid - this.mid) * 0.1;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const position = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform3f(this.uniforms.uWaveA, phase(seconds, 0.7), phase(seconds, 0.95), phase(seconds, 1.2));
    gl.uniform3f(this.uniforms.uWaveB, phase(seconds, 0.5), phase(seconds, 0.65), phase(seconds, 0.8));
    gl.uniform2f(this.uniforms.uShimmer, phase(seconds, 2.4), phase(seconds, 1));
    gl.uniform1f(this.uniforms.uBass, this.bass);
    gl.uniform1f(this.uniforms.uMid, this.mid);
    gl.uniform3fv(this.uniforms.uColorA, this.colors[0]);
    gl.uniform3fv(this.uniforms.uColorB, this.colors[1]);
    gl.uniform3fv(this.uniforms.uColorC, this.colors[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    const gl = this.gl;
    if (!gl) return;
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    // Each song gets a new canvas; free its context now rather than at GC.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.gl = null;
    this.program = null;
  }
}

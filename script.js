
const canvas = document.querySelector("#space");
const ctx = canvas.getContext("2d");

const gravityInput = document.querySelector("#gravity");
const speedInput = document.querySelector("#speed");
const gravityValue = document.querySelector("#gravityValue");
const speedValue = document.querySelector("#speedValue");
const timeDisplay = document.querySelector("#time");
const pauseButton = document.querySelector("#pause");

let width = 0;
let height = 0;
let stars = [];
let planets = [];
let paused = false;
let simulationTime = 0;
let previousFrame = 0;
let accumulator = 0;

// Simplified planetary distances and display sizes.
const planetData = [
  { name: "Mercury", r: 0.39, size: 3, color: "#b9b5c5" },
  { name: "Venus",   r: 0.72, size: 5, color: "#f6c58c" },
  { name: "Earth",   r: 1.00, size: 5, color: "#56a8ff" },
  { name: "Mars",    r: 1.52, size: 4, color: "#ff806d" },
  { name: "Jupiter", r: 2.40, size: 9, color: "#e8c39b" }
];

// Restore the initial planetary positions and velocities.
function resetSimulation() {
  simulationTime = 0;
  accumulator = 0;

  planets = planetData.map((p) => ({
    ...p,
    x: p.r,
    y: 0,
    vx: 0,
    vy: Math.sqrt(1 / p.r),
    trail: []
  }));

  timeDisplay.textContent = "0.00 years";
}

// Prepare a sharp canvas for different screen sizes.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = rect.width;
  height = rect.height;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5 + 0.3,
    alpha: Math.random() * 0.6 + 0.15
  }));
}

// Newtonian gravity around a stationary Sun.
// Units are normalized for an educational model.
function acceleration(x, y) {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);

  if (r < 0.08) {
    return { ax: 0, ay: 0 };
  }

  const strength = Number(gravityInput.value);
  const factor = -strength / (r2 * r);

  return {
    ax: factor * x,
    ay: factor * y
  };
}

// Velocity-Verlet numerical integration.
function advancePhysics(dt) {
  for (const p of planets) {
    const a1 = acceleration(p.x, p.y);

    const nx = p.x + p.vx * dt + 0.5 * a1.ax * dt * dt;
    const ny = p.y + p.vy * dt + 0.5 * a1.ay * dt * dt;

    const a2 = acceleration(nx, ny);

    p.vx += 0.5 * (a1.ax + a2.ax) * dt;
    p.vy += 0.5 * (a1.ay + a2.ay) * dt;

    p.x = nx;
    p.y = ny;
  }

  simulationTime += dt;
}

function drawSpace() {
  ctx.clearRect(0, 0, width, height);

  // Starry background.
  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "#dce8ff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  ctx.globalAlpha = 1;

  const scale = Math.min(width / 6.2, height / 5.6);
  const cx = width / 2;
  const cy = height / 2;

  // Faint circular orbital guides.
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 6]);

  for (const p of planets) {
    ctx.beginPath();
    ctx.ellipse(
      cx, cy, p.r * scale, p.r * scale,
      0, 0, Math.PI * 2
    );
    ctx.strokeStyle = "rgba(139,157,255,0.22)";
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Glowing Sun.
  const sunGlow = ctx.createRadialGradient(
    cx, cy, 2, cx, cy, 36
  );

  sunGlow.addColorStop(0, "#fff8d4");
  sunGlow.addColorStop(0.15, "#ffd166");
  sunGlow.addColorStop(0.45, "rgba(255,145,40,0.35)");
  sunGlow.addColorStop(1, "rgba(255,145,40,0)");

  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff3bc";
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  // Planet trails and moving planets.
  for (const p of planets) {
    p.trail.push({ x: p.x, y: p.y });

    if (p.trail.length > 240) {
      p.trail.shift();
    }

    ctx.beginPath();

    p.trail.forEach((point, i) => {
      const x = cx + point.x * scale;
      const y = cy - point.y * scale;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = p.color + "88";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const px = cx + p.x * scale;
    const py = cy - p.y * scale;

    ctx.shadowBlur = 12;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;

    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.font = "10px system-ui";
    ctx.fillStyle = "#dce5ff";
    ctx.fillText(p.name, px + p.size + 5, py - p.size - 4);
  }
}

// Animate the simulation smoothly.
function frame(timestamp) {
  if (!previousFrame) previousFrame = timestamp;

  const elapsed = Math.min(
    (timestamp - previousFrame) / 1000,
    0.05
  );

  previousFrame = timestamp;

  if (!paused) {
    accumulator += elapsed * Number(speedInput.value);

    const step = 0.003;
    let steps = 0;

    while (accumulator >= step && steps < 40) {
      advancePhysics(step);
      accumulator -= step;
      steps++;
    }

    timeDisplay.textContent =
      (simulationTime / (2 * Math.PI)).toFixed(2) + " years";
  }

  drawSpace();
  requestAnimationFrame(frame);
}

// Gravity and speed controls.
gravityInput.addEventListener("input", () => {
  gravityValue.textContent =
    Number(gravityInput.value).toFixed(1) + "×";
});

speedInput.addEventListener("input", () => {
  speedValue.textContent =
    Number(speedInput.value).toFixed(1) + "×";
});

// Pause and resume.
pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "▶ Resume" : "Ⅱ Pause";
});

// Reset the simulation.
document.querySelector("#reset").addEventListener("click", () => {
  resetSimulation();
});

// Start everything.
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetSimulation();
requestAnimationFrame(frame);

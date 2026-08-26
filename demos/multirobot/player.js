// Replays a recorded simulation run.
//
// The drawing code here is the live viewer's (web/static/app.js in the
// multirobot-warehouse repo) reused as-is: the same y-flip, the same belt and
// port geometry, the same robot styling. Only the source of the data differs.
// The live viewer polls a running Python process; this reads one JSON file
// captured by `main.py --record` and steps a cursor through its frames.

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const listEl = document.getElementById('robot-list');
const loadingEl = document.getElementById('loading');
const playBtn = document.getElementById('play');
const restartBtn = document.getElementById('restart');
const scrub = document.getElementById('scrub');
const frameLabel = document.getElementById('frame-label');
const captionEl = document.getElementById('caption');

const COLORS = {
  empty: '#252932',
  gridLine: '#31363f',
  obstacle: '#565d6b',
  dynamic: '#c85a5a',
  belt: '#464a54',
  source: '#4da3ff',
  destination: '#ffc14d',
  approach: '#2f3a4a',
  label: '#12141a',
};

let map = null;
let frames = [];
let baseFps = 2;
let cell = 16;
let state = null;

// Replay cursor
let index = 0;
let playing = true;
let speed = 1;
let lastAdvance = 0;

// The recorded frames omit anything derivable from the static map, so build
// the lookups the trace dropped: approach cell -> conveyor port. This is the
// browser-side twin of RobotGridSimulation.port_for.
let portByApproach = new Map();
const key = (p) => `${p[0]},${p[1]}`;
const portFor = (approach) => portByApproach.get(key(approach)) || approach;

// Grid y increases upwards; canvas rows increase downwards. Row 0 of the
// canvas is the top conveyor belt (y == height), so the floor starts at row 1
// and the bottom belt (y == -1) is the last row.
const rowOf = (y) => map.height - y;
const cx = (x) => x * cell + cell / 2;
const cy = (y) => rowOf(y) * cell + cell / 2;

function sizeCanvas() {
  const available = document.getElementById('canvas-wrap').clientWidth - 20;
  cell = Math.max(10, Math.min(30, Math.floor(available / map.width)));
  canvas.width = map.width * cell;
  canvas.height = (map.height + 2) * cell;
}

function fillCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * cell, rowOf(y) * cell, cell, cell);
}

function ring(x, y, color, radius, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx(x), cy(y), radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawStatic() {
  ctx.fillStyle = COLORS.empty;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Conveyor belts run outside the floor along both long edges
  ctx.fillStyle = COLORS.belt;
  ctx.fillRect(0, 0, canvas.width, cell);
  ctx.fillRect(0, (map.height + 1) * cell, canvas.width, cell);

  if (cell >= 12) {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= map.width; x++) {
      ctx.moveTo(x * cell + 0.5, cell);
      ctx.lineTo(x * cell + 0.5, (map.height + 1) * cell);
    }
    for (let r = 1; r <= map.height + 1; r++) {
      ctx.moveTo(0, r * cell + 0.5);
      ctx.lineTo(canvas.width, r * cell + 0.5);
    }
    ctx.stroke();
  }

  map.obstacles.forEach(([x, y]) => fillCell(x, y, COLORS.obstacle));

  // Ports on the belt, and a tint on the floor cell robots park in front of
  (map.feed_points || []).forEach((feed) => {
    const color = feed.kind === 'source' ? COLORS.source : COLORS.destination;
    fillCell(feed.approach[0], feed.approach[1], COLORS.approach);
    fillCell(feed.port[0], feed.port[1], color);
  });
}

function draw() {
  drawStatic();
  if (!state || !state.robots) return;

  (state.dynamic_obstacles || []).forEach(([x, y]) => fillCell(x, y, COLORS.dynamic));

  const radius = Math.max(3, cell * 0.38);

  state.robots.forEach((robot) => {
    const color = 'rgb(' + map.robot_colors[robot.id].join(',') + ')';

    // Only busy robots have a route to show
    if (robot.busy) {
      ring(robot.source[0], robot.source[1], color, radius * 0.65, 2);
      ring(robot.destination[0], robot.destination[1], color, radius * 0.65, 2);

      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx(robot.x), cy(robot.y));
      ctx.lineTo(cx(robot.goal[0]), cy(robot.goal[1]));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Idle robots are hollow and dim, so a parked fleet reads at a glance
    ctx.beginPath();
    ctx.arc(cx(robot.x), cy(robot.y), radius, 0, Math.PI * 2);
    if (robot.busy) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (cell >= 14) {
      ctx.fillStyle = robot.busy ? COLORS.label : color;
      ctx.font = `${Math.round(cell * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(map.robot_names[robot.id], cx(robot.x), cy(robot.y));
    }
  });
}

const fmt = (p) => `(${p[0]}, ${p[1]})`;

function updatePanel() {
  if (!state || !state.robots) return;

  statsEl.innerHTML = [
    `step <span>${state.step}</span>`,
    `elapsed <span>${state.elapsed}s</span>`,
    `active <span>${state.tasks_active}</span>`,
    `done <span>${state.tasks_completed}</span>`,
    `pending <span>${state.tasks_pending}</span>`,
    `<span>${state.running ? 'running' : 'finished'}</span>`,
  ].join(' &middot; ');

  listEl.innerHTML = state.robots.map((robot) => {
    const color = 'rgb(' + map.robot_colors[robot.id].join(',') + ')';
    const pos = `(${robot.x}, ${robot.y})`;
    // Show the conveyor ports, not the floor cells in front of them
    const detail = robot.busy
      ? `${fmt(portFor(robot.source))} &rarr; ${fmt(portFor(robot.destination))} [${robot.phase}]`
      : 'IDLE';
    return `<li class="${robot.busy ? 'busy' : 'idle'}">
        <span class="swatch" style="background:${color}"></span>
        <span class="name">${map.robot_names[robot.id]}</span>
        <span>${pos}</span>
        <span>${detail}</span>
      </li>`;
  }).join('');
}

function show(i) {
  index = Math.max(0, Math.min(i, frames.length - 1));
  state = frames[index];
  scrub.value = String(index);
  frameLabel.textContent = `frame ${index + 1} / ${frames.length}`;
  draw();
  updatePanel();
}

function setPlaying(next) {
  playing = next;
  playBtn.textContent = playing ? 'Pause' : 'Play';
  // Restart the clock, so resuming does not immediately jump a frame
  lastAdvance = performance.now();
}

function tick(now) {
  const interval = 1000 / (baseFps * speed);
  if (playing && now - lastAdvance >= interval) {
    lastAdvance = now;
    // The last frame holds for a beat before looping, so the finished state
    // is actually readable
    show(index >= frames.length - 1 ? 0 : index + 1);
  }
  requestAnimationFrame(tick);
}

function wireControls() {
  playBtn.addEventListener('click', () => setPlaying(!playing));

  restartBtn.addEventListener('click', () => {
    show(0);
    setPlaying(true);
  });

  scrub.addEventListener('input', () => {
    setPlaying(false);
    show(Number(scrub.value));
  });

  document.querySelectorAll('.speeds button').forEach((btn) => {
    btn.addEventListener('click', () => {
      speed = Number(btn.dataset.speed);
      document.querySelectorAll('.speeds button').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      setPlaying(!playing);
    } else if (event.key === 'ArrowRight') {
      setPlaying(false);
      show(index + 1);
    } else if (event.key === 'ArrowLeft') {
      setPlaying(false);
      show(index - 1);
    }
  });
}

function describe(meta) {
  const bits = [
    `${meta.num_robots} robots`,
    `${meta.total_steps} ticks`,
    `${meta.tasks_completed} deliveries`,
    `${meta.max_active_tasks} concurrent`,
    `planner: ${meta.planner}`,
  ];
  if (meta.dynamic_obstacles_enabled) bits.push('dynamic obstacles on');
  if (meta.seed !== null && meta.seed !== undefined) bits.push(`seed ${meta.seed}`);
  return bits.join(' &middot; ');
}

async function init() {
  let trace;
  try {
    const res = await fetch('run.json');
    if (!res.ok) throw new Error(res.status);
    trace = await res.json();
  } catch (err) {
    loadingEl.textContent = 'Could not load the recorded run.';
    return;
  }

  map = trace.map;
  frames = trace.frames;
  baseFps = trace.fps || 2;

  (map.feed_points || []).forEach((feed) => {
    portByApproach.set(key(feed.approach), feed.port);
  });

  captionEl.innerHTML = describe(trace.meta || {});
  scrub.max = String(frames.length - 1);
  loadingEl.remove();

  sizeCanvas();
  window.addEventListener('resize', () => { sizeCanvas(); draw(); });
  wireControls();
  show(0);
  setPlaying(true);
  requestAnimationFrame(tick);
}

init();

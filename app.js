/* ========================================================
   NITRO DRIFT ARCADE - ENGINE & GAME LOGIC
   ======================================================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game States ---
const STATES = { MENU: 0, TRACK_SELECT: 1, INSTRUCTIONS: 2, PLAYING: 3, PAUSED: 4, GAMEOVER: 5 };
let gameState = STATES.MENU;

// --- Input Manager ---
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ShiftLeft: false, ShiftRight: false,
    Escape: false, KeyP: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if ((e.code === 'KeyP' || e.code === 'Escape') && (gameState === STATES.PLAYING || gameState === STATES.PAUSED)) {
            togglePause();
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// --- Sound Synthesizer (Web Audio API) ---
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        engineOsc = audioCtx.createOscillator();
        engineGain = audioCtx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
        engineGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        engineOsc.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.start();
    } catch (e) {
        console.log('Web Audio not supported or blocked', e);
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'nitro') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'checkpoint') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === 'crash') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        }
    } catch (err) {}
}

// --- Track Definitions ---
class Track {
    constructor(name, width, height, checkpoints, barriers, startPos, startAngle) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.checkpoints = checkpoints; // Array of {x, y, radius}
        this.barriers = barriers; // Array of {x, y, w, h}
        this.startPos = startPos;
        this.startAngle = startAngle;
    }
}

const tracks = [
    // Track 0: Oval Speedway
    new Track(
        "Oval Speedway", 2048, 1152,
        [
            { x: 1024, y: 200, radius: 250 },
            { x: 1650, y: 576, radius: 250 },
            { x: 1024, y: 950, radius: 250 },
            { x: 400, y: 576, radius: 250 }
        ],
        [
            // Outer Boundary
            { x: 200, y: 100, w: 1648, h: 40 },
            { x: 200, y: 1012, w: 1648, h: 40 },
            { x: 100, y: 200, w: 40, h: 752 },
            { x: 1908, y: 200, w: 40, h: 752 },
            // Inner Island
            { x: 600, y: 350, w: 848, h: 452 }
        ],
        { x: 1024, y: 150 }, -Math.PI / 2
    ),

    // Track 1: Neon Circuit
    new Track(
        "Neon Circuit", 2048, 1152,
        [
            { x: 500, y: 300, radius: 200 },
            { x: 1548, y: 300, radius: 200 },
            { x: 1548, y: 852, radius: 200 },
            { x: 500, y: 852, radius: 200 }
        ],
        [
            { x: 200, y: 100, w: 1648, h: 40 },
            { x: 200, y: 1012, w: 1648, h: 40 },
            { x: 100, y: 140, w: 40, h: 872 },
            { x: 1908, y: 140, w: 40, h: 872 },
            // Inner complex blocks
            { x: 400, y: 300, w: 300, h: 200 },
            { x: 1348, y: 300, w: 300, h: 200 },
            { x: 400, y: 652, w: 300, h: 200 },
            { x: 1348, y: 652, w: 300, h: 200 },
            { x: 900, y: 450, w: 248, h: 252 }
        ],
        { x: 1024, y: 150 }, -Math.PI / 2
    ),

    // Track 2: Hazard Canyon
    new Track(
        "Hazard Canyon", 2048, 1152,
        [
            { x: 300, y: 300, radius: 180 },
            { x: 1724, y: 300, radius: 180 },
            { x: 1724, y: 852, radius: 180 },
            { x: 1024, y: 576, radius: 180 },
            { x: 300, y: 852, radius: 180 }
        ],
        [
            { x: 150, y: 100, w: 1748, h: 40 },
            { x: 150, y: 1012, w: 1748, h: 40 },
            { x: 100, y: 140, w: 40, h: 872 },
            { x: 1898, y: 140, w: 40, h: 872 },
            // Canyon pillars
            { x: 600, y: 300, w: 150, h: 150 },
            { x: 1200, y: 300, w: 150, h: 150 },
            { x: 900, y: 700, w: 248, h: 150 },
            { x: 450, y: 650, w: 150, h: 200 },
            { x: 1450, y: 650, w: 150, h: 200 }
        ],
        { x: 1024, y: 150 }, -Math.PI / 2
    )
];

let currentTrackIndex = 0;
let currentTrack = tracks[currentTrackIndex];

// --- Car Object ---
class Car {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 56;
        this.angle = angle;
        this.velocity = { x: 0, y: 0 };
        this.speed = 0;
        this.maxSpeed = 10;
        this.acceleration = 0.15;
        this.brakeForce = 0.3;
        this.friction = 0.98;
        this.steerSpeed = 0.045;
        this.driftFactor = 0.92;
        
        this.nitro = 100;
        this.maxNitro = 100;
        this.isNitroActive = false;

        this.color = '#00f3ff';
    }

    reset(pos, angle) {
        this.x = pos.x;
        this.y = pos.y;
        this.angle = angle;
        this.velocity = { x: 0, y: 0 };
        this.speed = 0;
        this.nitro = 100;
        this.isNitroActive = false;
    }

    update() {
        let accelerating = false;
        let turning = 0;

        // Input handling
        if (keys.ArrowUp || keys.KeyW) {
            accelerating = true;
        }
        if (keys.ArrowDown || keys.KeyS) {
            this.speed -= this.brakeForce;
        }
        if (keys.ArrowLeft || keys.KeyA) {
            turning = -1;
        }
        if (keys.ArrowRight || keys.KeyD) {
            turning = 1;
        }

        // Nitro boost
        if ((keys.ShiftLeft || keys.ShiftRight) && this.nitro > 0 && accelerating) {
            this.isNitroActive = true;
            this.nitro -= 0.8;
            this.maxSpeed = 16;
            if (Math.random() < 0.5) playSound('nitro');
        } else {
            this.isNitroActive = false;
            this.maxSpeed = 10;
            if (this.nitro < this.maxNitro) {
                this.nitro += 0.15;
            }
        }

        if (accelerating) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        } else {
            this.speed *= this.friction;
        }

        if (Math.abs(this.speed) > 0.1) {
            this.angle += turning * this.steerSpeed * (this.speed / this.maxSpeed);
        }

        // Physics velocity calculation with drift
        const forwardX = Math.sin(this.angle);
        const forwardY = -Math.cos(this.angle);

        const targetVelocityX = forwardX * this.speed;
        const targetVelocityY = forwardY * this.speed;

        // Blend current velocity with target velocity for drifting inertia
        this.velocity.x = this.velocity.x * this.driftFactor + targetVelocityX * (1 - this.driftFactor);
        this.velocity.y = this.velocity.y * this.driftFactor + targetVelocityY * (1 - this.driftFactor);

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Engine sound modulation
        if (engineOsc && engineGain && gameState === STATES.PLAYING) {
            const currentSpeedMag = Math.hypot(this.velocity.x, this.velocity.y);
            engineOsc.frequency.setValueAtTime(50 + currentSpeedMag * 18, audioCtx.currentTime);
            engineGain.gain.setValueAtTime(0.02 + (this.isNitroActive ? 0.03 : 0), audioCtx.currentTime);
        }

        // Particle emission for drift / smoke
        const currentSpeedMag = Math.hypot(this.velocity.x, this.velocity.y);
        if (currentSpeedMag > 4 && Math.abs(turning) > 0) {
            particles.push(new Particle(this.x - forwardX * 20, this.y - forwardY * 20, 'smoke'));
        }
        if (this.isNitroActive) {
            particles.push(new Particle(this.x - forwardX * 25, this.y - forwardY * 25, 'nitro'));
        }

        // Barrier Collision Detection
        for (let b of currentTrack.barriers) {
            if (this.x + this.width / 2 > b.x && this.x - this.width / 2 < b.x + b.w &&
                this.y + this.height / 2 > b.y && this.y - this.height / 2 < b.y + b.h) {
                // Collision response
                this.speed *= -0.4;
                this.x -= this.velocity.x * 2;
                this.y -= this.velocity.y * 2;
                playSound('crash');
                particles.push(new Particle(this.x, this.y, 'explosion'));
                break;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 4, this.width, this.height);

        // Car Body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Windshield
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 10, this.width - 8, 12);

        // Wheels
        ctx.fillStyle = '#111';
        ctx.fillRect(-this.width / 2 - 4, -this.height / 2 + 8, 4, 12);
        ctx.fillRect(this.width / 2, -this.height / 2 + 8, 4, 12);
        ctx.fillRect(-this.width / 2 - 4, this.height / 2 - 20, 4, 14);
        ctx.fillRect(this.width / 2, this.height / 2 - 20, 4, 14);

        // Nitro flame
        if (this.isNitroActive) {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(-8, this.height / 2);
            ctx.lineTo(8, this.height / 2);
            ctx.lineTo(0, this.height / 2 + 20 + Math.random() * 10);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
}

// --- Particle System ---
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.decay = type === 'smoke' ? 0.03 : (type === 'nitro' ? 0.08 : 0.05);
        this.size = type === 'explosion' ? Math.random() * 8 + 4 : Math.random() * 6 + 3;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        if (this.size > 0.2) this.size -= 0.1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        if (this.type === 'smoke') {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
        } else if (this.type === 'nitro') {
            ctx.fillStyle = '#00f3ff';
        } else {
            ctx.fillStyle = '#ff5500';
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let particles = [];

// --- Game State Variables ---
const player = new Car(0, 0, 0);
let currentCheckpoint = 0;
let currentLap = 1;
const totalLaps = 3;
let raceStartTime = 0;
let raceElapsedTime = 0;
let bestLapTime = Infinity;
let lastLapTime = 0;

function startRace() {
    initAudio();
    currentTrack = tracks[currentTrackIndex];
    player.reset(currentTrack.startPos, currentTrack.startAngle);
    currentCheckpoint = 0;
    currentLap = 1;
    raceStartTime = performance.now();
    raceElapsedTime = 0;
    particles = [];
    setScreen('hud');
    gameState = STATES.PLAYING;
}

function updateGame() {
    if (gameState !== STATES.PLAYING) return;

    player.update();

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Race timer
    raceElapsedTime = (performance.now() - raceStartTime) / 1000;

    // Checkpoint detection
    const cp = currentTrack.checkpoints[currentCheckpoint];
    const dist = Math.hypot(player.x - cp.x, player.y - cp.y);
    if (dist < cp.radius) {
        playSound('checkpoint');
        currentCheckpoint++;
        if (currentCheckpoint >= currentTrack.checkpoints.length) {
            currentCheckpoint = 0;
            const lapTime = raceElapsedTime - lastLapTime;
            lastLapTime = raceElapsedTime;
            if (lapTime < bestLapTime) {
                bestLapTime = lapTime;
            }
            currentLap++;
            if (currentLap > totalLaps) {
                endRace();
            }
        }
    }

    // Update HUD
    document.getElementById('hud-speed').innerText = Math.round(Math.hypot(player.velocity.x, player.velocity.y) * 12);
    document.getElementById('hud-lap').innerText = Math.min(currentLap, totalLaps);
    document.getElementById('hud-time').innerText = raceElapsedTime.toFixed(2);
    document.getElementById('nitro-bar-fill').style.width = `${(player.nitro / player.maxNitro) * 100}%`;
}

function endRace() {
    gameState = STATES.GAMEOVER;
    document.getElementById('res-time').innerText = raceElapsedTime.toFixed(2) + 's';
    document.getElementById('res-bestlap').innerText = bestLapTime.toFixed(2) + 's';
    
    // Save high score in localStorage
    const key = `nitro_record_${currentTrackIndex}`;
    const prevRecord = localStorage.getItem(key);
    const recordEl = document.getElementById('new-record');
    if (!prevRecord || raceElapsedTime < parseFloat(prevRecord)) {
        localStorage.setItem(key, raceElapsedTime);
        recordEl.classList.remove('hidden');
    } else {
        recordEl.classList.add('hidden');
    }

    setScreen('gameover-screen');
}

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === STATES.PLAYING || gameState === STATES.PAUSED || gameState === STATES.GAMEOVER) {
        ctx.save();

        // Camera follow player with clamping
        let camX = player.x - canvas.width / 2;
        let camY = player.y - canvas.height / 2;
        camX = Math.max(0, Math.min(currentTrack.width - canvas.width, camX));
        camY = Math.max(0, Math.min(currentTrack.height - canvas.height, camY));
        ctx.translate(-camX, -camY);

        // Draw Track Asphalt
        ctx.fillStyle = '#1c1c28';
        ctx.fillRect(0, 0, currentTrack.width, currentTrack.height);

        // Draw Track Grid Lines / Details
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 2;
        for (let x = 0; x < currentTrack.width; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, currentTrack.height); ctx.stroke();
        }
        for (let y = 0; y < currentTrack.height; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(currentTrack.width, y); ctx.stroke();
        }

        // Draw Checkpoints (debug/visual hint)
        const activeCp = currentTrack.checkpoints[currentCheckpoint];
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(activeCp.x, activeCp.y, activeCp.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Barriers
        for (let b of currentTrack.barriers) {
            ctx.fillStyle = '#2d2d44';
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        }

        // Draw Particles
        for (let p of particles) {
            p.draw();
        }

        // Draw Player
        player.draw();

        ctx.restore();
    }
}

// --- UI Screen Management ---
function setScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('hud').classList.add('hidden');

    if (screenId === 'hud') {
        document.getElementById('hud').classList.remove('hidden');
    } else {
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }
}

function togglePause() {
    if (gameState === STATES.PLAYING) {
        gameState = STATES.PAUSED;
        setScreen('pause-screen');
    } else if (gameState === STATES.PAUSED) {
        gameState = STATES.PLAYING;
        setScreen('hud');
    }
}

// --- Event Listeners for UI Buttons ---
document.getElementById('btn-play').addEventListener('click', startRace);

document.getElementById('btn-tracks').addEventListener('click', () => {
    setScreen('track-screen');
});

document.getElementById('btn-instructions').addEventListener('click', () => {
    setScreen('instructions-screen');
});

document.getElementById('btn-back-menu').addEventListener('click', () => setScreen('menu-screen'));
document.getElementById('btn-back-menu-2').addEventListener('click', () => setScreen('menu-screen'));

document.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', (e) => {
        document.querySelectorAll('.track-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        currentTrackIndex = parseInt(card.getAttribute('data-track'));
    });
});

document.getElementById('btn-resume').addEventListener('click', togglePause);

document.getElementById('btn-restart').addEventListener('click', () => {
    startRace();
});

document.getElementById('btn-quit').addEventListener('click', () => {
    gameState = STATES.MENU;
    setScreen('menu-screen');
});

document.getElementById('btn-play-again').addEventListener('click', () => {
    startRace();
});

document.getElementById('btn-menu-from-end').addEventListener('click', () => {
    gameState = STATES.MENU;
    setScreen('menu-screen');
});

// --- Main Game Loop ---
function gameLoop() {
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

// Initialize screen
setScreen('menu-screen');
requestAnimationFrame(gameLoop);
/* ========================================================
   NITRO DRIFT ARCADE v1.1.0 - ENGINE & GAME LOGIC
   ======================================================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game States ---
const STATES = { MENU: 0, TRACK_SELECT: 1, INSTRUCTIONS: 2, PLAYING: 3, PAUSED: 4, GAMEOVER: 5 };
let gameState = STATES.MENU;

// --- Audio Synthesizer (Web Audio API) ---
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Engine sound setup
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
        this.initialized = true;
    }

    updateEngine(speed, maxSpeed) {
        if (!this.initialized) return;
        const freq = 50 + (speed / maxSpeed) * 250;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }

    playClick() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playNitro() {
        if (!this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
}

const soundSystem = new SoundSystem();

// --- Input Manager ---
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    KeyW: false, KeyS: false, KeyA: false, KeyD: false,
    ShiftLeft: false, ShiftRight: false, Space: false,
    Escape: false, KeyP: false
};

window.addEventListener('keydown', (e) => {
    soundSystem.init();
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === STATES.PLAYING) pauseGame();
        else if (gameState === STATES.PAUSED) resumeGame();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// --- Tracks Definitions ---
const tracks = [
    {
        name: "Circuit Noir",
        startLine: { x: 200, y: 650, width: 120, height: 20 },
        spawnPos: { x: 260, y: 700, angle: -Math.PI / 2 },
        checkpoints: [
            { x: 200, y: 200, width: 200, height: 100 },
            { x: 700, y: 200, width: 200, height: 100 },
            { x: 700, y: 600, width: 200, height: 100 }
        ],
        walls: [
            { x: 100, y: 100, width: 824, height: 40 },
            { x: 100, y: 628, width: 824, height: 40 },
            { x: 100, y: 140, width: 40, height: 488 },
            { x: 884, y: 140, width: 40, height: 488 },
            { x: 300, y: 250, width: 424, height: 268 }
        ]
    },
    {
        name: "Oval Speedway",
        startLine: { x: 452, y: 650, width: 120, height: 20 },
        spawnPos: { x: 512, y: 700, angle: -Math.PI / 2 },
        checkpoints: [
            { x: 150, y: 300, width: 100, height: 200 },
            { x: 452, y: 100, width: 120, height: 100 },
            { x: 774, y: 300, width: 100, height: 200 }
        ],
        walls: [
            { x: 200, y: 150, width: 624, height: 40 },
            { x: 200, y: 578, width: 624, height: 40 },
            { x: 150, y: 190, width: 50, height: 388 },
            { x: 824, y: 190, width: 50, height: 388 },
            { x: 350, y: 280, width: 324, height: 208 }
        ]
    },
    {
        name: "Viper Canyon",
        startLine: { x: 200, y: 650, width: 120, height: 20 },
        spawnPos: { x: 260, y: 700, angle: -Math.PI / 2 },
        checkpoints: [
            { x: 200, y: 120, width: 150, height: 100 },
            { x: 650, y: 120, width: 150, height: 100 },
            { x: 650, y: 550, width: 150, height: 100 }
        ],
        walls: [
            { x: 120, y: 80, width: 784, height: 40 },
            { x: 120, y: 648, width: 784, height: 40 },
            { x: 120, y: 120, width: 40, height: 528 },
            { x: 864, y: 120, width: 40, height: 528 },
            { x: 280, y: 240, width: 150, height: 300 },
            { x: 580, y: 240, width: 150, height: 300 }
        ]
    }
];

let currentTrackIndex = 0;

// --- Car Object ---
class Car {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 56;
        this.angle = angle;
        this.speed = 0;
        this.maxSpeed = 8;
        this.reverseSpeed = -3;
        this.acceleration = 0.15;
        this.braking = 0.3;
        this.friction = 0.98;
        this.steeringSpeed = 0.05;
        this.driftFactor = 0.92;
        this.nitro = 100;
        this.isNitroActive = false;
        this.driftMultiplier = 1;
        this.driftTimer = 0;
    }

    update() {
        const accelerating = keys.ArrowUp || keys.KeyW;
        const reversing = keys.ArrowDown || keys.KeyS;
        const turningLeft = keys.ArrowLeft || keys.KeyA;
        const turningRight = keys.ArrowRight || keys.KeyD;
        const usingNitro = (keys.ShiftLeft || keys.ShiftRight || keys.Space) && this.nitro > 0;

        // Nitro logic
        if (usingNitro) {
            this.isNitroActive = true;
            this.nitro = Math.max(0, this.nitro - 0.6);
            this.maxSpeed = 13;
            if (Math.random() < 0.3) soundSystem.playNitro();
        } else {
            this.isNitroActive = false;
            this.maxSpeed = 8;
            if (this.nitro < 100) this.nitro = Math.min(100, this.nitro + 0.1);
        }

        // Acceleration & Braking
        if (accelerating) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        } else if (reversing) {
            this.speed -= this.acceleration;
            if (this.speed < this.reverseSpeed) this.speed = this.reverseSpeed;
        } else {
            this.speed *= this.friction;
        }

        // Steering
        if (Math.abs(this.speed) > 0.5) {
            let steer = this.steeringSpeed * (this.speed / this.maxSpeed);
            if (turningLeft) this.angle -= steer;
            if (turningRight) this.angle += steer;
        }

        // Drifting mechanics
        let forwardX = Math.cos(this.angle);
        let forwardY = Math.sin(this.angle);
        
        let velocityX = Math.cos(this.angle) * this.speed;
        let velocityY = Math.sin(this.angle) * this.speed;

        // Check drift state
        let heading = Math.atan2(velocityY, velocityX);
        let slipAngle = Math.abs(this.angle - heading);
        if (slipAngle > 0.3 && Math.abs(this.speed) > 4) {
            this.driftTimer++;
            this.driftMultiplier = Math.min(5, Math.floor(this.driftTimer / 30) + 1);
            if (Math.random() < 0.4) {
                particles.push(new Particle(this.x, this.y, 'smoke'));
                particles.push(new Particle(this.x, this.y, 'spark'));
            }
        } else {
            this.driftTimer = 0;
            this.driftMultiplier = 1;
        }

        // Nitro particles
        if (this.isNitroActive) {
            particles.push(new Particle(this.x - forwardX * 25, this.y - forwardY * 25, 'nitro'));
        }

        // Position update
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Wall collisions
        let track = tracks[currentTrackIndex];
        for (let wall of track.walls) {
            if (this.x > wall.x && this.x < wall.x + wall.width &&
                this.y > wall.y && this.y < wall.y + wall.height) {
                this.speed = -this.speed * 0.5;
                this.x -= Math.cos(this.angle) * 10;
                this.y -= Math.sin(this.angle) * 10;
                score += 50; // penalty or bounce
            }
        }

        soundSystem.updateEngine(Math.abs(this.speed), this.maxSpeed);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);

        // Car Body
        ctx.fillStyle = this.isNitroActive ? '#ff0055' : '#00f3ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Windshield
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(-this.width / 3, -this.height / 4, (this.width / 3) * 2, this.height / 4);

        // Wheels
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 2 - 4, -this.height / 3, 4, 12);
        ctx.fillRect(this.width / 2, -this.height / 3, 4, 12);
        ctx.fillRect(-this.width / 2 - 4, this.height / 4, 4, 12);
        ctx.fillRect(this.width / 2, this.height / 4, 4, 12);

        ctx.restore();
    }
}

// --- Particle System ---
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = type === 'smoke' ? Math.random() * 8 + 4 : Math.random() * 4 + 2;
        this.alpha = 1;
        this.life = type === 'nitro' ? 20 : 40;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 1 / this.life;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        if (this.type === 'smoke') {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.fillStyle = '#f3e600';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        } else if (this.type === 'nitro') {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

let car = null;
let particles = [];
let currentLap = 1;
let totalLaps = 3;
let raceStartTime = 0;
let currentLapTime = 0;
let bestLapTime = Infinity;
let finalScore = 0;
let score = 0;
let nextCheckpoint = 0;

// Load Best Times from LocalStorage
function getBestTimeKey() {
    return `nitro_drift_best_${currentTrackIndex}`;
}

function loadBestTime() {
    const val = localStorage.getItem(getBestTimeKey());
    bestLapTime = val ? parseFloat(val) : Infinity;
}

function saveBestTime(time) {
    if (time < bestLapTime) {
        bestLapTime = time;
        localStorage.setItem(getBestTimeKey(), bestLapTime);
    }
}

// --- Game Initialization & Loops ---
function initGame() {
    loadBestTime();
    let track = tracks[currentTrackIndex];
    car = new Car(track.spawnPos.x, track.spawnPos.y, track.spawnPos.angle);
    particles = [];
    currentLap = 1;
    raceStartTime = performance.now();
    currentLapTime = 0;
    score = 0;
    nextCheckpoint = 0;
}

function update() {
    if (gameState !== STATES.PLAYING) return;

    car.update();

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    // Timing
    let now = performance.now();
    currentLapTime = (now - raceStartTime) / 1000;

    // Checkpoints & Laps
    let track = tracks[currentTrackIndex];
    let cp = track.checkpoints[nextCheckpoint];
    if (car.x > cp.x && car.x < cp.x + cp.width && car.y > cp.y && car.y < cp.y + cp.height) {
        nextCheckpoint = (nextCheckpoint + 1) % track.checkpoints.length;
        score += 200 * car.driftMultiplier;
    }

    // Start/Finish Line Check
    let sl = track.startLine;
    if (car.x > sl.x && car.x < sl.x + sl.width && car.y > sl.y && car.y < sl.y + sl.height) {
        if (nextCheckpoint === 0 && currentLapTime > 5) {
            saveBestTime(currentLapTime);
            if (currentLap >= totalLaps) {
                endGame();
            } else {
                currentLap++;
                raceStartTime = performance.now();
                nextCheckpoint = 0;
            }
        }
    }

    updateHUD();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let track = tracks[currentTrackIndex];

    // Draw Track Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Walls
    ctx.fillStyle = '#2b2b40';
    for (let wall of track.walls) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    // Draw Start Line
    ctx.fillStyle = '#f3e600';
    ctx.fillRect(track.startLine.x, track.startLine.y, track.startLine.width, track.startLine.height);

    // Draw Checkpoints (debug/hint)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let cp of track.checkpoints) {
        ctx.strokeRect(cp.x, cp.y, cp.width, cp.height);
    }

    // Draw Particles
    for (let p of particles) {
        p.draw();
    }

    // Draw Car
    if (car) car.draw();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- HUD Management ---
function updateHUD() {
    document.getElementById('val-lap').innerText = `${currentLap}/${totalLaps}`;
    document.getElementById('val-time').innerText = currentLapTime.toFixed(2);
    document.getElementById('val-speed').innerText = Math.round(Math.abs(car.speed) * 15);
    document.getElementById('val-drift').innerText = car.driftMultiplier;
    document.getElementById('nitro-bar-fill').style.width = `${car.nitro}%`;
}

// --- UI State Management ---
const overlays = {
    menu: document.getElementById('menu-overlay'),
    tracks: document.getElementById('track-overlay'),
    instructions: document.getElementById('instructions-overlay'),
    pause: document.getElementById('pause-overlay'),
    gameover: document.getElementById('gameover-overlay'),
    hud: document.getElementById('hud')
};

function showOverlay(name) {
    Object.keys(overlays).forEach(key => {
        if (key === 'hud') {
            if (name === 'playing') overlays.hud.classList.remove('hidden');
            else overlays.hud.classList.add('hidden');
        } else {
            if (key === name) overlays[key].classList.remove('hidden');
            else overlays[key].classList.add('hidden');
        }
    });
}

function startGame() {
    soundSystem.playClick();
    gameState = STATES.PLAYING;
    initGame();
    showOverlay('playing');
}

function pauseGame() {
    gameState = STATES.PAUSED;
    showOverlay('pause');
}

function resumeGame() {
    soundSystem.playClick();
    gameState = STATES.PLAYING;
    showOverlay('playing');
}

function endGame() {
    gameState = STATES.GAMEOVER;
    finalScore = Math.round(score + (bestLapTime !== Infinity ? 10000 / bestLapTime : 0));
    document.getElementById('go-time').innerText = currentLapTime.toFixed(2) + 's';
    document.getElementById('go-best').innerText = bestLapTime !== Infinity ? bestLapTime.toFixed(2) + 's' : 'N/A';
    document.getElementById('go-drift').innerText = `${car.driftMultiplier}x`;
    document.getElementById('go-score').innerText = finalScore;
    showOverlay('gameover');
}

// --- DOM Event Listeners ---
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-tracks').addEventListener('click', () => {
    soundSystem.playClick();
    showOverlay('tracks');
});
document.getElementById('btn-instructions').addEventListener('click', () => {
    soundSystem.playClick();
    showOverlay('instructions');
});
document.getElementById('btn-back-track').addEventListener('click', () => {
    soundSystem.playClick();
    showOverlay('menu');
});
document.getElementById('btn-back-menu').addEventListener('click', () => {
    soundSystem.playClick();
    showOverlay('menu');
});
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-quit').addEventListener('click', () => {
    soundSystem.playClick();
    gameState = STATES.MENU;
    showOverlay('menu');
});
document.getElementById('btn-play-again').addEventListener('click', startGame);
document.getElementById('btn-go-menu').addEventListener('click', () => {
    soundSystem.playClick();
    gameState = STATES.MENU;
    showOverlay('menu');
});

// Track selection cards
const trackCards = document.querySelectorAll('.track-card');
trackCards.forEach(card => {
    card.addEventListener('click', () => {
        soundSystem.playClick();
        trackCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        currentTrackIndex = parseInt(card.getAttribute('data-track'));
    });
});

// Start game loop
requestAnimationFrame(gameLoop);

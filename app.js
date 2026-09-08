/* ========================================================
   NITRO DRIFT ARCADE v1.2.0 - ENGINE & GAME LOGIC
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
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Engine Oscillator
            this.engineOsc = this.ctx.createOscillator();
            this.engineOsc.type = 'sawtooth';
            this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
            
            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
            
            this.engineOsc.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);
            this.engineOsc.start();
            
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported or blocked', e);
        }
    }

    updateEngine(speed, maxSpeed, isAccelerating) {
        if (!this.initialized) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        const freq = 50 + (speed / maxSpeed) * 220;
        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
        const gain = isAccelerating ? 0.12 : 0.04;
        this.engineGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.1);
    }

    playUISound(freq = 440, type = 'sine', duration = 0.08) {
        if (!this.initialized) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }

    playCrash() {
        if (!this.initialized) return;
        try {
            const bufferSize = this.ctx.sampleRate * 0.3;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, this.ctx.currentTime);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            noise.start();
        } catch(e) {}
    }
}

const sounds = new SoundSystem();

// --- Tracks Definition ---
const tracks = [
    {
        name: "Circuit Noir",
        spawnX: 200,
        spawnY: 480,
        spawnAngle: -Math.PI / 2,
        checkpoints: [
            { x: 200, y: 150, radius: 80 },
            { x: 800, y: 150, radius: 80 },
            { x: 800, y: 480, radius: 80 },
            { x: 200, y: 480, radius: 80 }
        ],
        draw: function(ctx) {
            // Asphalt base
            ctx.fillStyle = '#181824';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Outer & Inner grass/barriers
            ctx.fillStyle = '#0f2618';
            ctx.fillRect(100, 80, 824, 416);
            
            ctx.fillStyle = '#181824';
            ctx.fillRect(180, 140, 664, 296);

            // Track border neon glows
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 4;
            ctx.strokeRect(100, 80, 824, 416);
            ctx.strokeRect(180, 140, 664, 296);

            // Start / Finish Line
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(200, 436);
            ctx.lineTo(200, 496);
            ctx.stroke();
        }
    },
    {
        name: "Oval Speedway",
        spawnX: 512,
        spawnY: 460,
        spawnAngle: 0,
        checkpoints: [
            { x: 800, y: 288, radius: 100 },
            { x: 512, y: 120, radius: 100 },
            { x: 224, y: 288, radius: 100 },
            { x: 512, y: 460, radius: 100 }
        ],
        draw: function(ctx) {
            ctx.fillStyle = '#181824';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#1b1b32';
            ctx.beginPath();
            ctx.ellipse(512, 288, 420, 200, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#070710';
            ctx.beginPath();
            ctx.ellipse(512, 288, 240, 90, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#f3e600';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(512, 288, 420, 200, 0, 0, Math.PI * 2);
            ctx.ellipse(512, 288, 240, 90, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Start / Finish Line
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(512, 378);
            ctx.lineTo(512, 488);
            ctx.stroke();
        }
    },
    {
        name: "Viper Canyon",
        spawnX: 150,
        spawnY: 288,
        spawnAngle: 0,
        checkpoints: [
            { x: 400, y: 120, radius: 80 },
            { x: 850, y: 180, radius: 80 },
            { x: 700, y: 440, radius: 80 },
            { x: 250, y: 420, radius: 80 }
        ],
        draw: function(ctx) {
            ctx.fillStyle = '#1a1410';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#2b1e16';
            ctx.beginPath();
            ctx.moveTo(100, 200);
            ctx.lineTo(450, 60);
            ctx.lineTo(900, 120);
            ctx.lineTo(920, 480);
            ctx.lineTo(600, 520);
            ctx.lineTo(150, 450);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#1a1410';
            ctx.beginPath();
            ctx.arc(350, 280, 120, 0, Math.PI * 2);
            ctx.arc(700, 320, 90, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ff5500';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Start / Finish Line
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(150, 200);
            ctx.lineTo(150, 290);
            ctx.stroke();
        }
    }
];

let currentTrackIndex = 0;

// --- Car Physics & State ---
class Car {
    constructor() {
        this.reset();
    }

    reset() {
        const track = tracks[currentTrackIndex];
        this.x = track.spawnX;
        this.y = track.spawnY;
        this.angle = track.spawnAngle;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
        this.maxSpeed = 7.5;
        this.acceleration = 0.12;
        this.braking = 0.2;
        this.friction = 0.98;
        this.steerSpeed = 0.05;
        this.driftFactor = 0.92;
        this.nitro = 100;
        this.isNitroActive = false;
        this.width = 28;
        this.height = 54;
    }

    update(keys) {
        let isAccelerating = false;

        // Nitro usage
        if (keys['Space'] && this.nitro > 0) {
            this.isNitroActive = true;
            this.nitro = Math.max(0, this.nitro - 0.8);
            this.maxSpeed = 11.5;
        } else {
            this.isNitroActive = false;
            this.maxSpeed = 7.5;
            if (!keys['Space'] && this.nitro < 100) {
                this.nitro = Math.min(100, this.nitro + 0.15);
            }
        }

        // Acceleration / Braking
        if (keys['ArrowUp'] || keys['KeyW']) {
            this.speed += this.acceleration * (this.isNitroActive ? 1.6 : 1.0);
            isAccelerating = true;
        } else if (keys['ArrowDown'] || keys['KeyS']) {
            this.speed -= this.braking;
        } else {
            this.speed *= this.friction;
        }

        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed * 0.4) this.speed = -this.maxSpeed * 0.4;

        // Steering
        let currentSteer = this.steerSpeed * (Math.abs(this.speed) / this.maxSpeed);
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.angle -= currentSteer * Math.sign(this.speed || 0.1);
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.angle += currentSteer * Math.sign(this.speed || 0.1);
        }

        // Drift mechanics
        const forwardX = Math.cos(this.angle);
        const forwardY = Math.sin(this.angle);
        
        const targetVx = forwardX * this.speed;
        const targetVy = forwardY * this.speed;

        this.vx = this.vx * this.driftFactor + targetVx * (1 - this.driftFactor);
        this.vy = this.vy * this.driftFactor + targetVy * (1 - this.driftFactor);

        this.x += this.vx;
        this.y += this.vy;

        // Update sound
        sounds.updateEngine(Math.abs(this.speed), this.maxSpeed, isAccelerating);

        // Particles generation
        if (Math.abs(this.speed) > 3) {
            particles.push(new Particle(this.x - forwardX * 20, this.y - forwardY * 20, this.isNitroActive ? 'nitro' : 'smoke'));
            if (keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD']) {
                particles.push(new Particle(this.x, this.y, 'spark'));
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Nitro exhaust flame
        if (this.isNitroActive) {
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.moveTo(-10, 28);
            ctx.lineTo(0, 42 + Math.random() * 10);
            ctx.lineTo(10, 28);
            ctx.closePath();
            ctx.fill();
        }

        // Car Chassis
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0;

        // Windshield
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-10, -10, 20, 16);

        // Headlights
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-12, -this.height / 2, 6, 4);
        ctx.fillRect(6, -this.height / 2, 6, 4);

        ctx.restore();
    }
}

const player = new Car();

// --- Particle Engine ---
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.03;
        
        if (type === 'smoke') {
            this.size = Math.random() * 8 + 6;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
        } else if (type === 'spark') {
            this.size = Math.random() * 3 + 2;
            this.vx = (Math.random() - 0.5) * 4;
            this.vy = (Math.random() - 0.5) * 4;
        } else if (type === 'nitro') {
            this.size = Math.random() * 6 + 4;
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        if (this.type === 'smoke') {
            ctx.fillStyle = `rgba(180, 180, 180, ${this.life * 0.5})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.fillStyle = '#f3e600';
            ctx.fillRect(this.x, this.y, this.size, this.size);
        } else if (this.type === 'nitro') {
            ctx.fillStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

let particles = [];

// --- Game Management & Race Tracking ---
let currentLap = 1;
const totalLaps = 3;
let currentCheckpointIndex = 0;
let raceStartTime = 0;
let currentRaceTime = 0;
let bestLapTimes = JSON.parse(localStorage.getItem('nitro_drift_best_laps')) || {};
let screenShakeTimer = 0;

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && gameState === STATES.PLAYING) {
        e.preventDefault();
    }
    if ((e.code === 'KeyP' || e.code === 'Escape') && (gameState === STATES.PLAYING || gameState === STATES.PAUSED)) {
        togglePause();
    }
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
});

function triggerScreenShake(duration = 15) {
    screenShakeTimer = duration;
}

function startRace() {
    sounds.init();
    sounds.playUISound(587.33, 'triangle', 0.15);
    currentTrackIndex = parseInt(document.querySelector('.track-card.selected').dataset.track);
    player.reset();
    currentLap = 1;
    currentCheckpointIndex = 0;
    raceStartTime = performance.now();
    currentRaceTime = 0;
    particles = [];
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    gameState = STATES.PLAYING;
}

function togglePause() {
    if (gameState === STATES.PLAYING) {
        gameState = STATES.PAUSED;
        document.getElementById('pause-menu').classList.remove('hidden');
        sounds.playUISound(300, 'sine', 0.1);
    } else if (gameState === STATES.PAUSED) {
        gameState = STATES.PLAYING;
        document.getElementById('pause-menu').classList.add('hidden');
        raceStartTime += (performance.now() - pauseStartTime);
        sounds.playUISound(450, 'sine', 0.1);
    }
}
let pauseStartTime = 0;

function finishRace() {
    gameState = STATES.GAMEOVER;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameover-menu').classList.remove('hidden');
    
    const formattedTime = formatTime(currentRaceTime);
    document.getElementById('final-time').innerText = formattedTime;
    
    const trackName = tracks[currentTrackIndex].name;
    const best = bestLapTimes[trackName] || currentRaceTime;
    if (currentRaceTime < best || !bestLapTimes[trackName]) {
        bestLapTimes[trackName] = currentRaceTime;
        localStorage.setItem('nitro_drift_best_laps', JSON.stringify(bestLapTimes));
    }
    document.getElementById('final-best-lap').innerText = formatTime(bestLapTimes[trackName]);
    sounds.playUISound(650, 'square', 0.3);
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

// --- UI Event Listeners ---
document.getElementById('btn-start').addEventListener('click', startRace);
document.getElementById('btn-tracks').addEventListener('click', () => {
    sounds.playUISound(500);
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('track-select-menu').classList.remove('hidden');
});
document.getElementById('btn-instructions').addEventListener('click', () => {
    sounds.playUISound(500);
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('instructions-menu').classList.remove('hidden');
});
document.getElementById('btn-back-menu').addEventListener('click', () => {
    sounds.playUISound(400);
    document.getElementById('track-select-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
});
document.getElementById('btn-back-instructions').addEventListener('click', () => {
    sounds.playUISound(400);
    document.getElementById('instructions-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
});
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('gameover-menu').classList.add('hidden');
    startRace();
});
document.getElementById('btn-quit').addEventListener('click', () => {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    gameState = STATES.MENU;
});
document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('gameover-menu').classList.add('hidden');
    startRace();
});
document.getElementById('btn-gameover-quit').addEventListener('click', () => {
    document.getElementById('gameover-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    gameState = STATES.MENU;
});

document.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', () => {
        sounds.playUISound(550);
        document.querySelectorAll('.track-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    });
});

// --- Main Game Loop ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (screenShakeTimer > 0) {
        screenShakeTimer--;
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        ctx.translate(offsetX, offsetY);
    }

    const track = tracks[currentTrackIndex];
    track.draw(ctx);

    if (gameState === STATES.PLAYING) {
        currentRaceTime = performance.now() - raceStartTime;
        player.update(keys);

        // Checkpoint validation
        const cp = track.checkpoints[currentCheckpointIndex];
        const dist = Math.hypot(player.x - cp.x, player.y - cp.y);
        if (dist < cp.radius) {
            currentCheckpointIndex++;
            sounds.playUISound(700, 'sine', 0.05);
            if (currentCheckpointIndex >= track.checkpoints.length) {
                currentCheckpointIndex = 0;
                currentLap++;
                if (currentLap > totalLaps) {
                    finishRace();
                }
            }
        }

        // Out of bounds / wall check simulation
        if (player.x < 50 || player.x > canvas.width - 50 || player.y < 50 || player.y > canvas.height - 50) {
            player.speed *= 0.7;
            triggerScreenShake(8);
            sounds.playCrash();
        }

        // Update HUD elements
        document.getElementById('hud-lap').innerText = `${Math.min(currentLap, totalLaps)} / ${totalLaps}`;
        document.getElementById('hud-time').innerText = formatTime(currentRaceTime);
        const trackName = track.name;
        document.getElementById('hud-best').innerText = bestLapTimes[trackName] ? formatTime(bestLapTimes[trackName]) : '--:--.--';
        document.getElementById('hud-speed').innerText = Math.floor((Math.abs(player.speed) / player.maxSpeed) * 180);
        document.getElementById('nitro-fill').style.width = `${player.nitro}%`;
    }

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    player.draw(ctx);
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
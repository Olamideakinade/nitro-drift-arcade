/* ========================================================
   NITRO DRIFT ARCADE v1.3.0 - ENGINE, GAME LOGIC & TESTS
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
        this.isMuted = false;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported in this browser.');
        }
    }

    playEngine(speedRatio) {
        if (!this.ctx || this.isMuted) return;
        if (!this.engineOsc) {
            try {
                this.engineOsc = this.ctx.createOscillator();
                this.engineGain = this.ctx.createGain();
                this.engineOsc.type = 'sawtooth';
                this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
                this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
                this.engineOsc.connect(this.engineGain);
                this.engineGain.connect(this.ctx.destination);
                this.engineOsc.start();
            } catch (e) {}
        } else {
            try {
                const targetFreq = 50 + speedRatio * 180;
                this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
            } catch (e) {}
        }
    }

    stopEngine() {
        if (this.engineOsc) {
            try {
                this.engineOsc.stop();
                this.engineOsc.disconnect();
            } catch (e) {}
            this.engineOsc = null;
            this.engineGain = null;
        }
    }

    playScreech() {
        if (!this.ctx || this.isMuted) return;
        // Short noise burst or high pitch wave for drifting
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.15);
        } catch (e) {}
    }

    playCrash() {
        if (!this.ctx || this.isMuted) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.3);
        } catch (e) {}
    }
}

const soundSystem = new SoundSystem();

// --- Car Physics & State ---
class Car {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 56;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 10;
        this.reverseSpeed = -3;
        this.acceleration = 0.15;
        this.friction = 0.98;
        this.driftFriction = 0.92;
        this.steerSpeed = 0.05;
        this.nitro = 100;
        this.isNitroActive = false;
        this.isDrifting = false;
        this.health = 100;
    }

    update(keys) {
        // Nitro handling
        this.isNitroActive = keys['Space'] && this.nitro > 0;
        let currentMaxSpeed = this.maxSpeed;
        let currentAccel = this.acceleration;

        if (this.isNitroActive) {
            currentMaxSpeed *= 1.5;
            currentAccel *= 2;
            this.nitro = Math.max(0, this.nitro - 0.5);
        } else {
            this.nitro = Math.min(100, this.nitro + 0.15);
        }

        // Acceleration / Reverse
        if (keys['ArrowUp'] || keys['KeyW']) {
            this.speed = Math.min(currentMaxSpeed, this.speed + currentAccel);
        } else if (keys['ArrowDown'] || keys['KeyS']) {
            this.speed = Math.max(this.reverseSpeed, this.speed - currentAccel);
        } else {
            this.speed *= (this.isDrifting ? this.driftFriction : this.friction);
        }

        // Steering
        if (Math.abs(this.speed) > 0.2) {
            const steerFactor = (this.speed / currentMaxSpeed);
            if (keys['ArrowLeft'] || keys['KeyA']) {
                this.angle -= this.steerSpeed * steerFactor;
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                this.angle += this.steerSpeed * steerFactor;
            }
        }

        // Check Drift
        this.isDrifting = (keys['ShiftLeft'] || keys['ShiftRight']) && Math.abs(this.speed) > 4;

        // Apply velocity
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;

        // Sound updates
        soundSystem.playEngine(Math.abs(this.speed) / this.maxSpeed);
        if (this.isDrifting && Math.random() < 0.3) {
            soundSystem.playScreech();
        }
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.nitro = 100;
        this.health = 100;
    }
}

let playerCar = new Car(canvas.width / 2, canvas.height / 2);
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    soundSystem.init();
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// --- Game Loop Stub --- 
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === STATES.PLAYING) {
        playerCar.update(keys);
        // Draw simple representation for testing runner
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(playerCar.x, playerCar.y, 20, 20);
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);


/* ========================================================
   v1.3.0 TEST SUITE & PERFORMANCE BENCHMARKS
   ======================================================== */

class NitroTestSuite {
    constructor() {
        this.results = [];
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion Failed: ${message}`);
        }
        this.results.push({ status: 'PASS', message });
    }

    runUnitTests() {
        console.log('%c[NitroTest] Running v1.3.0 Unit Tests...', 'color: #00f3ff; font-weight: bold;');
        this.results = [];

        try {
            // Test 1: Car Initialization
            const testCar = new Car(100, 200);
            this.assert(testCar.x === 100 && testCar.y === 200, 'Car initialized with correct coordinates');
            this.assert(testCar.health === 100, 'Car initialized with full health');
            this.assert(testCar.nitro === 100, 'Car initialized with full nitro');

            // Test 2: Acceleration & Friction
            testCar.speed = 0;
            testCar.update({ 'ArrowUp': true, 'ArrowDown': false, 'Space': false });
            this.assert(testCar.speed > 0, 'Car accelerates forward when UP key is pressed');

            // Test 3: Nitro Consumption
            testCar.nitro = 50;
            testCar.update({ 'ArrowUp': true, 'Space': true });
            this.assert(testCar.nitro < 50, 'Nitro drains when active during acceleration');

            // Test 4: SoundSystem state
            this.assert(soundSystem.isMuted === false, 'Sound system default unmuted');

            console.log(`%c[NitroTest] All ${this.results.length} Unit Tests Passed Successfully!`, 'color: #00ff55; font-weight: bold;');
            return true;
        } catch (err) {
            console.error(`%c[NitroTest] ${err.message}`, 'color: #ff0055; font-weight: bold;');
            return false;
        }
    }

    runBenchmarks() {
        console.log('%c[NitroBenchmark] Running Performance Benchmarks...', 'color: #f3e600; font-weight: bold;');
        
        // Benchmark 1: Render Loop Latency Test
        const iterations = 1000;
        const startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            ctx.fillStyle = '#070710';
            ctx.fillRect(0, 0, 10, 10);
        }
        const duration = performance.now() - startTime;
        const avgFrameTimeMs = duration / iterations;
        console.log(`%c[Benchmark] Canvas 2D fillRect x${iterations}: ${duration.toFixed(2)}ms (Avg: ${avgFrameTimeMs.toFixed(4)}ms/op)`, 'color: #00f3ff;');
        
        // Benchmark 2: Physics update stress test
        const stressCar = new Car(500, 500);
        const physicsStart = performance.now();
        const simSteps = 5000;
        for (let i = 0; i < simSteps; i++) {
            stressCar.update({ 'ArrowUp': i % 2 === 0, 'Space': i % 4 === 0, 'ArrowLeft': true });
        }
        const physicsDuration = performance.now() - physicsStart;
        console.log(`%c[Benchmark] Physics simulation ${simSteps} steps: ${physicsDuration.toFixed(2)}ms`, 'color: #00f3ff;');

        this.assert(avgFrameTimeMs < 1.0, 'Render latency within optimal bounds (<1ms per op)');
        this.assert(physicsDuration < 50.0, 'Physics engine stress test completed efficiently (<50ms for 5000 steps)');

        console.log('%c[NitroBenchmark] All Performance Benchmarks Passed!', 'color: #00ff55; font-weight: bold;');
        return {
            avgFrameTimeMs,
            physicsDuration
        };
    }
}

// Expose global tester interface
window.NitroGame = {
    runTests: () => {
        const suite = new NitroTestSuite();
        const unitPassed = suite.runUnitTests();
        let benchResults = null;
        if (unitPassed) {
            benchResults = suite.runBenchmarks();
        }
        return { unitPassed, benchResults };
    }
};

// Automatically execute test suite on load in non-production debug contexts if desired
// console.log("Run NitroGame.runTests() in console to execute the v1.3.0 test suite.");

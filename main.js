import * as THREE from 'three';

// 1. SCENE SETUP (No changes)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// 2. LIGHTING (No changes)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// 3. GAME OBJECTS (No changes)
// Floor
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
// Player
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 0.5;
player.castShadow = true;
scene.add(player);
// Coins
const coins = [];
const coinGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
for (let i = 0; i < 10; i++) {
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.position.set((Math.random() - 0.5) * 25, 0.5, (Math.random() - 0.5) * 25);
    coin.castShadow = true;
    coins.push(coin);
    scene.add(coin);
}

// 4. GAME LOGIC & CONTROLS (All changes are in this section)
let score = 0;
const scoreElement = document.getElementById('score');
const clock = new THREE.Clock();

const playerState = {
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 5,
    jumpStrength: 7,
    onGround: true,
};

// Keyboard Controls (No changes here)
const keys = {
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowleft: false, arrowdown: false, arrowright: false,
    ' ': false
};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

// Joystick Controls
const joystickContainer = document.getElementById('joystick-container');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

// --- FIXED ---
// Define the radius as a constant that matches the CSS (120px width / 2)
const JOYSTICK_RADIUS = 60;

const joystickState = {
    active: false,
    center: { x: 0, y: 0 },
    move: new THREE.Vector2(0, 0),
    // REMOVED: radius property that was calculated incorrectly
};

function handleTouchStart(event) {
    event.preventDefault();
    const touch = event.changedTouches[0];
    joystickState.active = true;
    joystickState.center.x = touch.clientX;
    joystickState.center.y = touch.clientY;
    
    joystickContainer.style.display = 'block';
    // --- FIXED --- Use the constant JOYSTICK_RADIUS for positioning
    joystickContainer.style.left = `${touch.clientX - JOYSTICK_RADIUS}px`;
    joystickContainer.style.top = `${touch.clientY - JOYSTICK_RADIUS}px`;
}

function handleTouchMove(event) {
    if (!joystickState.active) return;
    event.preventDefault();
    const touch = event.changedTouches[0];
    
    const deltaX = touch.clientX - joystickState.center.x;
    const deltaY = touch.clientY - joystickState.center.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);
    
    // --- FIXED --- Use the constant JOYSTICK_RADIUS for clamping
    const knobX = Math.min(distance, JOYSTICK_RADIUS) * Math.cos(angle);
    const knobY = Math.min(distance, JOYSTICK_RADIUS) * Math.sin(angle);
    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    
    // --- FIXED --- Use the constant JOYSTICK_RADIUS for calculation
    joystickState.move.x = deltaX / JOYSTICK_RADIUS;
    joystickState.move.y = deltaY / JOYSTICK_RADIUS;
    joystickState.move.clampLength(0, 1);
}

function handleTouchEnd(event) {
    if (!joystickState.active) return;
    event.preventDefault();
    joystickState.active = false;
    
    joystickContainer.style.display = 'none';
    joystickKnob.style.transform = `translate(0px, 0px)`;
    joystickState.move.set(0, 0);
}

// Add touch event listeners for joystick (No changes here)
window.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', handleTouchEnd, { passive: false });
window.addEventListener('touchcancel', handleTouchEnd, { passive: false });


// 5. GAME LOOP (No changes)
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    const moveDirection = new THREE.Vector3(0, 0, 0);
    if (joystickState.active) {
        moveDirection.x = joystickState.move.x;
        moveDirection.z = joystickState.move.y;
    } else {
        if (keys.w || keys.arrowup) moveDirection.z -= 1;
        if (keys.s || keys.arrowdown) moveDirection.z += 1;
        if (keys.a || keys.arrowleft) moveDirection.x -= 1;
        if (keys.d || keys.arrowright) moveDirection.x += 1;
    }

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        player.position.x += moveDirection.x * playerState.speed * deltaTime;
        player.position.z += moveDirection.z * playerState.speed * deltaTime;
    }
    
    playerState.velocity.y -= 9.8 * deltaTime;
    player.position.y += playerState.velocity.y * deltaTime;
    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        playerState.velocity.y = 0;
        playerState.onGround = true;
    }
    if (keys[' '] && playerState.onGround) {
        playerState.velocity.y = playerState.jumpStrength;
        playerState.onGround = false;
    }

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.rotation.y += 2 * deltaTime;
        if (player.position.distanceTo(coin.position) < 0.8) {
            scene.remove(coin);
            coins.splice(i, 1);
            score++;
            scoreElement.innerText = `Score: ${score}`;
            if (coins.length === 0) {
                scoreElement.innerText = `You Win! Final Score: ${score}`;
            }
        }
    }
    
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    
    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // --- REMOVED --- The faulty radius recalculation is no longer needed.
});

// Start the game loop
animate();

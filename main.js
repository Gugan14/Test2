import * as THREE from 'three';

// 1. SCENE SETUP (No changes here)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// 2. LIGHTING (No changes here)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// 3. GAME OBJECTS (No changes here)
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

// 4. GAME LOGIC & CONTROLS
let score = 0;
const scoreElement = document.getElementById('score');

const playerState = {
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 5,
    jumpStrength: 7,
    onGround: true,
};

// Keyboard controls
const keys = { w: false, a: false, s: false, d: false, ' ': false };
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

// --- JOYSTICK ---
// Get HTML elements
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');

// Joystick state
const joystickState = {
    active: false,
    radius: 60, // The radius of the joystick base
    stickRadius: 30, // The radius of the stick
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    vector: { x: 0, y: 0 } // Normalized direction vector
};

function handleTouchStart(event) {
    // Only handle the first touch
    const touch = event.touches[0];

    // Activate joystick only if touch is on the left half of the screen
    if (touch.clientX < window.innerWidth / 2) {
        event.preventDefault(); // Prevent scrolling/zooming
        joystickState.active = true;
        joystickState.startPos = { x: touch.clientX, y: touch.clientY };
        
        // Position and show the joystick base
        joystickBase.style.left = `${joystickState.startPos.x}px`;
        joystickBase.style.top = `${joystickState.startPos.y}px`;
        joystickBase.classList.add('visible');
    }
}

function handleTouchMove(event) {
    if (!joystickState.active) return;
    event.preventDefault();

    const touch = event.touches[0];
    joystickState.currentPos = { x: touch.clientX, y: touch.clientY };

    let dx = joystickState.currentPos.x - joystickState.startPos.x;
    let dy = joystickState.currentPos.y - joystickState.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Clamp the stick's position within the base's radius
    if (distance > joystickState.radius) {
        dx = (dx / distance) * joystickState.radius;
        dy = (dy / distance) * joystickState.radius;
    }
    
    // Update stick's visual position
    joystickStick.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;

    // Calculate the normalized vector for player movement
    joystickState.vector.x = dx / joystickState.radius;
    joystickState.vector.y = dy / joystickState.radius;
}

function handleTouchEnd(event) {
    if (!joystickState.active) return;
    
    joystickState.active = false;
    joystickBase.classList.remove('visible'); // Hide joystick
    joystickStick.style.transform = 'translate(-50%, -50%)'; // Reset stick position
    joystickState.vector = { x: 0, y: 0 }; // Reset movement vector
}

// Add touch event listeners
window.addEventListener('touchstart', handleTouchStart);
window.addEventListener('touchmove', handleTouchMove);
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd); // Also handle cancel events
// --- END JOYSTICK ---


const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Player Movement (Now combines keyboard and joystick)
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    // Keyboard input
    if (keys.w || keys.arrowup) moveDirection.z -= 1;
    if (keys.s || keys.arrowdown) moveDirection.z += 1;
    if (keys.a || keys.arrowleft) moveDirection.x -= 1;
    if (keys.d || keys.arrowright) moveDirection.x += 1;

    // --- JOYSTICK ---
    // Add joystick input to the movement direction
    // Screen Y (joystick.vector.y) corresponds to 3D Z-axis
    moveDirection.x += joystickState.vector.x;
    moveDirection.z += joystickState.vector.y;
    // --- END JOYSTICK ---

    if (moveDirection.length() > 0) {
        moveDirection.normalize(); // Ensure consistent speed
    }

    player.position.x += moveDirection.x * playerState.speed * deltaTime;
    player.position.z += moveDirection.z * playerState.speed * deltaTime;
    
    // Player Physics (Gravity & Jumping)
    playerState.velocity.y -= 9.8 * deltaTime; // Gravity
    player.position.y += playerState.velocity.y * deltaTime;

    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        playerState.velocity.y = 0;
        playerState.onGround = true;
    }

    // Jumping is still keyboard-only. A jump button on the right would be a good next step!
    if (keys[' '] && playerState.onGround) {
        playerState.velocity.y = playerState.jumpStrength;
        playerState.onGround = false;
    }

    // Coin Animation & Collision (No changes here)
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
    
    // Update camera to follow player (No changes here)
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    
    renderer.render(scene, camera);
}

// Handle window resizing (No changes here)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game loop
animate();

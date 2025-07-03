import * as THREE from 'three';

// 1. SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows

// 2. LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// 3. GAME OBJECTS
// Floor
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 }); // Forest green
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2; // Rotate it to be flat
floor.receiveShadow = true;
scene.add(floor);

// Player
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500 }); // Orange-red
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 0.5;
player.castShadow = true;
scene.add(player);

// Coins
const coins = [];
const coinGeometry = new THREE.SphereGeometry(0.3, 16, 16);
const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 }); // Gold

for (let i = 0; i < 10; i++) {
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.position.set(
        (Math.random() - 0.5) * 25,
        0.5,
        (Math.random() - 0.5) * 25
    );
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

const keys = {
    w: false, a: false, s: false, d: false,
    ' ': false // Space for jump
};

window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Player Movement
    const moveDirection = new THREE.Vector3(0, 0, 0);
    if (keys.w || keys.arrowup) moveDirection.z -= 1;
    if (keys.s || keys.arrowdown) moveDirection.z += 1;
    if (keys.a || keys.arrowleft) moveDirection.x -= 1;
    if (keys.d || keys.arrowright) moveDirection.x += 1;
    moveDirection.normalize(); // Ensure consistent speed in all directions

    player.position.x += moveDirection.x * playerState.speed * deltaTime;
    player.position.z += moveDirection.z * playerState.speed * deltaTime;
    
    // Player Physics (Gravity & Jumping)
    playerState.velocity.y -= 9.8 * deltaTime; // Gravity
    player.position.y += playerState.velocity.y * deltaTime;

    // Check if on ground
    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        playerState.velocity.y = 0;
        playerState.onGround = true;
    }

    if (keys[' '] && playerState.onGround) {
        playerState.velocity.y = playerState.jumpStrength;
        playerState.onGround = false;
    }

    // Coin Animation & Collision
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.rotation.y += 2 * deltaTime; // Spin the coin

        // Check for collision with player
        if (player.position.distanceTo(coin.position) < 0.8) {
            scene.remove(coin); // Remove from scene
            coins.splice(i, 1); // Remove from array
            score++;
            scoreElement.innerText = `Score: ${score}`;

            // Win condition
            if (coins.length === 0) {
                scoreElement.innerText = `You Win! Final Score: ${score}`;
            }
        }
    }
    
    // Update camera to follow player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    
    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game loop
animate();

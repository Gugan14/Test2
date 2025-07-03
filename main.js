import * as THREE from 'three';

// 1. SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// 2. LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// 3. GAME OBJECTS
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff4500 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 0.5;
player.castShadow = true;
scene.add(player);

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
const clock = new THREE.Clock();

const playerState = {
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 5,
    jumpStrength: 7,
    onGround: true,
};

// Keyboard Controls
const keys = {
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowleft: false, arrowdown: false, arrowright: false,
    ' ': false
};
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

// Touch Controls
const joystickContainer = document.getElementById('joystick-container');
const joystickKnob = document.getElementById('joystick-knob');
const jumpButton = document.getElementById('jump-button');
const JOYSTICK_RADIUS = 60;

const joystickState = { active: false, touchId: null, center: { x: 0, y: 0 }, move: new THREE.Vector2(0, 0) };
const cameraState = { active: false, touchId: null, last: new THREE.Vector2(0, 0), orbit: new THREE.Vector2(0, Math.PI / 4), distance: 12, sensitivity: 0.005 };

function handleJump() {
    if (playerState.onGround) {
        playerState.velocity.y = playerState.jumpStrength;
        playerState.onGround = false;
    }
}
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleJump(); }, { passive: false });

function handleTouchStart(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
        if (touch.clientX < window.innerWidth / 2 && joystickState.touchId === null) {
            joystickState.touchId = touch.identifier;
            joystickState.active = true;
            joystickState.center.x = touch.clientX;
            joystickState.center.y = touch.clientY;
            joystickContainer.style.display = 'block';
            joystickContainer.style.left = `${touch.clientX - JOYSTICK_RADIUS}px`;
            joystickContainer.style.top = `${touch.clientY - JOYSTICK_RADIUS}px`;
        } else if (touch.clientX >= window.innerWidth / 2 && cameraState.touchId === null) {
            cameraState.touchId = touch.identifier;
            cameraState.active = true;
            cameraState.last.set(touch.clientX, touch.clientY);
        }
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
        if (touch.identifier === joystickState.touchId) {
            const deltaX = touch.clientX - joystickState.center.x;
            const deltaY = touch.clientY - joystickState.center.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);
            const knobX = Math.min(distance, JOYSTICK_RADIUS) * Math.cos(angle);
            const knobY = Math.min(distance, JOYSTICK_RADIUS) * Math.sin(angle);
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
            joystickState.move.x = deltaX / JOYSTICK_RADIUS;
            joystickState.move.y = deltaY / JOYSTICK_RADIUS;
            joystickState.move.clampLength(0, 1);
        } else if (touch.identifier === cameraState.touchId) {
            const deltaX = touch.clientX - cameraState.last.x;
            const deltaY = touch.clientY - cameraState.last.y;
            cameraState.orbit.x -= deltaX * cameraState.sensitivity;
            cameraState.orbit.y -= deltaY * cameraState.sensitivity;
            cameraState.orbit.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraState.orbit.y));
            cameraState.last.set(touch.clientX, touch.clientY);
        }
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
        if (touch.identifier === joystickState.touchId) {
            joystickState.active = false;
            joystickState.touchId = null;
            joystickContainer.style.display = 'none';
            joystickKnob.style.transform = `translate(0px, 0px)`;
            joystickState.move.set(0, 0);
        } else if (touch.identifier === cameraState.touchId) {
            cameraState.active = false;
            cameraState.touchId = null;
        }
    }
}
window.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', handleTouchEnd, { passive: false });
window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// 5. GAME LOOP
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    const moveInput = new THREE.Vector2();
    if (joystickState.active) {
        moveInput.set(joystickState.move.x, -joystickState.move.y);
    } else {
        if (keys.w || keys.arrowup) moveInput.y = 1;
        if (keys.s || keys.arrowdown) moveInput.y = -1;
        if (keys.a || keys.arrowleft) moveInput.x = -1;
        if (keys.d || keys.arrowright) moveInput.x = 1;
    }
    
    if (moveInput.lengthSq() > 0) {
        const moveDirection = new THREE.Vector3(moveInput.x, 0, moveInput.y);
        moveDirection.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraState.orbit.x);
        player.position.x += moveDirection.x * playerState.speed * deltaTime;
        player.position.z += moveDirection.z * playerState.speed * deltaTime;
        player.lookAt(player.position.x + moveDirection.x, player.position.y, player.position.z + moveDirection.z);
    }

    playerState.velocity.y -= 9.8 * deltaTime;
    player.position.y += playerState.velocity.y * deltaTime;
    if (player.position.y <= 0.5) {
        player.position.y = 0.5;
        playerState.velocity.y = 0;
        playerState.onGround = true;
    }
    if (keys[' ']) { handleJump(); keys[' '] = false; }

    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.rotation.y += 2 * deltaTime;
        if (player.position.distanceTo(coin.position) < 0.8) {
            scene.remove(coin);
            coins.splice(i, 1);
            score++;
            scoreElement.innerText = `Score: ${score}`;
            if (coins.length === 0) { scoreElement.innerText = `You Win! Final Score: ${score}`; }
        }
    }
    
    const camOffset = new THREE.Vector3();
    camOffset.x = cameraState.distance * Math.sin(cameraState.orbit.x) * Math.cos(cameraState.orbit.y);
    camOffset.y = cameraState.distance * Math.sin(cameraState.orbit.y);
    camOffset.z = cameraState.distance * Math.cos(cameraState.orbit.x) * Math.cos(cameraState.orbit.y);
    camera.position.copy(player.position).add(camOffset);
    camera.lookAt(player.position);
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

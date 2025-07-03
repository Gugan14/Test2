import * as THREE from 'three';
// FIX #1: Import the addon using its full, direct URL. This is more reliable.
import { CapsuleGeometry } from 'https://unpkg.com/three@0.161.0/examples/jsm/geometries/CapsuleGeometry.js';

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
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x228b22 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

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
const playerState = { velocity: new THREE.Vector3(0, 0, 0), speed: 5, jumpStrength: 7, onGround: true };

function createCodedCharacter() {
    const playerGroup = new THREE.Group();
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.8 });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.5, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x0077ff })
    );
    body.position.y = 1.4 + 1.5 / 2;
    playerGroup.add(body);

    // FIX #2: Use 'new CapsuleGeometry', not 'new THREE.CapsuleGeometry'
    const head = new THREE.Mesh(new CapsuleGeometry(0.45, 0.3, 8, 16), skinMaterial);
    head.position.y = body.position.y + 1.5 / 2 + 0.3 / 2 + 0.45;
    playerGroup.add(head);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), skinMaterial);
    armL.position.set(-(1.2 / 2 + 0.45 / 2), body.position.y + 0.05, 0);
    playerGroup.add(armL);

    const armR = armL.clone();
    armR.position.x = 1.2 / 2 + 0.45 / 2;
    playerGroup.add(armR);

    const legL = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.4, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    legL.position.set(-(1.2 / 4), 1.4 / 2, 0);
    playerGroup.add(legL);

    const legR = legL.clone();
    legR.position.x = 1.2 / 4;
    playerGroup.add(legR);

    playerGroup.userData.limbs = { armL, armR, legL, legR };
    playerGroup.traverse(child => { if (child.isMesh) { child.castShadow = true; } });
    return playerGroup;
}

const player = createCodedCharacter();
player.position.y = -0.7;
scene.add(player);

const keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowleft: false, arrowdown: false, arrowright: false, ' ': false };
window.addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
const joystickContainer = document.getElementById('joystick-container');
const joystickKnob = document.getElementById('joystick-knob');
const jumpButton = document.getElementById('jump-button');
const JOYSTICK_RADIUS = 60;
const joystickState = { active: false, touchId: null, center: { x: 0, y: 0 }, move: new THREE.Vector2(0, 0) };
const cameraState = { active: false, touchId: null, last: new THREE.Vector2(0, 0), orbit: new THREE.Vector2(0, Math.PI / 4), distance: 12, sensitivity: 0.005 };
function handleJump() { if (playerState.onGround) { playerState.velocity.y = playerState.jumpStrength; playerState.onGround = false; } }
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleJump(); }, { passive: false });
function handleTouchStart(e) { e.preventDefault(); for (const t of e.changedTouches) { if (t.clientX < window.innerWidth / 2 && joystickState.touchId === null) { joystickState.touchId = t.identifier; joystickState.active = true; joystickState.center.x = t.clientX; joystickState.center.y = t.clientY; joystickContainer.style.display = 'block'; joystickContainer.style.left = `${t.clientX - JOYSTICK_RADIUS}px`; joystickContainer.style.top = `${t.clientY - JOYSTICK_RADIUS}px`; } else if (t.clientX >= window.innerWidth / 2 && cameraState.touchId === null) { cameraState.touchId = t.identifier; cameraState.active = true; cameraState.last.set(t.clientX, t.clientY); } } }
function handleTouchMove(e) { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joystickState.touchId) { const dX = t.clientX - joystickState.center.x; const dY = t.clientY - joystickState.center.y; const dist = Math.sqrt(dX * dX + dY * dY); const angle = Math.atan2(dY, dX); const kX = Math.min(dist, JOYSTICK_RADIUS) * Math.cos(angle); const kY = Math.min(dist, JOYSTICK_RADIUS) * Math.sin(angle); joystickKnob.style.transform = `translate(${kX}px, ${kY}px)`; joystickState.move.x = dX / JOYSTICK_RADIUS; joystickState.move.y = dY / JOYSTICK_RADIUS; joystickState.move.clampLength(0, 1); } else if (t.identifier === cameraState.touchId) { const dX = t.clientX - cameraState.last.x; const dY = t.clientY - cameraState.last.y; cameraState.orbit.x -= dX * cameraState.sensitivity; cameraState.orbit.y -= dY * cameraState.sensitivity; cameraState.orbit.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraState.orbit.y)); cameraState.last.set(t.clientX, t.clientY); } } }
function handleTouchEnd(e) { e.preventDefault(); for (const t of e.changedTouches) { if (t.identifier === joystickState.touchId) { joystickState.active = false; joystickState.touchId = null; joystickContainer.style.display = 'none'; joystickKnob.style.transform = `translate(0px, 0px)`; joystickState.move.set(0, 0); } else if (t.identifier === cameraState.touchId) { cameraState.active = false; cameraState.touchId = null; } } }
window.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', handleTouchMove, { passive: false });
window.addEventListener('touchend', handleTouchEnd, { passive: false });
window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    const moveInput = new THREE.Vector2();
    if (joystickState.active) { moveInput.set(joystickState.move.x, joystickState.move.y); } else { let y = 0; if (keys.w || keys.arrowup) y = 1; if (keys.s || keys.arrowdown) y = -1; let x = 0; if (keys.a || keys.arrowleft) x = -1; if (keys.d || keys.arrowright) x = 1; moveInput.set(x, y); }
    const isMoving = moveInput.lengthSq() > 0;
    if (isMoving) { const swingAngle = Math.sin(elapsedTime * 10) * 0.5; player.userData.limbs.armL.rotation.x = swingAngle; player.userData.limbs.armR.rotation.x = -swingAngle; player.userData.limbs.legL.rotation.x = -swingAngle; player.userData.limbs.legR.rotation.x = swingAngle; } else { player.userData.limbs.armL.rotation.x = 0; player.userData.limbs.armR.rotation.x = 0; player.userData.limbs.legL.rotation.x = 0; player.userData.limbs.legR.rotation.x = 0; }
    if (isMoving) { const isKeyboard = !joystickState.active; const forwardDirection = isKeyboard ? moveInput.y : -moveInput.y; const moveDirection = new THREE.Vector3(moveInput.x, 0, -forwardDirection); moveDirection.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraState.orbit.x); player.position.x += moveDirection.x * playerState.speed * deltaTime; player.position.z += moveDirection.z * playerState.speed * deltaTime; player.lookAt(player.position.x + moveDirection.x, player.position.y, player.position.z + moveDirection.z); }
    const groundLevel = -0.7; playerState.velocity.y -= 9.8 * deltaTime; player.position.y += playerState.velocity.y * deltaTime;
    if (player.position.y <= groundLevel) { player.position.y = groundLevel; playerState.velocity.y = 0; playerState.onGround = true; }
    if (keys[' ']) { handleJump(); keys[' '] = false; }
    for (let i = coins.length - 1; i >= 0; i--) { const coin = coins[i]; coin.rotation.y += 2 * deltaTime; if (player.position.distanceTo(coin.position) < 1.5) { scene.remove(coin); coins.splice(i, 1); score++; scoreElement.innerText = `Score: ${score}`; if (coins.length === 0) { scoreElement.innerText = `You Win! Final Score: ${score}`; } } }
    const camOffset = new THREE.Vector3(); camOffset.x = cameraState.distance * Math.sin(cameraState.orbit.x) * Math.cos(cameraState.orbit.y); camOffset.y = cameraState.distance * Math.sin(cameraState.orbit.y); camOffset.z = cameraState.distance * Math.cos(cameraState.orbit.x) * Math.cos(cameraState.orbit.y); camera.position.copy(player.position).add(camOffset); camera.lookAt(player.position);
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

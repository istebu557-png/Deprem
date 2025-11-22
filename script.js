// Matter.js module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint,
    Events = Matter.Events,
    Body = Matter.Body,
    Vector = Matter.Vector;

// State
const state = {
    mode: 'beam', // beam, column, joint, delete
    isSimulating: false,
    selectedMaterial: 'concrete',
    mouseStart: null,
    tempBody: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'side' // side, top
};

// Material Properties (Simplified)
const MATERIALS = {
    concrete: { density: 2.4, friction: 0.5, color: '#95a5a6', strength: 1000 },
    steel: { density: 7.8, friction: 0.3, color: '#34495e', strength: 3000 },
    wood: { density: 0.6, friction: 0.7, color: '#d35400', strength: 500 }
};

// Initialize Matter Engine
const engine = Engine.create();
const world = engine.world;

// Setup Render
const container = document.getElementById('canvas-container');
const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: container.clientWidth,
        height: container.clientHeight,
        background: '#e0e0e0',
        wireframes: false, // Show solid shapes
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false
    }
});

// Ground
const ground = Bodies.rectangle(
    container.clientWidth / 2,
    container.clientHeight - 20,
    container.clientWidth * 2,
    40,
    {
        isStatic: true,
        render: {
            fillStyle: '#2c3e50',
            // Add a pattern/texture effect via custom render logic if needed, or just let it be.
            // We will rely on objects moving relative to background for now,
            // but let's make it striped to see movement better.
            sprite: {
                texture: '' // We'll stick to fillStyle for simplicity but maybe update it in loop
            }
        },
        label: 'ground'
    }
);

// Custom ground rendering to show shaking
Events.on(render, 'afterRender', function() {
    const context = render.context;
    const body = ground;
    const pos = body.position;
    const width = 2000; // Approximate large width
    const height = 40;

    context.save();
    context.translate(pos.x, pos.y);
    context.rotate(body.angle);

    // Draw stripes on ground
    context.fillStyle = '#34495e';
    for(let i = -width/2; i < width/2; i+=50) {
        context.fillRect(i, -height/2, 20, height);
    }

    context.restore();
});

Composite.add(world, ground);

// Mouse Interaction for Camera/Dragging (restricted when editing)
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
mouseConstraint.collisionFilter.mask = 0;

Composite.add(world, mouseConstraint);
render.mouse = mouse;

// Grid Rendering
const GRID_SIZE = 40; // 10cm equivalent (approx 40px for visualization)

Events.on(render, 'beforeRender', function() {
    const context = render.context;
    const width = render.canvas.width;
    const height = render.canvas.height;

    context.beginPath();
    context.strokeStyle = '#ccc';
    context.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x < width; x += GRID_SIZE) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y < height; y += GRID_SIZE) {
        context.moveTo(0, y);
        context.lineTo(width, y);
    }

    context.stroke();
});

// Start Engine
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// UI Event Listeners
document.getElementById('btn-beam').addEventListener('click', () => setMode('beam'));
document.getElementById('btn-column').addEventListener('click', () => setMode('column'));
document.getElementById('btn-joint').addEventListener('click', () => setMode('joint'));
document.getElementById('btn-delete').addEventListener('click', () => setMode('delete'));
document.getElementById('material-type').addEventListener('change', (e) => state.selectedMaterial = e.target.value);
document.getElementById('btn-start').addEventListener('click', startSimulation);
document.getElementById('btn-reset').addEventListener('click', resetSimulation);
document.getElementById('btn-view-mode').addEventListener('click', toggleViewMode);

function toggleViewMode() {
    if (state.viewMode === 'side') {
        state.viewMode = 'top';
        document.getElementById('btn-view-mode').textContent = 'Görünüm: Kuş Bakışı';
        engine.gravity.y = 0; // No gravity in top view
        // In top view, maybe we hide the ground or make it look like a floor?
        ground.render.visible = false;
    } else {
        state.viewMode = 'side';
        document.getElementById('btn-view-mode').textContent = 'Görünüm: Yandan';
        // Gravity is only enabled during simulation in side view
        if (state.isSimulating) {
            engine.gravity.y = 1;
        }
        ground.render.visible = true;
    }
}

// Sliders
['magnitude', 'depth', 'duration'].forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(id === 'magnitude' ? 'mag-val' : id === 'depth' ? 'depth-val' : 'dur-val');
    el.addEventListener('input', (e) => disp.textContent = e.target.value);
});

function setMode(mode) {
    if (state.isSimulating) return;
    state.mode = mode;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
    updateStatus(`Mod: ${mode === 'beam' ? 'Kiriş' : mode === 'column' ? 'Kolon' : mode === 'joint' ? 'Bağlantı' : 'Silme'}`);
}

function updateStatus(msg) {
    document.getElementById('status').textContent = msg;
}

// Building Logic
let startPoint = null;
let currentPoint = null;

Events.on(render, 'afterRender', function() {
    if (startPoint && currentPoint && !state.isSimulating) {
        const context = render.context;
        context.beginPath();
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(currentPoint.x, currentPoint.y);
        context.lineWidth = 2;
        context.strokeStyle = '#000';
        context.setLineDash([5, 5]); // Dashed line
        context.stroke();
        context.setLineDash([]); // Reset dash
    }
});

function handleInputStart(x, y) {
    if (state.isSimulating) return;

    if (state.mode === 'delete') {
        handleDelete(x, y);
    } else if (state.mode === 'joint') {
        createJoint(x, y);
    } else {
        startPoint = { x, y };
    }
}

function handleInputMove(x, y) {
    if (state.isSimulating || !startPoint) return;
    currentPoint = { x, y };
}

function handleInputEnd(x, y) {
    if (state.isSimulating || !startPoint) return;

    if (state.mode === 'beam' || state.mode === 'column') {
        createStructuralElement(startPoint.x, startPoint.y, x, y, state.mode);
    }

    startPoint = null;
    currentPoint = null;
}

render.canvas.addEventListener('mousedown', (e) => {
    const rect = render.canvas.getBoundingClientRect();
    handleInputStart(e.clientX - rect.left, e.clientY - rect.top);
});

render.canvas.addEventListener('mousemove', (e) => {
    const rect = render.canvas.getBoundingClientRect();
    handleInputMove(e.clientX - rect.left, e.clientY - rect.top);
});

render.canvas.addEventListener('mouseup', (e) => {
    const rect = render.canvas.getBoundingClientRect();
    handleInputEnd(e.clientX - rect.left, e.clientY - rect.top);
});

// Touch support
render.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = render.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    handleInputStart(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

render.canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = render.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    handleInputMove(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

render.canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    // For touchend, we might not have a touch object if all fingers lifted.
    // We should use the last known position or the changedTouches.
    const rect = render.canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    handleInputEnd(touch.clientX - rect.left, touch.clientY - rect.top);
}, { passive: false });

function createStructuralElement(x1, y1, x2, y2, type) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 20) return; // Too small

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    const thickness = type === 'column' ? 20 : 10;
    const material = MATERIALS[state.selectedMaterial];

    const body = Bodies.rectangle(cx, cy, length, thickness, {
        angle: angle,
        density: material.density,
        friction: material.friction,
        render: { fillStyle: material.color },
        label: type,
        frictionAir: 0.05
    });

    // Add custom property for strength
    body.strength = material.strength;

    // Collision filter: beams don't collide with beams immediately?
    // Default is fine for now.

    Composite.add(world, body);

    // Try to connect to existing bodies at endpoints
    connectEndpoint(body, x1, y1);
    connectEndpoint(body, x2, y2);
}

function connectEndpoint(newBody, x, y) {
    const allBodies = Composite.allBodies(world);
    const range = 15;

    // Find bodies close to (x, y)
    // We want to connect newBody's specific point (local offset) to the other body's specific point

    // Calculate local offset for newBody
    const localX = (x - newBody.position.x) * Math.cos(-newBody.angle) - (y - newBody.position.y) * Math.sin(-newBody.angle);
    const localY = (x - newBody.position.x) * Math.sin(-newBody.angle) + (y - newBody.position.y) * Math.cos(-newBody.angle);

    allBodies.forEach(otherBody => {
        if (otherBody === newBody) return;

        // Check if (x,y) is close to otherBody
        // Using Bounds or vertices check is expensive, let's check vertices or just center + size approximation
        // Or just use distance to center if small, but beams are long.
        // Better: check distance to otherBody's closest point.

        const hit = Matter.Query.point([otherBody], { x, y });

        // Also check distance to endpoints of otherBody if it is a beam/column
        // But simplify: if point is inside otherBody
        if (hit.length > 0 || isCloseToBody(otherBody, x, y, range)) {

            // Calculate local offset for otherBody
            const otherLocalX = (x - otherBody.position.x) * Math.cos(-otherBody.angle) - (y - otherBody.position.y) * Math.sin(-otherBody.angle);
            const otherLocalY = (x - otherBody.position.x) * Math.sin(-otherBody.angle) + (y - otherBody.position.y) * Math.cos(-otherBody.angle);

             const constraint = Constraint.create({
                bodyA: newBody,
                bodyB: otherBody,
                pointA: { x: localX, y: localY },
                pointB: { x: otherLocalX, y: otherLocalY },
                stiffness: 0.9,
                length: 0,
                damping: 0.1,
                render: {
                    visible: true,
                    lineWidth: 3,
                    strokeStyle: '#333'
                }
            });
            Composite.add(world, constraint);
        }
    });
}

function isCloseToBody(body, x, y, range) {
    // Simple AABB check first
    if (x < body.bounds.min.x - range || x > body.bounds.max.x + range ||
        y < body.bounds.min.y - range || y > body.bounds.max.y + range) {
        return false;
    }
    return true; // Good enough for MVP "close" check
}


function createJoint(x, y) {
    // Manual joint creation if auto-connect failed or user wants specific joint
    const bodies = Query(x, y);
    if (bodies.length < 2) return;

    const jointBody = Bodies.circle(x, y, 5, {
        isStatic: false,
        render: { fillStyle: '#000' },
        label: 'joint'
    });
    Composite.add(world, jointBody);

    bodies.forEach(body => {
        if (body.label !== 'ground') {
             const constraint = Constraint.create({
                bodyA: jointBody,
                bodyB: body,
                pointA: { x: 0, y: 0 },
                pointB: { x: x - body.position.x, y: y - body.position.y },
                stiffness: 0.9,
                length: 0,
                render: { visible: true, lineWidth: 2, strokeStyle: '#000' }
            });
            Composite.add(world, constraint);
        }
    });
}

function handleDelete(x, y) {
    const bodies = Query(x, y);
    bodies.forEach(body => {
        if (body.label !== 'ground') {
            Composite.remove(world, body);
            const constraints = Composite.allConstraints(world).filter(c => c.bodyA === body || c.bodyB === body);
            constraints.forEach(c => Composite.remove(world, c));
        }
    });
}

function Query(x, y) {
    return Matter.Query.point(Composite.allBodies(world), { x, y });
}

// Simulation Logic
function startSimulation() {
    if (state.isSimulating) return;
    state.isSimulating = true;
    earthquakeTimer = 0;
    updateStatus("Simülasyon Başladı: Deprem Uygulanıyor...");
}

function resetSimulation() {
    state.isSimulating = false;
    updateStatus("Düzenleme Modu");
    engine.gravity.y = 0;

    Composite.clear(world, false, true);
    if (!world.bodies.includes(ground)) Composite.add(world, ground);
}


// Gravity control
engine.gravity.y = 0;

// Earthquake Logic
let earthquakeTimer = 0;
Events.on(engine, 'beforeUpdate', (event) => {
    if (!state.isSimulating) {
        engine.gravity.y = 0;
        Composite.allBodies(world).forEach(body => {
            if (body.isStatic) return;
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
        });
        return;
    }

    if (state.viewMode === 'side') {
        engine.gravity.y = 1;
    } else {
        engine.gravity.y = 0; // Top view has no vertical gravity
    }

    const magnitude = parseFloat(document.getElementById('magnitude').value);
    const depth = parseFloat(document.getElementById('depth').value);
    const duration = parseFloat(document.getElementById('duration').value) * 1000;

    earthquakeTimer += event.delta;

    if (earthquakeTimer < duration) {
        // Improved Earthquake Logic
        // Magnitude affects Amplitude (Displacement)
        // Depth affects Frequency (Deeper = Less shaking surface, but different wave properties)
        // Actually, Depth usually attenuates signal.

        // Intensity scale:
        const intensity = Math.pow(10, magnitude/2) * 0.0001 / (Math.sqrt(depth) * 0.1);

        // Random vibration + Sinusoidal wave
        const wave = Math.sin(earthquakeTimer * 0.02) * intensity;
        const noise = (Math.random() - 0.5) * intensity * 0.5;

        // Shake ground
        Body.translate(ground, { x: wave + noise, y: 0 });

        // Shake everything else relative to inertia
        // We can apply forces to all dynamic bodies
        const allBodies = Composite.allBodies(world);
        allBodies.forEach(body => {
            if (body.isStatic) return;

            // Force proportional to mass (F = ma) simulating ground acceleration
            // Direction is mostly horizontal
            Body.applyForce(body, body.position, {
                x: (wave + noise) * body.mass * 0.1,
                y: (Math.random() - 0.5) * intensity * body.mass * 0.05 // Vertical component
            });
        });
    }

    // Stress & Breaking Logic
    const constraints = Composite.allConstraints(world);
    constraints.forEach(c => {
        if (c.label === 'Mouse Constraint') return;

        const pA = c.bodyA ? Vector.add(c.bodyA.position, c.pointA) : c.pointA;
        const pB = c.bodyB ? Vector.add(c.bodyB.position, c.pointB) : c.pointB;
        const force = Vector.magnitude(Vector.sub(pA, pB)); // stretch distance as proxy for force/stress

        // Use material strength from connected bodies
        let strength = 20; // default
        if (c.bodyA && c.bodyA.strength) strength = c.bodyA.strength / 50;
        if (c.bodyB && c.bodyB.strength) strength = Math.min(strength, c.bodyB.strength / 50);

        // Visual stress indicator
        if (force > strength * 0.5) {
            c.render.strokeStyle = '#ff0000';
        } else {
            c.render.strokeStyle = '#333';
        }

        // Break
        if (force > strength) {
             Composite.remove(world, c);
             // Optional: Visual effect (particle?)
        }
    });
});

// Resize handler
window.addEventListener('resize', () => {
    render.canvas.width = container.clientWidth;
    render.canvas.height = container.clientHeight;
    Body.setPosition(ground, {
        x: container.clientWidth / 2,
        y: container.clientHeight - 20
    });
});

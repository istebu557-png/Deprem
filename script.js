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
    selectedBody: null
};

// Material Properties (Simplified)
const MATERIALS = {
    concrete: { density: 2.4, friction: 0.5, color: '#95a5a6', strength: 2000, stiffness: 100000 },
    steel: { density: 7.8, friction: 0.3, color: '#34495e', strength: 5000, stiffness: 200000 },
    wood: { density: 0.6, friction: 0.7, color: '#d35400', strength: 800, stiffness: 20000 }
};

// Initialize Matter Engine
const engine = Engine.create({
    positionIterations: 10, // Increase for stability
    velocityIterations: 10
});
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
    context.strokeStyle = '#999'; // Darker grid
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
document.getElementById('btn-foundation').addEventListener('click', () => setMode('foundation'));
document.getElementById('btn-delete').addEventListener('click', () => setMode('delete'));
document.getElementById('material-type').addEventListener('change', (e) => state.selectedMaterial = e.target.value);
document.getElementById('element-thickness').addEventListener('input', (e) => document.getElementById('thick-val').textContent = e.target.value);
document.getElementById('element-length').addEventListener('input', (e) => document.getElementById('len-val').textContent = e.target.value);

document.getElementById('btn-start').addEventListener('click', startSimulation);
document.getElementById('btn-reset').addEventListener('click', resetSimulation);
document.getElementById('btn-edit').addEventListener('click', () => setMode('edit'));
document.getElementById('btn-rotate-cw').addEventListener('click', () => rotateSelected(Math.PI / 4));
document.getElementById('btn-rotate-ccw').addEventListener('click', () => rotateSelected(-Math.PI / 4));

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

    // Handle edit button separately or as a tool
    if (mode === 'edit') {
         document.getElementById('btn-edit').classList.add('active');
         document.getElementById('edit-controls').style.display = 'block';
         updateStatus("Düzenleme Modu: Parçaları seçin, sürükleyin veya döndürün.");

         // Enable mouse interaction for dragging
         mouseConstraint.collisionFilter.mask = 0xFFFFFFFF;
    } else {
         if (document.getElementById(`btn-${mode}`)) {
            document.getElementById(`btn-${mode}`).classList.add('active');
         }
         document.getElementById('btn-edit').classList.remove('active');
         document.getElementById('edit-controls').style.display = 'none';
         state.selectedBody = null; // Deselect
         updateStatus(`Mod: ${mode === 'beam' ? 'Kiriş' : mode === 'column' ? 'Kolon' : mode === 'foundation' ? 'Temel' : 'Silme'}`);

         // Disable mouse interaction to prevent accidental dragging while creating
         mouseConstraint.collisionFilter.mask = 0;
    }
}

function rotateSelected(angle) {
    if (state.mode === 'edit' && state.selectedBody) {
        Body.rotate(state.selectedBody, angle);
    }
}

function updateStatus(msg) {
    document.getElementById('status').textContent = msg;
}

// Building Logic
// With new logic, we don't need startPoint/drag for creation, only click.
// But we might need it for "Edit" mode dragging if we handle it manually?
// Actually MouseConstraint handles dragging.

Events.on(render, 'afterRender', function() {
    // Draw selection highlight
    if (state.mode === 'edit' && state.selectedBody) {
        const context = render.context;
        const body = state.selectedBody;
        context.beginPath();
        const vertices = body.vertices;
        context.moveTo(vertices[0].x, vertices[0].y);
        for (let j = 1; j < vertices.length; j += 1) {
            context.lineTo(vertices[j].x, vertices[j].y);
        }
        context.lineTo(vertices[0].x, vertices[0].y);
        context.lineWidth = 3;
        context.strokeStyle = '#00ff00'; // Green highlight
        context.stroke();
    }
});

function handleInputStart(x, y) {
    if (state.isSimulating) return;

    if (state.mode === 'delete') {
        handleDelete(x, y);
    } else if (state.mode === 'edit') {
        handleSelection(x, y);
    } else if (['beam', 'column', 'foundation'].includes(state.mode)) {
        // Create immediately at (x,y)
        createStructuralElementClick(x, y, state.mode);
    }
}

function handleInputMove(x, y) {
    // No specific move logic needed unless we want to show a preview ghost?
    // For now, just rely on Click.
}

function handleInputEnd(x, y) {
    // No specific end logic needed for click-to-create.
}

function handleSelection(x, y) {
    const bodies = Query(x, y);
    // Filter out ground if we don't want to edit it, or allow it.
    // Let's avoid selecting ground for now as it is huge.
    const found = bodies.find(b => b.label !== 'ground');

    if (found) {
        state.selectedBody = found;
        updateStatus(`Seçildi: ${found.label === 'beam' ? 'Kiriş' : found.label === 'column' ? 'Kolon' : 'Temel'}`);
    } else {
        state.selectedBody = null;
        updateStatus("Düzenleme Modu: Seçim temizlendi.");
    }
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

function createStructuralElementClick(x, y, type) {
    const length = parseInt(document.getElementById('element-length').value) || 200;
    const thickness = parseInt(document.getElementById('element-thickness').value) || 20;

    let angle = 0;
    if (type === 'column') angle = Math.PI / 2; // 90 degrees
    // Beam and Foundation default to 0

    const material = MATERIALS[state.selectedMaterial];
    const isStatic = (type === 'foundation');

    // Collision filter:
    // Category 0x0002 for structural elements.
    // Mask 0x0001 (default Category is 0x0001). Ground is default.
    // We want them to collide with Ground (0x0001) but NOT with each other (0x0002).
    // But wait, if they don't collide with each other, they can pass through.
    // That is what the user requested: "iç içe geçmeli".
    // Ground is usually category 1.
    // So we set category 2. Mask 1.

    const collisionFilter = {
        category: 0x0002,
        mask: 0x0001 // Only collide with category 1 (Ground)
    };

    // However, if we want them to connect, they rely on constraints, which is fine.
    // But if they don't collide, they might look weird if not connected?
    // User said "parçalar birbirine çarpınca iç içe geçmeli".

    const body = Bodies.rectangle(x, y, length, thickness, {
        angle: angle,
        density: material.density,
        friction: material.friction,
        render: { fillStyle: isStatic ? '#555' : material.color },
        label: type,
        frictionAir: 0.05,
        isStatic: isStatic,
        collisionFilter: collisionFilter
    });

    // Add custom property for strength and stiffness
    body.strength = isStatic ? 999999 : material.strength;
    body.stiffness = isStatic ? 999999 : material.stiffness;

    Composite.add(world, body);

    if (!isStatic) {
        // Connect to any intersecting bodies
        connectIntersections(body);
    }
}

function connectIntersections(newBody) {
    const allBodies = Composite.allBodies(world);

    allBodies.forEach(otherBody => {
        if (otherBody === newBody) return;
        if (otherBody.label === 'ground') return;

        // Use SAT to detect overlap
        const collision = Matter.SAT.collides(newBody, otherBody);

        if (collision.collided) {
            // Find approximate center of intersection
            // SAT returns supports (points of contact)
            // We can average them to find a good pivot point
            let px = 0, py = 0;
            if (collision.supports.length > 0) {
                collision.supports.forEach(p => {
                    px += p.x;
                    py += p.y;
                });
                px /= collision.supports.length;
                py /= collision.supports.length;
            } else {
                // Fallback to midpoint of bodies if supports missing (rare)
                px = (newBody.position.x + otherBody.position.x) / 2;
                py = (newBody.position.y + otherBody.position.y) / 2;
            }

            // Calculate local offsets
            const localA = Vector.rotate(Vector.sub({x: px, y: py}, newBody.position), -newBody.angle);
            const localB = Vector.rotate(Vector.sub({x: px, y: py}, otherBody.position), -otherBody.angle);

            // Initial relative angle for stiffness
            const initialAngleDiff = newBody.angle - otherBody.angle;

            // Determine joint stiffness and strength based on connected bodies
            // Use the weaker material property to define the joint's limits
            let jointStiffness = newBody.stiffness || 50000;
            if (otherBody.stiffness && otherBody.stiffness < jointStiffness) {
                jointStiffness = otherBody.stiffness;
            }

            // Create pivot constraint
            const constraint = Constraint.create({
                bodyA: newBody,
                bodyB: otherBody,
                pointA: localA,
                pointB: localB,
                stiffness: 1, // High stiffness for positional anchor
                length: 0,
                render: {
                    visible: true,
                    lineWidth: 0, // Hide the line, we will draw a custom joint
                    strokeStyle: 'transparent',
                    anchors: false
                }
            });

            // Custom properties for bending physics
            constraint.isStructural = true;
            constraint.initialAngleDiff = initialAngleDiff;
            constraint.rotationalStiffness = jointStiffness;
            constraint.jointColor = '#333'; // Default joint color

            Composite.add(world, constraint);
        }
    });
}

// Custom renderer for joints
Events.on(render, 'afterRender', function() {
    const context = render.context;
    const constraints = Composite.allConstraints(world);

    context.beginPath();
    constraints.forEach(c => {
        if (c.isStructural && c.bodyA && c.bodyB) {
            // Calculate world position of the joint
            const p = Vector.add(c.bodyA.position, Vector.rotate(c.pointA, c.bodyA.angle));

            context.moveTo(p.x + 4, p.y);
            context.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        }
    });
    context.fillStyle = '#000';
    context.fill();

    // Draw stress indicators if needed (colored circle)
    constraints.forEach(c => {
        if (c.isStructural && c.render.strokeStyle === '#ff0000') {
             const p = Vector.add(c.bodyA.position, Vector.rotate(c.pointA, c.bodyA.angle));
             context.beginPath();
             context.arc(p.x, p.y, 6, 0, 2 * Math.PI);
             context.strokeStyle = '#ff0000';
             context.lineWidth = 2;
             context.stroke();
        }
    });
});


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
let savedState = null;

function startSimulation() {
    if (state.isSimulating) return;

    // Save current world state (bodies and constraints)
    // We can't easily clone Box2D/Matter bodies completely, but for this simple app
    // we can store their definitions or just accept we need to rebuild?
    // Rebuilding is safer but complex.
    // Alternative: Store initial positions/angles and restore them?
    // But bodies might break (constraints removed).
    // So we need to backup the entire world structure.

    saveWorldState();

    state.isSimulating = true;
    earthquakeTimer = 0;
    updateStatus("Simülasyon Başladı: Deprem Uygulanıyor...");
}

function resetSimulation() {
    state.isSimulating = false;
    updateStatus("Düzenleme Modu");

    // Stop earthquake gravity (reset to 0 for editing)
    engine.gravity.y = 0;

    // Restore logic:
    // If we have a saved state, we want to restore it.
    // But "Reset" usually means "Clear All" or "Stop & Restore"?
    // Standard behavior: Stop and go back to editor.
    // Let's make "Reset" function as "Stop & Restore".
    // If user wants to clear, they can select all and delete or we add a "Clear All" button.
    // For now, let's make this button "Stop / Restore".

    restoreWorldState();
}

function saveWorldState() {
    // Simple serialization of what matters: type, geometry, material, connections
    // We can iterate bodies and constraints.
    const bodies = Composite.allBodies(world).filter(b => b.label !== 'ground');
    const constraints = Composite.allConstraints(world).filter(c => c.label !== 'Mouse Constraint');

    savedState = {
        bodies: bodies.map(b => ({
            position: { x: b.position.x, y: b.position.y },
            angle: b.angle,
            velocity: { x: 0, y: 0 },
            angularVelocity: 0,
            id: b.id
        })),
        constraints: constraints.map(c => ({
            bodyAId: c.bodyA ? c.bodyA.id : null,
            bodyBId: c.bodyB ? c.bodyB.id : null,
            pointA: c.pointA,
            pointB: c.pointB,
            stiffness: c.stiffness,
            length: c.length,
            label: c.label
        }))
        // Note: this doesn't save "broken" constraints logic if we remove them during sim.
        // If we remove them, we can't just "restore" position. We need to recreate the constraint.
        // So "Restore" needs to fully reconstruct?
        // Or we just don't remove them, we disable them?
        // Removing is better for physics.

        // Better approach for "Save/Restore":
        // We don't save the physics bodies. We save the "Blueprint".
        // But we don't have a blueprint model, we just have physics bodies.

        // Strategy: Clone the world objects? No, Matter.js clone is tricky.
        // Strategy: Re-position and Re-add constraints?
        // If constraints were removed, we can't re-add them unless we saved their config.
        // YES, `savedState.constraints` has the config.
    };
}

function restoreWorldState() {
    if (!savedState) return;

    // 1. Reset positions/velocities of bodies
    const currentBodies = Composite.allBodies(world);

    // Issue: If we added bodies during sim? No, we don't.
    // We only remove constraints.

    savedState.bodies.forEach(savedData => {
        const body = currentBodies.find(b => b.id === savedData.id);
        if (body) {
            Body.setPosition(body, savedData.position);
            Body.setAngle(body, savedData.angle);
            Body.setVelocity(body, { x: 0, y: 0 });
            Body.setAngularVelocity(body, 0);
        }
    });

    // 2. Restore constraints
    // The simulation removes constraints when they break.
    // We need to add them back if they are missing.
    // Or simpler: Clear all constraints and re-create from savedState?
    // But we need references to bodies.

    // Let's remove all current constraints (except mouse) and rebuild from savedState
    const currentConstraints = Composite.allConstraints(world);
    currentConstraints.forEach(c => {
        if (c.label !== 'Mouse Constraint') Composite.remove(world, c);
    });

    savedState.constraints.forEach(savedC => {
        const bodyA = savedC.bodyAId ? currentBodies.find(b => b.id === savedC.bodyAId) : null;
        const bodyB = savedC.bodyBId ? currentBodies.find(b => b.id === savedC.bodyBId) : null;

        if ((savedC.bodyAId && !bodyA) || (savedC.bodyBId && !bodyB)) return; // Body missing?

        const newConstraint = Constraint.create({
            bodyA: bodyA,
            bodyB: bodyB,
            pointA: savedC.pointA,
            pointB: savedC.pointB,
            stiffness: savedC.stiffness,
            length: savedC.length,
            render: { visible: true, lineWidth: 3, strokeStyle: '#333' } // Default style
        });
        Composite.add(world, newConstraint);
    });
}


// Gravity control
engine.gravity.y = 0; // Initially 0 for editing

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

    // Always enable gravity during simulation (Side View behavior)
    engine.gravity.y = 1;

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

        // 1. Bending Physics (Rotational Stiffness)
        if (c.isStructural && c.bodyA && c.bodyB) {
            const angleDiff = c.bodyA.angle - c.bodyB.angle;
            const distortion = angleDiff - c.initialAngleDiff;

            // Apply restoring torque (Spring)
            // Use constraint-specific rotational stiffness derived from material
            const k = c.rotationalStiffness || 50000;
            const torque = -k * distortion * 0.001; // Scale down

            Body.setAngularVelocity(c.bodyA, c.bodyA.angularVelocity + torque / c.bodyA.inertia);
            Body.setAngularVelocity(c.bodyB, c.bodyB.angularVelocity - torque / c.bodyB.inertia);

            // Store torque load for breaking check
            c.torqueLoad = Math.abs(torque * 1000);
        }

        // 2. Force/Stretch Calculation
        const pA = c.bodyA ? Vector.add(c.bodyA.position, c.pointA) : c.pointA;
        const pB = c.bodyB ? Vector.add(c.bodyB.position, c.pointB) : c.pointB;
        const force = Vector.magnitude(Vector.sub(pA, pB)); // stretch distance

        // Determine Strength Limit
        let limit = 20; // base
        if (c.bodyA && c.bodyA.strength) limit = c.bodyA.strength / 50;
        if (c.bodyB && c.bodyB.strength) limit = Math.min(limit, c.bodyB.strength / 50);

        // Torque limit (bending strength) - approximated from material strength
        const torqueLimit = limit * 15;

        // Visual stress indicator
        const torqueStress = (c.torqueLoad || 0) / torqueLimit;
        const forceStress = force / limit;

        if (forceStress > 0.5 || torqueStress > 0.5) {
            c.render.strokeStyle = '#ff0000'; // Red warning
        } else {
            c.render.strokeStyle = '#000';
        }

        // Break if either tensile or bending limit exceeded
        if (forceStress > 1.0 || torqueStress > 1.0) {
             Composite.remove(world, c);
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

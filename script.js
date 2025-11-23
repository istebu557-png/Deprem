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
    selectedBody: null,
    dragBody: null,
    dragOffset: { x: 0, y: 0 }
};

const SNAP_VAL = 5; // 5px grid snap for finer alignment

// Material Properties (Simplified)
const MATERIALS = {
    concrete: { density: 2.4, friction: 0.5, color: '#95a5a6', strength: 2000, stiffness: 100000 },
    steel: { density: 7.8, friction: 0.3, color: '#34495e', strength: 5000, stiffness: 200000 },
    wood: { density: 0.6, friction: 0.7, color: '#d35400', strength: 800, stiffness: 20000 }
};

// Initialize Matter Engine
const engine = Engine.create({
    positionIterations: 20, // Increase for stability
    velocityIterations: 20
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
    container.clientHeight + 230, // Offset to keep the top surface at the same visual level
    container.clientWidth * 2,
    540, // Much thicker to prevent tunneling
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
    const height = 540;

    context.save();
    context.translate(pos.x, pos.y);
    context.rotate(body.angle);

    // Draw stripes on ground (only on the top part)
    context.fillStyle = '#34495e';
    for(let i = -width/2; i < width/2; i+=50) {
        context.fillRect(i, -height/2, 20, 40); // Draw visual surface
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
document.getElementById('btn-reconnect').addEventListener('click', rebuildConnections);

// Sliders
['magnitude', 'depth', 'duration'].forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(id === 'magnitude' ? 'mag-val' : id === 'depth' ? 'depth-val' : 'dur-val');
    el.addEventListener('input', (e) => disp.textContent = e.target.value);
});

// Resizing logic for selected body
function updateSelectedBodyDimensions() {
    if (!state.selectedBody) return;
    const body = state.selectedBody;
    const length = parseInt(document.getElementById('element-length').value) || 200;
    const thickness = parseInt(document.getElementById('element-thickness').value) || 20;

    // We can't easily resize a body in Matter.js without issues.
    // Best way: Create a new body with same properties and replace it?
    // Or scale it? Scale is accumulative.
    // Or setVertices.
    // Rectangle vertices are simple.
    // We need to keep the angle.
    // Local vertices for a rectangle:
    // width=length, height=thickness (assuming Horizontal creation default).
    // If it was created as Column, it was rotated 90deg.
    // But we are setting 'length' and 'thickness'.
    // If it is rotated, what is length?
    // Let's assume 'length' is always the long dimension along the body's local x-axis (before rotation).
    // If we use Body.setVertices, we define vertices relative to center? No, Body.setVertices takes world points.
    // Easier: Matter.Bodies.rectangle gives us vertices.
    // We create a dummy body to get vertices, then apply to real body.

    // Check if it's a column (rotated 90 initially) or beam.
    // Actually, we just treat Length as Width and Thickness as Height in local space.
    // Wait, if it's a column, we created it with angle 90. So its 'width' is length.
    // So consistent logic: Length = body.width (local), Thickness = body.height (local).

    const angle = body.angle;
    const position = body.position;

    // Generate new vertices for a rectangle at (0,0) with 0 rotation
    // then we will rotate and translate them?
    // Body.setVertices calculates properties from vertices.
    const dummy = Bodies.rectangle(position.x, position.y, length, thickness, { angle: angle });

    // Apply to existing body
    Body.setVertices(body, dummy.vertices);

    // Restore density/mass/inertia logic if needed (setVertices updates them based on area)
    // We want to keep material density.
    const material = MATERIALS[state.selectedMaterial] || MATERIALS['concrete']; // Fallback
    Body.setDensity(body, material.density);

    // Rebuild connections to update visuals immediately
    rebuildConnections();
}

document.getElementById('element-length').addEventListener('input', (e) => {
    document.getElementById('len-val').textContent = e.target.value;
    updateSelectedBodyDimensions();
});
document.getElementById('element-thickness').addEventListener('input', (e) => {
    document.getElementById('thick-val').textContent = e.target.value;
    updateSelectedBodyDimensions();
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

         // Disable MouseConstraint for dragging (we will use custom drag logic for snapping)
         // But we need it for 'mousedown' to identify bodies?
         // Actually, MouseConstraint handles 'mousedown' selection well.
         // But it also handles 'drag'.
         // If we set collisionFilter.mask = 0, it won't pick anything.
         // We want picking but NO dragging.
         // Unfortunately, MouseConstraint binds them together.
         // Solution: Set mask to 0, use our own Query for picking and dragging.
         mouseConstraint.collisionFilter.mask = 0;
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
        rebuildConnections(); // Update connections after rotation
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
        handleSelectionAndDragStart(x, y);
    } else if (['beam', 'column', 'foundation'].includes(state.mode)) {
        // Create immediately at (x,y)
        createStructuralElementClick(x, y, state.mode);
    }
}

function handleInputMove(x, y) {
    if (state.isSimulating) return;

    if (state.mode === 'edit' && state.dragBody) {
        // Calculate new position
        const targetX = x - state.dragOffset.x;
        const targetY = y - state.dragOffset.y;

        // Apply Snapping
        const snappedX = Math.round(targetX / SNAP_VAL) * SNAP_VAL;
        const snappedY = Math.round(targetY / SNAP_VAL) * SNAP_VAL;

        Body.setPosition(state.dragBody, { x: snappedX, y: snappedY });
        Body.setVelocity(state.dragBody, { x: 0, y: 0 }); // Stop momentum
    }
}

function handleInputEnd(x, y) {
    if (state.dragBody) {
        state.dragBody = null;
        rebuildConnections(); // Update connections after drag ends
    }
}

function handleSelectionAndDragStart(x, y) {
    const bodies = Query(x, y);
    // Allow selecting ground? Usually no.
    const found = bodies.find(b => b.label !== 'ground');

    if (found) {
        state.selectedBody = found;
        state.dragBody = found; // Start dragging
        state.dragOffset = {
            x: x - found.position.x,
            y: y - found.position.y
        };

        // Update UI sliders to match selected body (width/height)
        // Rectangle body dimensions are not directly stored as width/height properties in Matter.js Bodies
        // We have to estimate from bounds or area/density, but we stored them at creation? No.
        // We can approximate from vertices (assuming axis-aligned-ish or just checking bounds width/height)
        // Or better, let's look at bounds area.
        // Or simply calculate distance between vertices.
        // Let's use simple bounds for now (works if not rotated).
        // If rotated, it's harder.
        // Let's try to assume standard rectangle vertices order: 0-1 is width or height.
        const v = found.vertices;
        const sideA = Vector.magnitude(Vector.sub(v[0], v[1]));
        const sideB = Vector.magnitude(Vector.sub(v[1], v[2]));
        // Usually long side is length, short is thickness
        const len = Math.max(sideA, sideB);
        const thick = Math.min(sideA, sideB);

        document.getElementById('element-length').value = Math.round(len);
        document.getElementById('len-val').textContent = Math.round(len);
        document.getElementById('element-thickness').value = Math.round(thick);
        document.getElementById('thick-val').textContent = Math.round(thick);

        updateStatus(`Seçildi: ${found.label === 'beam' ? 'Kiriş' : found.label === 'column' ? 'Kolon' : 'Temel'}`);

        // Visual feedback for properties panel
        document.querySelector('.control-group:nth-child(2)').style.backgroundColor = '#e8f0fe';
    } else {
        state.selectedBody = null;
        updateStatus("Düzenleme Modu: Seçim temizlendi.");

        // Remove feedback
        document.querySelector('.control-group:nth-child(2)').style.backgroundColor = '';
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

    // Snap creation position
    const snappedX = Math.round(x / SNAP_VAL) * SNAP_VAL;
    const snappedY = Math.round(y / SNAP_VAL) * SNAP_VAL;

    const body = Bodies.rectangle(snappedX, snappedY, length, thickness, {
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

    // Update connections immediately for all bodies
    rebuildConnections();
}

// connectIntersections removed in favor of rebuildConnections

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
    let removed = false;
    bodies.forEach(body => {
        if (body.label !== 'ground') {
            Composite.remove(world, body);
            // Constraints are removed by rebuildConnections anyway, but good to be clean
            const constraints = Composite.allConstraints(world).filter(c => c.bodyA === body || c.bodyB === body);
            constraints.forEach(c => Composite.remove(world, c));
            removed = true;
        }
    });

    if (removed) {
        rebuildConnections();
    }
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

    // Enable collisions between all structural elements
    const bodies = Composite.allBodies(world);
    bodies.forEach(body => {
        if (body.label !== 'ground' && body.label !== 'Rectangle Body') { // Skip mouse constraint body if any
             // Allow collision with everything (default mask)
             body.collisionFilter.mask = 0xFFFFFFFF;
        }
    });

    // Enable mouse interaction during simulation
    mouseConstraint.collisionFilter.mask = 0xFFFFFFFF;

    // Recalculate connections based on current positions
    rebuildConnections();

    updateStatus("Simülasyon Başladı: Deprem Uygulanıyor...");
}

function rebuildConnections() {
    // Remove existing structural constraints to avoid duplicates or stretched bonds
    // We keep MouseConstraint and maybe 'Joint' bodies if they are manual?
    // User requested "calculate intersection points again".
    // So we assume current overlaps define the new structure.

    const constraints = Composite.allConstraints(world);
    constraints.forEach(c => {
        if (c.isStructural) {
            Composite.remove(world, c);
        }
    });

    // Find all structural bodies
    const bodies = Composite.allBodies(world).filter(b => b.label !== 'ground' && b.label !== 'Rectangle Body');

    // Check pairs for overlap
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const bodyA = bodies[i];
            const bodyB = bodies[j];

            // Check overlap
            const collision = Matter.SAT.collides(bodyA, bodyB);
            if (collision.collided) {
                createConnection(bodyA, bodyB, collision);
            }
        }
    }
}

function createConnection(newBody, otherBody, collision) {
    // Shared logic extracted from connectIntersections (simplified)
    // Find approximate center of intersection
    let px = 0, py = 0;
    if (collision && collision.supports && collision.supports.length > 0) {
        collision.supports.forEach(p => {
            px += p.x;
            py += p.y;
        });
        px /= collision.supports.length;
        py /= collision.supports.length;
    } else {
        px = (newBody.position.x + otherBody.position.x) / 2;
        py = (newBody.position.y + otherBody.position.y) / 2;
    }

    // Calculate local offsets
    const localA = Vector.rotate(Vector.sub({x: px, y: py}, newBody.position), -newBody.angle);
    const localB = Vector.rotate(Vector.sub({x: px, y: py}, otherBody.position), -otherBody.angle);

    // Initial relative angle for stiffness
    const initialAngleDiff = newBody.angle - otherBody.angle;

    // Determine joint stiffness
    let jointStiffness = newBody.stiffness || 50000;
    if (otherBody.stiffness && otherBody.stiffness < jointStiffness) {
        jointStiffness = otherBody.stiffness;
    }

    const constraint = Constraint.create({
        bodyA: newBody,
        bodyB: otherBody,
        pointA: localA,
        pointB: localB,
        stiffness: 1,
        length: 0,
        render: {
            visible: true,
            lineWidth: 0,
            strokeStyle: 'transparent',
            anchors: false
        }
    });

    constraint.isStructural = true;
    constraint.initialAngleDiff = initialAngleDiff;
    constraint.rotationalStiffness = jointStiffness;
    constraint.jointColor = '#333';

    Composite.add(world, constraint);
}

function resetSimulation() {
    state.isSimulating = false;
    updateStatus("Düzenleme Modu");

    // Stop earthquake gravity (reset to 0 for editing)
    engine.gravity.y = 0;

    // Restore collisions (Edit Mode: ignore each other, only collide with ground)
    // This will be handled by restoreWorldState actually, if we restore properly.
    // But since restoreWorldState restores from savedState, and savedState doesn't store collisionFilter deep props (it stores bodies),
    // Wait, savedState only stores position/angle. It finds body by ID.
    // The bodies persist in the world? No, restoreWorldState re-positions existing bodies.
    // So we need to manually revert collision filters here.

    const bodies = Composite.allBodies(world);
    bodies.forEach(body => {
        if (body.label !== 'ground') {
             // Reset to original mask: 0x0001 (Ground only)
             body.collisionFilter.mask = 0x0001;
        }
    });

    // Disable mouse interaction (Edit Mode uses custom drag)
    mouseConstraint.collisionFilter.mask = 0;

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
        y: container.clientHeight + 230
    });
});

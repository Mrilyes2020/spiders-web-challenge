// Disjoint Set Union (Union-Find) for Kruskal's Algorithm
class DSU {
    constructor(n) {
        this.parent = new Array(n + 1);
        this.rank = new Array(n + 1);
        for (let i = 0; i <= n; i++) {
            this.parent[i] = i;
            this.rank[i] = 0;
        }
    }
    
    find(i) {
        if (this.parent[i] === i) return i;
        this.parent[i] = this.find(this.parent[i]);
        return this.parent[i];
    }
    
    union(i, j) {
        let rootI = this.find(i);
        let rootJ = this.find(j);
        
        if (rootI !== rootJ) {
            if (this.rank[rootI] < this.rank[rootJ]) {
                this.parent[rootI] = rootJ;
            } else if (this.rank[rootI] > this.rank[rootJ]) {
                this.parent[rootJ] = rootI;
            } else {
                this.parent[rootJ] = rootI;
                this.rank[rootI]++;
            }
            return true;
        }
        return false;
    }
}

// Graph State
let nextEdgeId = 1;
const graph = {
    nodes: 13,
    edges: []
};

// Physics Simulation State
let physicsNodes = {};
for (let i = 1; i <= 13; i++) {
    physicsNodes[i] = { x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0 };
}

let searchedNode = null;
let clickedEdge = null;

// Required Functions
function addEdge(g, edge) {
    edge.id = nextEdgeId++;
    g.edges.push(edge);
    updateApp();
}

function removeEdge(g, edgeId) {
    g.edges = g.edges.filter(e => e.id !== edgeId);
    if (clickedEdge && clickedEdge.id === edgeId) {
        clickedEdge = null;
        document.getElementById('tooltip').style.opacity = 0;
    }
    updateApp();
}

function updateWeight(g, edgeId, newWeight) {
    let edge = g.edges.find(e => e.id === edgeId);
    if (edge) {
        edge.weight = newWeight;
        updateApp();
    }
}

function detectAnomaly(g) {
    let anomalies = [];
    
    // Create an adjacency list for triangle inequality check
    let adj = {};
    for (let i = 1; i <= g.nodes; i++) adj[i] = [];
    g.edges.forEach(e => {
        adj[e.from].push(e);
        adj[e.to].push(e);
    });

    g.edges.forEach(e => {
        let suspicion = 0;
        let reason = "";

        if (e.weight <= 0) {
            suspicion = 100;
            reason = "Weight ≤ 0 violates strict positivity.";
        } else if (e.weight > 20) {
            suspicion = 100;
            reason = "Weight exceeds natural network limits (>20).";
        } else if (e.from === e.to) {
            suspicion = 100;
            reason = "Self-loop is structurally invalid.";
        } else {
            // Triangle Inequality Check
            let minDetour = Infinity;
            let detourPath = null;
            
            // Find common neighbors between e.from and e.to
            let neighborsFrom = adj[e.from].filter(edge => edge.id !== e.id).map(edge => ({
                node: edge.from === e.from ? edge.to : edge.from,
                weight: edge.weight
            }));
            
            let neighborsTo = adj[e.to].filter(edge => edge.id !== e.id).map(edge => ({
                node: edge.from === e.to ? edge.to : edge.from,
                weight: edge.weight
            }));

            neighborsFrom.forEach(nf => {
                let nt = neighborsTo.find(n => n.node === nf.node);
                if (nt) {
                    let detourWeight = nf.weight + nt.weight;
                    if (detourWeight < minDetour) {
                        minDetour = detourWeight;
                        detourPath = nf.node;
                    }
                }
            });

            if (minDetour !== Infinity && e.weight > minDetour) {
                // Suspicion scales based on how much it exceeds the detour
                // If weight is exactly minDetour, suspicion is 50%. If weight is 2x minDetour, suspicion is 100%
                suspicion = Math.min(100, Math.round((e.weight / minDetour) * 50));
                reason = `Violates Triangle Inequality with node ${detourPath}. Detour weight: ${minDetour}.`;
            }
        }

        if (suspicion >= 80) {
            anomalies.push({ edge: e, reason, suspicion, isCursed: true });
        } else if (suspicion > 0) {
            anomalies.push({ edge: e, reason, suspicion, isCursed: false });
        }
    });
    return anomalies;
}

function computeMST(g) {
    let anomalies = detectAnomaly(g);
    let cursedEdgeIds = new Set(anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    
    let validEdges = g.edges.filter(e => !cursedEdgeIds.has(e.id));
    validEdges.sort((a, b) => a.weight - b.weight);
    
    let dsu = new DSU(g.nodes);
    let mstEdges = [];
    let totalWeight = 0;
    
    for (let edge of validEdges) {
        if (dsu.union(edge.from, edge.to)) {
            mstEdges.push(edge);
            totalWeight += edge.weight;
        }
    }
    
    return { edges: mstEdges, totalWeight, anomalies };
}

// Initial Data
addEdge(graph, { from: 1, to: 2, weight: 4 });
addEdge(graph, { from: 2, to: 3, weight: 7 });
addEdge(graph, { from: 3, to: 4, weight: 2 });
addEdge(graph, { from: 4, to: 5, weight: 9 });
addEdge(graph, { from: 1, to: 5, weight: 12 });
addEdge(graph, { from: 5, to: 6, weight: 5 });
addEdge(graph, { from: 6, to: 7, weight: 8 });
addEdge(graph, { from: 7, to: 8, weight: 1 });
addEdge(graph, { from: 2, to: 8, weight: 15 });
addEdge(graph, { from: 8, to: 9, weight: 6 });
addEdge(graph, { from: 9, to: 10, weight: 3 });
addEdge(graph, { from: 10, to: 11, weight: 11 });
addEdge(graph, { from: 11, to: 12, weight: 14 });
addEdge(graph, { from: 12, to: 13, weight: 10 });
// Cursed edges
addEdge(graph, { from: 13, to: 1, weight: -5 }); // Suspicion 100%
addEdge(graph, { from: 2, to: 4, weight: 19 }); // Suspicion ~105% (Detour via 3 is 9)


// UI & Physics Logic
const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

function resizeCanvas() {
    let container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    // Recenter nodes if canvas resized significantly
    for (let i = 1; i <= graph.nodes; i++) {
        if (!physicsNodes[i].initialized) {
            physicsNodes[i].x = canvas.width / 2 + (Math.random() * 100 - 50);
            physicsNodes[i].y = canvas.height / 2 + (Math.random() * 100 - 50);
            physicsNodes[i].initialized = true;
        }
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updatePhysics() {
    const k = Math.sqrt((canvas.width * canvas.height) / graph.nodes) * 0.8;
    const repulsion = 5000;
    const centerGravity = 0.02;
    const damping = 0.85;

    let forces = {};
    for (let i = 1; i <= graph.nodes; i++) forces[i] = { x: 0, y: 0 };

    // Repulsion
    for (let i = 1; i <= graph.nodes; i++) {
        for (let j = i + 1; j <= graph.nodes; j++) {
            let dx = physicsNodes[i].x - physicsNodes[j].x;
            let dy = physicsNodes[i].y - physicsNodes[j].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = repulsion / dist;
            forces[i].x += (dx / dist) * force;
            forces[i].y += (dy / dist) * force;
            forces[j].x -= (dx / dist) * force;
            forces[j].y -= (dy / dist) * force;
        }
    }

    // Attraction (Edges)
    graph.edges.forEach(edge => {
        let n1 = physicsNodes[edge.from];
        let n2 = physicsNodes[edge.to];
        let dx = n1.x - n2.x;
        let dy = n1.y - n2.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Edge weight influences ideal distance to some extent
        let idealDist = 100 + (edge.weight * 3);
        let force = (dist - idealDist) * 0.05;
        
        forces[edge.from].x -= (dx / dist) * force;
        forces[edge.from].y -= (dy / dist) * force;
        forces[edge.to].x += (dx / dist) * force;
        forces[edge.to].y += (dy / dist) * force;
    });

    // Center gravity & apply forces
    for (let i = 1; i <= graph.nodes; i++) {
        forces[i].x += (canvas.width / 2 - physicsNodes[i].x) * centerGravity;
        forces[i].y += (canvas.height / 2 - physicsNodes[i].y) * centerGravity;

        // Vibrate faintly (alive web)
        forces[i].x += (Math.random() - 0.5) * 2;
        forces[i].y += (Math.random() - 0.5) * 2;

        physicsNodes[i].vx = (physicsNodes[i].vx + forces[i].x) * damping;
        physicsNodes[i].vy = (physicsNodes[i].vy + forces[i].y) * damping;
        physicsNodes[i].x += physicsNodes[i].vx;
        physicsNodes[i].y += physicsNodes[i].vy;
        
        // Boundaries
        physicsNodes[i].x = Math.max(20, Math.min(canvas.width - 20, physicsNodes[i].x));
        physicsNodes[i].y = Math.max(20, Math.min(canvas.height - 20, physicsNodes[i].y));
    }
}

function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let mstResult = computeMST(graph);
    let mstEdgeIds = new Set(mstResult.edges.map(e => e.id));
    let cursedEdgeIds = new Set(mstResult.anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    
    // Draw edges
    graph.edges.forEach(edge => {
        let p1 = physicsNodes[edge.from];
        let p2 = physicsNodes[edge.to];
        
        let isSearched = searchedNode === null || 
                         edge.from === searchedNode || 
                         edge.to === searchedNode;
                         
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        
        ctx.lineWidth = 2;
        
        if (!isSearched) {
            ctx.strokeStyle = 'rgba(164, 176, 190, 0.05)';
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        } else if (cursedEdgeIds.has(edge.id)) {
            ctx.strokeStyle = 'rgba(255, 71, 87, 0.8)';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(255, 71, 87, 0.5)';
            ctx.shadowBlur = 10;
        } else if (mstEdgeIds.has(edge.id)) {
            ctx.strokeStyle = '#2ed573';
            ctx.shadowColor = '#2ed573';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
        } else {
            ctx.strokeStyle = 'rgba(164, 176, 190, 0.4)';
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        }
        
        if (clickedEdge && clickedEdge.id === edge.id) {
            ctx.strokeStyle = '#ffa502';
            ctx.shadowColor = '#ffa502';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 5;
            ctx.setLineDash([]);
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    
    // Draw nodes
    for (let i = 1; i <= graph.nodes; i++) {
        let pos = physicsNodes[i];
        let isSearchedNode = searchedNode === i;
        let isConnectedToSearch = searchedNode === null || isSearchedNode || 
            graph.edges.some(e => (e.from === searchedNode && e.to === i) || (e.to === searchedNode && e.from === i));
            
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSearchedNode ? 20 : 15, 0, Math.PI * 2);
        
        if (isConnectedToSearch) {
            ctx.fillStyle = isSearchedNode ? '#2ed573' : '#0b110e';
            ctx.strokeStyle = '#2ed573';
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = '#0b110e';
            ctx.strokeStyle = 'rgba(46, 213, 115, 0.2)';
            ctx.globalAlpha = 0.3;
        }
        
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = isSearchedNode ? '#000' : '#f1f2f6';
        ctx.font = 'bold 14px "Share Tech Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i, pos.x, pos.y);
        ctx.globalAlpha = 1;
    }
}

function animate() {
    updatePhysics();
    drawGraph();
    requestAnimationFrame(animate);
}
animate();

function updateApp() {
    let mstResult = computeMST(graph);
    
    // Update MST Status
    document.getElementById('mst-weight').textContent = mstResult.totalWeight;
    document.getElementById('mst-count').textContent = mstResult.edges.length;
    
    // Update Edge List
    let edgeListHtml = mstResult.edges.map(e => `<li>Edge ${e.from} ↔ ${e.to} (W: ${e.weight})</li>`).join('');
    document.getElementById('mst-edge-list').innerHTML = edgeListHtml || '<li>No edges in MST</li>';
    
    // Update Anomaly List (Real-time Report)
    let anomalyHtml = mstResult.anomalies.map(a => {
        let color = a.isCursed ? 'var(--danger-color)' : '#ffa502';
        let status = a.isCursed ? 'CURSED (Excluded)' : 'WARNING';
        return `<li style="color:${color}; margin-bottom:10px;">
            <strong>Edge ${a.edge.from}↔${a.edge.to}:</strong> 
            [Suspicion Level: ${a.suspicion}%] - ${status}<br>
            <span style="font-size:0.85em; opacity:0.8;">Reason: ${a.reason}</span>
        </li>`;
    }).join('');
    document.getElementById('anomaly-list').innerHTML = anomalyHtml || '<li style="color:var(--primary-color)">No cursed edges detected. The web is pure.</li>';
    
    // Update Edge Select Dropdown
    let select = document.getElementById('edge-select');
    select.innerHTML = '<option value="">Select Edge...</option>' + 
        graph.edges.map(e => `<option value="${e.id}">[${e.id}] ${e.from} ↔ ${e.to} (W: ${e.weight})</option>`).join('');
}

// UI Controls
document.getElementById('add-edge-form').addEventListener('submit', (e) => {
    e.preventDefault();
    let from = parseInt(document.getElementById('node-a').value);
    let to = parseInt(document.getElementById('node-b').value);
    let weight = parseFloat(document.getElementById('weight').value);
    
    if (from >= 1 && from <= 13 && to >= 1 && to <= 13 && from !== to) {
        addEdge(graph, { from, to, weight });
        e.target.reset();
    } else {
        alert("Invalid nodes. Must be between 1 and 13, and distinct.");
    }
});

document.getElementById('update-btn').addEventListener('click', () => {
    let edgeId = parseInt(document.getElementById('edge-select').value);
    let newWeight = parseFloat(document.getElementById('new-weight').value);
    if (!isNaN(edgeId) && !isNaN(newWeight)) {
        updateWeight(graph, edgeId, newWeight);
        document.getElementById('new-weight').value = '';
    }
});

document.getElementById('remove-btn').addEventListener('click', () => {
    let edgeId = parseInt(document.getElementById('edge-select').value);
    if (!isNaN(edgeId)) {
        removeEdge(graph, edgeId);
    }
});

// Search Node
document.getElementById('search-btn').addEventListener('click', () => {
    let val = document.getElementById('search-node').value;
    if (val === '') {
        searchedNode = null;
        document.getElementById('search-results').innerHTML = 'Network view reset.';
    } else {
        let node = parseInt(val);
        if (node >= 1 && node <= 13) {
            searchedNode = node;
            document.getElementById('search-results').innerHTML = `Focusing on Node ${node} and its connections.`;
        }
    }
});

// Click Interaction on Canvas
canvas.addEventListener('click', (e) => {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    
    let found = null;
    let minDist = 15; // click radius
    
    for (let edge of graph.edges) {
        let p1 = physicsNodes[edge.from];
        let p2 = physicsNodes[edge.to];
        
        let l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        let t = Math.max(0, Math.min(1, ((mouseX - p1.x) * (p2.x - p1.x) + (mouseY - p1.y) * (p2.y - p1.y)) / l2));
        let projX = p1.x + t * (p2.x - p1.x);
        let projY = p1.y + t * (p2.y - p1.y);
        let dist = Math.sqrt(Math.pow(mouseX - projX, 2) + Math.pow(mouseY - projY, 2));
        
        if (dist < minDist) {
            found = edge;
            minDist = dist;
        }
    }
    
    clickedEdge = found;
    
    if (found) {
        let mstResult = computeMST(graph);
        let anomaly = mstResult.anomalies.find(a => a.edge.id === found.id);
        
        let suspicionLevel = anomaly ? anomaly.suspicion : 0;
        let isCursed = anomaly ? anomaly.isCursed : false;
        let color = isCursed ? 'var(--danger-color)' : (suspicionLevel > 0 ? '#ffa502' : 'var(--primary-color)');
        let status = isCursed ? 'CURSED ⚠️' : 'CLEAN ✔️';

        tooltip.innerHTML = `
            <div style="border-bottom: 1px solid var(--border-color); margin-bottom: 5px; padding-bottom: 5px;">
                <strong>EDGE DETAILS</strong> (ID: ${found.id})
            </div>
            Nodes: <strong>${found.from} ↔ ${found.to}</strong><br>
            Weight: <strong>${found.weight}</strong><br>
            Suspicion Level: <strong style="color:${color}">${suspicionLevel}%</strong><br>
            Status: <strong style="color:${color}">${status}</strong>
            ${anomaly ? `<div style="margin-top:5px; font-size:0.8em; color:var(--text-muted)">Reason: ${anomaly.reason}</div>` : ''}
        `;
        
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY + 20) + 'px';
        tooltip.style.opacity = 1;
        tooltip.style.pointerEvents = 'auto'; // allow interaction if needed
    } else {
        tooltip.style.opacity = 0;
        tooltip.style.pointerEvents = 'none';
    }
});

updateApp();

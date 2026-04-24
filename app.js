// ==========================================
// GREED ISLAND: THE SPIDER'S WEB
// Advanced Network Intelligence System
// ==========================================

// --- Phantom Troupe Members ---
const TROUPE_MEMBERS = {
    1: "Chrollo Lucilfer", 2: "Feitan Portor", 3: "Machi Komacine",
    4: "Hisoka Morow", 5: "Phinks Magcub", 6: "Shalnark",
    7: "Franklin Bordeau", 8: "Shizuku Murasaki", 9: "Pakunoda",
    10: "Bonolenov Ndongo", 11: "Uvogin", 12: "Kortopi", 13: "Kalluto Zoldyck"
};

// --- Disjoint Set Union (DSU) ---
class DSU {
    constructor(n) {
        this.parent = new Array(n + 1).fill(0).map((_, i) => i);
        this.rank = new Array(n + 1).fill(0);
    }
    find(i) {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]);
    }
    union(i, j) {
        let rootI = this.find(i), rootJ = this.find(j);
        if (rootI !== rootJ) {
            if (this.rank[rootI] < this.rank[rootJ]) this.parent[rootI] = rootJ;
            else if (this.rank[rootI] > this.rank[rootJ]) this.parent[rootJ] = rootI;
            else { this.parent[rootJ] = rootI; this.rank[rootI]++; }
            return true;
        }
        return false;
    }
}

// ==========================================
// REQUIRED FUNCTIONS (STRICT SIGNATURES)
// ==========================================

let globalGraph = { edges: [], nextEdgeId: 1, nodesCount: 13, mstCache: null, lastHash: "" };

function addEdge(graph, edge) {
    edge.id = graph.nextEdgeId++;
    graph.edges.push(edge);
    logActivity(`Added edge ${edge.from}↔${edge.to} (W:${edge.weight})`, 'SYS');
    updateApp();
}

function removeEdge(graph, edgeId) {
    let idx = graph.edges.findIndex(e => e.id === edgeId);
    if (idx > -1) {
        let e = graph.edges[idx];
        graph.edges.splice(idx, 1);
        logActivity(`Removed edge ${e.from}↔${e.to}`, 'SYS');
        updateApp();
    }
}

function updateWeight(graph, edgeId, newWeight) {
    let e = graph.edges.find(x => x.id === edgeId);
    if (e) {
        e.weight = newWeight;
        logActivity(`Updated edge ${e.from}↔${e.to} to W:${newWeight}`, 'SYS');
        updateApp();
    }
}

function detectAnomaly(graph) {
    let anomalies = [];
    let adj = {};
    for (let i = 1; i <= graph.nodesCount; i++) adj[i] = [];
    graph.edges.forEach(e => { adj[e.from].push(e); adj[e.to].push(e); });

    graph.edges.forEach(e => {
        let suspicion = 0, reason = "";
        if (e.weight <= 0) { suspicion = 100; reason = "Weight ≤ 0 violates physical laws."; }
        else if (e.weight > 20) { suspicion = 100; reason = "Weight exceeds structural limit (>20)."; }
        else if (e.from === e.to) { suspicion = 100; reason = "Self-loop paradox detected."; }
        else {
            // Triangle Inequality Check
            let minDetour = Infinity, detourPath = null;
            let nFrom = adj[e.from].filter(x => x.id !== e.id).map(x => ({ n: x.from === e.from ? x.to : x.from, w: x.weight }));
            let nTo = adj[e.to].filter(x => x.id !== e.id).map(x => ({ n: x.from === e.to ? x.to : x.from, w: x.weight }));
            
            nFrom.forEach(nf => {
                let nt = nTo.find(n => n.n === nf.n);
                if (nt) { let w = nf.w + nt.w; if (w < minDetour) { minDetour = w; detourPath = nf.n; } }
            });

            if (minDetour !== Infinity && e.weight > minDetour) {
                suspicion = Math.min(100, Math.round((e.weight / minDetour) * 50));
                reason = `Triangle inequality violation via node ${detourPath} (Detour: ${minDetour}).`;
            }
        }
        if (suspicion > 0) anomalies.push({ edge: e, reason, suspicion, isCursed: suspicion >= 80 });
    });
    return anomalies;
}

function computeMST(graph) {
    // Optimization: Efficient caching (No full rebuild if avoidable)
    let currentHash = graph.edges.map(e => `${e.id}:${e.weight}`).join('|');
    if (graph.mstCache && graph.lastHash === currentHash) {
        return graph.mstCache; // Skip rebuild!
    }

    let anomalies = detectAnomaly(graph);
    let cursedIds = new Set(anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    let validEdges = graph.edges.filter(e => !cursedIds.has(e.id));
    
    let edges = [...validEdges].sort((a, b) => a.weight - b.weight);
    let dsu = new DSU(graph.nodesCount);
    let mstEdges = [], rejected = [], totalWeight = 0, components = graph.nodesCount;
    
    for (let e of edges) {
        if (dsu.union(e.from, e.to)) { mstEdges.push(e); totalWeight += e.weight; components--; }
        else { rejected.push(e); } 
    }
    
    graph.lastHash = currentHash;
    graph.mstCache = { edges: mstEdges, rejected, totalWeight, components, ordered: edges, anomalies };
    return graph.mstCache;
}

// ==========================================

let history = [], redoStack = [];
let config = { physicsEnabled: true, showLabels: true, showNames: true, animSpeed: 800 };

// --- Physics State ---
let physicsNodes = {};
for (let i = 1; i <= globalGraph.nodesCount; i++) {
    physicsNodes[i] = { x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0, dragged: false };
}
let searchedNode = null;
let hoveredEdge = null;
let animationMode = false;
let animationEdges = new Set();
let animationCycles = new Set();
let animationInterval = null;

// --- Pathfinding State ---
let pathTraceEdges = new Set();
let pathTraceNodes = new Set();

// --- DOM Elements ---
const canvas = document.getElementById('network-canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const logContainer = document.getElementById('activity-log');

// --- Initialization ---
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    populateSelects();
    
    // Default Edges using required function
    addEdge(globalGraph, {from: 1, to: 2, weight: 4}); addEdge(globalGraph, {from: 2, to: 3, weight: 7}); 
    addEdge(globalGraph, {from: 3, to: 4, weight: 2}); addEdge(globalGraph, {from: 4, to: 5, weight: 9});
    addEdge(globalGraph, {from: 1, to: 5, weight: 12}); addEdge(globalGraph, {from: 5, to: 6, weight: 5}); 
    addEdge(globalGraph, {from: 6, to: 7, weight: 8}); addEdge(globalGraph, {from: 7, to: 8, weight: 1});
    addEdge(globalGraph, {from: 2, to: 8, weight: 15}); addEdge(globalGraph, {from: 8, to: 9, weight: 6}); 
    addEdge(globalGraph, {from: 9, to: 10, weight: 3}); addEdge(globalGraph, {from: 10, to: 11, weight: 11});
    addEdge(globalGraph, {from: 11, to: 12, weight: 14}); addEdge(globalGraph, {from: 12, to: 13, weight: 10});
    // Cursed & Cycles for demo
    addEdge(globalGraph, {from: 13, to: 1, weight: -5}); addEdge(globalGraph, {from: 2, to: 4, weight: 19}); 
    addEdge(globalGraph, {from: 3, to: 8, weight: 18});
    
    clearHistory();
    setupEventListeners();
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    let rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

// --- Logging & History ---
function logActivity(msg, type="SYS") {
    let div = document.createElement('div');
    div.className = 'log-entry';
    let color = type === 'ERR' ? 'var(--danger)' : type === 'WRN' ? 'var(--warn)' : 'var(--text-dim)';
    let time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    div.innerHTML = `<span class="log-time" style="color:${color}">${time}</span> <span class="log-msg">${msg}</span>`;
    logContainer.prepend(div);
}

function saveState() {
    history.push(JSON.parse(JSON.stringify(globalGraph)));
    redoStack = [];
    updateUndoRedoBtns();
}
function clearHistory() { history = []; redoStack = []; updateUndoRedoBtns(); }
function undo() { if (history.length > 0) { redoStack.push(JSON.parse(JSON.stringify(globalGraph))); globalGraph = history.pop(); updateApp(); } }
function redo() { if (redoStack.length > 0) { history.push(JSON.parse(JSON.stringify(globalGraph))); globalGraph = redoStack.pop(); updateApp(); } }
function updateUndoRedoBtns() {
    document.getElementById('undo-btn').disabled = history.length === 0;
    document.getElementById('redo-btn').disabled = redoStack.length === 0;
}

// --- Benchmarking ---
function computeMST_Prim(g, validEdges) {
    if(validEdges.length === 0) return 0;
    let adj = {};
    for (let i = 1; i <= g.nodesCount; i++) adj[i] = [];
    validEdges.forEach(e => { adj[e.from].push(e); adj[e.to].push(e); });
    
    let visited = new Set([1]);
    let totalWeight = 0, edgesUsed = 0;
    
    while (edgesUsed < g.nodesCount - 1) {
        let minEdge = null;
        for (let u of visited) {
            for (let e of adj[u]) {
                let v = e.from === u ? e.to : e.from;
                if (!visited.has(v)) { if (!minEdge || e.weight < minEdge.weight) minEdge = e; }
            }
        }
        if (!minEdge) break;
        visited.add(minEdge.from); visited.add(minEdge.to);
        totalWeight += minEdge.weight;
        edgesUsed++;
    }
    return totalWeight;
}

function runBenchmarks(graph) {
    let anomalies = detectAnomaly(graph);
    let cursedIds = new Set(anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    let validEdges = graph.edges.filter(e => !cursedIds.has(e.id));

    let t0 = performance.now();
    for(let i=0; i<100; i++) { 
        let dsu = new DSU(graph.nodesCount);
        [...validEdges].sort((a,b)=>a.weight-b.weight).forEach(e => dsu.union(e.from, e.to)); 
    }
    let kruskalTime = (performance.now() - t0) / 100;

    t0 = performance.now();
    for(let i=0; i<100; i++) computeMST_Prim(graph, validEdges);
    let primTime = (performance.now() - t0) / 100;

    document.getElementById('bench-kruskal').textContent = kruskalTime.toFixed(4) + ' ms';
    document.getElementById('bench-prim').textContent = primTime.toFixed(4) + ' ms';
}

// --- Pathfinding (Spider's Reach) ---
function findSafePath(start, end) {
    let mstResult = computeMST(globalGraph);
    let adj = {};
    for (let i = 1; i <= globalGraph.nodesCount; i++) adj[i] = [];
    mstResult.edges.forEach(e => { adj[e.from].push(e); adj[e.to].push(e); });
    
    let queue = [{node: start, pathEdges: [], pathNodes: [start]}];
    let visited = new Set([start]);
    
    while(queue.length > 0) {
        let curr = queue.shift();
        if(curr.node === end) {
            pathTraceEdges = new Set(curr.pathEdges);
            pathTraceNodes = new Set(curr.pathNodes);
            logActivity(`Path traced from ${TROUPE_MEMBERS[start].split(' ')[0]} to ${TROUPE_MEMBERS[end].split(' ')[0]}`, 'SYS');
            return true;
        }
        for(let e of adj[curr.node]) {
            let next = e.from === curr.node ? e.to : e.from;
            if(!visited.has(next)) {
                visited.add(next);
                queue.push({
                    node: next, 
                    pathEdges: [...curr.pathEdges, e.id],
                    pathNodes: [...curr.pathNodes, next]
                });
            }
        }
    }
    logActivity(`No safe path found between ${start} and ${end}!`, 'ERR');
    pathTraceEdges.clear(); pathTraceNodes.clear();
    return false;
}

// --- Physics Engine ---
function applyPhysics() {
    if (!config.physicsEnabled) return;
    const repulsion = 4000, springStrength = 0.03, damping = 0.8;
    let forces = {};
    for(let i=1; i<=globalGraph.nodesCount; i++) forces[i] = {x:0, y:0};

    for (let i = 1; i <= globalGraph.nodesCount; i++) {
        for (let j = i + 1; j <= globalGraph.nodesCount; j++) {
            let dx = physicsNodes[i].x - physicsNodes[j].x, dy = physicsNodes[i].y - physicsNodes[j].y;
            let dist = Math.sqrt(dx*dx + dy*dy) || 1;
            let f = repulsion / dist;
            forces[i].x += (dx/dist)*f; forces[i].y += (dy/dist)*f;
            forces[j].x -= (dx/dist)*f; forces[j].y -= (dy/dist)*f;
        }
    }

    globalGraph.edges.forEach(e => {
        let n1 = physicsNodes[e.from], n2 = physicsNodes[e.to];
        let dx = n1.x - n2.x, dy = n1.y - n2.y;
        let dist = Math.sqrt(dx*dx + dy*dy) || 1;
        let ideal = 80 + (e.weight * 5);
        let f = (dist - ideal) * springStrength;
        forces[e.from].x -= (dx/dist)*f; forces[e.from].y -= (dy/dist)*f;
        forces[e.to].x += (dx/dist)*f; forces[e.to].y += (dy/dist)*f;
    });

    let cx = canvas.width/2, cy = canvas.height/2;
    for (let i = 1; i <= globalGraph.nodesCount; i++) {
        forces[i].x += (cx - physicsNodes[i].x) * 0.02;
        forces[i].y += (cy - physicsNodes[i].y) * 0.02;

        if (!physicsNodes[i].dragged) {
            physicsNodes[i].vx = (physicsNodes[i].vx + forces[i].x) * damping;
            physicsNodes[i].vy = (physicsNodes[i].vy + forces[i].y) * damping;
            physicsNodes[i].x += physicsNodes[i].vx;
            physicsNodes[i].y += physicsNodes[i].vy;
        }
        physicsNodes[i].x = Math.max(30, Math.min(canvas.width - 30, physicsNodes[i].x));
        physicsNodes[i].y = Math.max(30, Math.min(canvas.height - 30, physicsNodes[i].y));
    }
}

// --- Rendering ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let mstResult = computeMST(globalGraph);
    let cursedIds = new Set(mstResult.anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    let warnIds = new Set(mstResult.anomalies.filter(a => !a.isCursed).map(a => a.edge.id));
    let mstIds = new Set(mstResult.edges.map(e => e.id));
    
    if (animationMode) mstIds = animationEdges; 

    // Draw Edges
    globalGraph.edges.forEach(e => {
        let p1 = physicsNodes[e.from], p2 = physicsNodes[e.to];
        let isFocus = searchedNode === null || e.from === searchedNode || e.to === searchedNode;
        
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = 2; ctx.shadowBlur = 0; ctx.setLineDash([]);
        
        if (!isFocus && pathTraceEdges.size === 0) {
            ctx.strokeStyle = 'rgba(164, 176, 190, 0.05)';
        } else if (pathTraceEdges.has(e.id)) {
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 5; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
        } else if (animationMode && animationCycles.has(e.id)) {
            ctx.strokeStyle = '#ffa502'; ctx.lineWidth = 4; ctx.shadowColor = '#ffa502'; ctx.shadowBlur = 15;
        } else if (cursedIds.has(e.id)) {
            ctx.strokeStyle = 'rgba(255, 58, 92, 0.8)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(255, 58, 92, 0.5)'; ctx.shadowBlur = 10;
        } else if (mstIds.has(e.id) && pathTraceEdges.size === 0) {
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 4; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15;
        } else if (warnIds.has(e.id) && pathTraceEdges.size === 0) {
            ctx.strokeStyle = 'rgba(255, 165, 2, 0.6)'; ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = pathTraceEdges.size > 0 ? 'rgba(164, 176, 190, 0.05)' : 'rgba(164, 176, 190, 0.3)';
        }

        if (hoveredEdge && hoveredEdge.id === e.id) {
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.shadowBlur = 20; ctx.setLineDash([]);
        }
        ctx.stroke();
        
        if (config.showLabels && isFocus) {
            let mx = (p1.x + p2.x)/2, my = (p1.y + p2.y)/2;
            ctx.fillStyle = mstIds.has(e.id) ? '#00ff88' : '#a4b0be';
            if (cursedIds.has(e.id)) ctx.fillStyle = '#ff3a5c';
            ctx.font = '10px "Share Tech Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;
            ctx.fillText(e.weight, mx, my - 8);
        }
    });

    // Draw Nodes
    for (let i = 1; i <= globalGraph.nodesCount; i++) {
        let p = physicsNodes[i];
        let isFocus = searchedNode === null || searchedNode === i || 
                      globalGraph.edges.some(e => (e.from===i && e.to===searchedNode) || (e.to===i && e.from===searchedNode));
        let isPath = pathTraceNodes.has(i);

        ctx.beginPath();
        ctx.arc(p.x, p.y, searchedNode === i || isPath ? 22 : 16, 0, Math.PI*2);
        
        if (isPath) {
            ctx.fillStyle = '#0a1a1f'; ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15;
        } else if (isFocus && pathTraceNodes.size === 0) {
            ctx.fillStyle = searchedNode === i ? '#00ff88' : '#0a1a0f'; ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#050a08'; ctx.strokeStyle = 'rgba(0,255,136,0.2)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
        }
        ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = searchedNode === i || isPath ? '#000' : '#e8ede9';
        if(isPath && searchedNode !== i) ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 12px "Orbitron"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i, p.x, p.y);
        
        if (config.showNames && (isFocus || isPath)) {
            ctx.font = '9px "Share Tech Mono"'; ctx.fillStyle = isPath ? '#00e5ff' : '#a4b0be';
            ctx.fillText(TROUPE_MEMBERS[i].split(' ')[0], p.x, p.y + 24);
        }
    }
}

function animate() { applyPhysics(); draw(); requestAnimationFrame(animate); }

// --- UI Updates ---
function updateApp() {
    let mst = computeMST(globalGraph);
    updateUndoRedoBtns();
    runBenchmarks(globalGraph);
    
    document.getElementById('header-edges').textContent = globalGraph.edges.length;
    let cursedCount = mst.anomalies.filter(a => a.isCursed).length;
    document.getElementById('header-threats').textContent = cursedCount;
    document.getElementById('threat-chip').className = `stat-chip ${cursedCount > 0 ? 'danger' : ''}`;

    document.getElementById('mst-weight').textContent = mst.totalWeight;
    document.getElementById('mst-count').textContent = mst.edges.length;
    document.getElementById('mst-components').textContent = mst.components;
    document.getElementById('mst-complete').textContent = Math.round((mst.edges.length / (globalGraph.nodesCount-1))*100) + '%';
    
    let maxEdges = (globalGraph.nodesCount * (globalGraph.nodesCount-1))/2;
    document.getElementById('graph-density').textContent = Math.round((globalGraph.edges.length/maxEdges)*100) + '%';
    document.getElementById('avg-degree').textContent = (globalGraph.edges.length*2 / globalGraph.nodesCount).toFixed(1);

    let selectHtml = '<option value="">Choose an edge...</option>';
    globalGraph.edges.forEach(e => { selectHtml += `<option value="${e.id}">[${e.id}] ${e.from}↔${e.to} (W:${e.weight})</option>`; });
    document.getElementById('edge-select').innerHTML = selectHtml;

    let mstHtml = mst.edges.map(e => `<li><span>${e.from}↔${e.to}</span> <span style="color:var(--neon)">${e.weight}</span></li>`).join('');
    document.getElementById('mst-edge-list').innerHTML = mstHtml || '<li>No MST edges</li>';

    document.getElementById('anomaly-count').textContent = mst.anomalies.length;
    let anomalyHtml = mst.anomalies.map(a => {
        let color = a.isCursed ? 'var(--danger)' : 'var(--warn)';
        return `<li>
            <div style="color:${color}; font-weight:bold; margin-bottom:4px;">Edge ${a.edge.from}↔${a.edge.to} [${a.isCursed?'CURSED':'WARNING'}]</div>
            <div style="color:var(--text-dim)">Suspicion: ${a.suspicion}%</div>
            <div style="color:var(--text-dim); margin-top:2px">${a.reason}</div>
        </li>`;
    }).join('');
    document.getElementById('anomaly-list').innerHTML = anomalyHtml || '<li class="no-anomaly"><span class="pulse-dot green"></span> Web integrity verified.</li>';
}

function populateSelects() {
    let opts = '<option value="">Node...</option>';
    for(let i=1; i<=13; i++) opts += `<option value="${i}">[${i}] ${TROUPE_MEMBERS[i]}</option>`;
    document.getElementById('node-a').innerHTML = opts; document.getElementById('node-b').innerHTML = opts;
    document.getElementById('search-node').innerHTML = '<option value="">All nodes (reset)</option>' + opts;
    document.getElementById('path-start').innerHTML = opts; document.getElementById('path-end').innerHTML = opts;
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('add-edge-form').addEventListener('submit', e => {
        e.preventDefault();
        let u = parseInt(document.getElementById('node-a').value), v = parseInt(document.getElementById('node-b').value);
        let w = parseFloat(document.getElementById('weight').value);
        if(u && v && !isNaN(w) && u !== v) { saveState(); addEdge(globalGraph, {from: u, to: v, weight: w}); e.target.reset(); }
    });

    document.getElementById('path-form').addEventListener('submit', e => {
        e.preventDefault();
        let u = parseInt(document.getElementById('path-start').value);
        let v = parseInt(document.getElementById('path-end').value);
        if(u && v && u !== v) { searchedNode = null; findSafePath(u, v); }
    });

    document.getElementById('update-btn').addEventListener('click', () => {
        let id = parseInt(document.getElementById('edge-select').value), w = parseFloat(document.getElementById('new-weight').value);
        if(!isNaN(id) && !isNaN(w)) { saveState(); updateWeight(globalGraph, id, w); document.getElementById('new-weight').value = ''; }
    });
    document.getElementById('remove-btn').addEventListener('click', () => {
        let id = parseInt(document.getElementById('edge-select').value);
        if(!isNaN(id)) { saveState(); removeEdge(globalGraph, id); }
    });

    document.getElementById('search-btn').addEventListener('click', () => {
        pathTraceEdges.clear(); pathTraceNodes.clear();
        let val = document.getElementById('search-node').value;
        searchedNode = val ? parseInt(val) : null;
        document.getElementById('search-results').innerHTML = searchedNode ? `<span class="pulse-dot"></span> Focused on ${TROUPE_MEMBERS[searchedNode]}` : `<span class="pulse-dot green"></span> Full network view.`;
    });

    document.getElementById('undo-btn').addEventListener('click', undo); document.getElementById('redo-btn').addEventListener('click', redo);
    
    document.getElementById('physics-toggle').addEventListener('change', e => config.physicsEnabled = e.target.checked);
    document.getElementById('labels-toggle').addEventListener('change', e => config.showLabels = e.target.checked);
    document.getElementById('names-toggle').addEventListener('change', e => config.showNames = e.target.checked);
    document.getElementById('anim-speed').addEventListener('input', e => { config.animSpeed = parseInt(e.target.value); document.getElementById('speed-label').textContent = config.animSpeed + 'ms'; });

    // MST Animation
    document.getElementById('animate-mst-btn').addEventListener('click', () => {
        if(animationInterval) clearInterval(animationInterval);
        pathTraceEdges.clear(); pathTraceNodes.clear();
        animationMode = true; animationEdges.clear(); animationCycles.clear();
        let mst = computeMST(globalGraph);
        
        let i = 0; logActivity("Starting Kruskal Animation...", 'SYS');
        animationInterval = setInterval(() => {
            if(i < mst.ordered.length) {
                let e = mst.ordered[i];
                if(mst.edges.some(x => x.id === e.id)) { animationEdges.add(e.id); } 
                else { animationCycles.add(e.id); setTimeout(() => animationCycles.delete(e.id), config.animSpeed*0.8); }
                i++;
            } else { clearInterval(animationInterval); logActivity("Kruskal Animation complete.", 'SYS'); }
        }, config.animSpeed);
    });

    document.getElementById('reset-animation-btn').addEventListener('click', () => {
        if(animationInterval) clearInterval(animationInterval);
        animationMode = false; animationEdges.clear(); animationCycles.clear();
        pathTraceEdges.clear(); pathTraceNodes.clear();
    });

    let draggingNode = null;
    canvas.addEventListener('mousedown', e => {
        let rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for(let i=1; i<=globalGraph.nodesCount; i++) {
            if(Math.sqrt(Math.pow(mx-physicsNodes[i].x,2) + Math.pow(my-physicsNodes[i].y,2)) < 20) { draggingNode = i; physicsNodes[i].dragged = true; return; }
        }
    });
    canvas.addEventListener('mousemove', e => {
        let rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
        if(draggingNode) { physicsNodes[draggingNode].x = mx; physicsNodes[draggingNode].y = my; return; }

        let found = null, minDist = 10;
        for(let edge of globalGraph.edges) {
            let p1 = physicsNodes[edge.from], p2 = physicsNodes[edge.to];
            let l2 = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2);
            let t = Math.max(0, Math.min(1, ((mx-p1.x)*(p2.x-p1.x) + (my-p1.y)*(p2.y-p1.y))/l2));
            let px = p1.x + t*(p2.x-p1.x), py = p1.y + t*(p2.y-p1.y);
            let d = Math.sqrt(Math.pow(mx-px,2) + Math.pow(my-py,2));
            if(d < minDist) { found = edge; minDist = d; }
        }
        hoveredEdge = found;

        if(found) {
            let a = detectAnomaly(globalGraph).find(x => x.edge.id === found.id);
            let color = a ? (a.isCursed ? 'var(--danger)' : 'var(--warn)') : 'var(--neon)';
            tooltip.innerHTML = `<div style="border-bottom:1px solid var(--border); padding-bottom:5px; margin-bottom:5px;">EDGE ID: <b>#${found.id}</b></div>
                Nodes: ${TROUPE_MEMBERS[found.from].split(' ')[0]} ↔ ${TROUPE_MEMBERS[found.to].split(' ')[0]}<br>
                Weight: <b style="color:${color}">${found.weight}</b><br>
                Status: <span style="color:${color}">${a ? (a.isCursed ? 'CURSED' : 'WARNING') : 'CLEAN'}</span>
                ${a ? `<div style="margin-top:5px; font-size:0.8em; color:var(--text-dim)">${a.reason}</div>` : ''}`;
            tooltip.style.left = (e.clientX + 15) + 'px'; tooltip.style.top = (e.clientY + 15) + 'px'; tooltip.style.opacity = 1;
        } else { tooltip.style.opacity = 0; }
    });
    canvas.addEventListener('mouseup', () => { if(draggingNode) { physicsNodes[draggingNode].dragged = false; draggingNode = null; }});
    canvas.addEventListener('mouseleave', () => { if(draggingNode) { physicsNodes[draggingNode].dragged = false; draggingNode = null; } tooltip.style.opacity = 0; });
}

init();

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

// --- System State ---
let state = {
    edges: [],
    nextEdgeId: 1,
    nodesCount: 13
};

let history = [];
let redoStack = [];

let config = {
    physicsEnabled: true,
    showLabels: true,
    showNames: true,
    animSpeed: 800
};

// --- Physics State ---
let physicsNodes = {};
for (let i = 1; i <= state.nodesCount; i++) {
    physicsNodes[i] = { x: Math.random() * 800, y: Math.random() * 600, vx: 0, vy: 0, dragged: false };
}
let searchedNode = null;
let hoveredEdge = null;
let animationMode = false;
let animationEdges = new Set();
let animationInterval = null;

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
    
    // Default Edges
    addEdge(1, 2, 4); addEdge(2, 3, 7); addEdge(3, 4, 2); addEdge(4, 5, 9);
    addEdge(1, 5, 12); addEdge(5, 6, 5); addEdge(6, 7, 8); addEdge(7, 8, 1);
    addEdge(2, 8, 15); addEdge(8, 9, 6); addEdge(9, 10, 3); addEdge(10, 11, 11);
    addEdge(11, 12, 14); addEdge(12, 13, 10);
    // Cursed
    addEdge(13, 1, -5); addEdge(2, 4, 19); 
    
    clearHistory(); // initial state doesn't count as undoable action
    
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
    history.push(JSON.parse(JSON.stringify(state)));
    redoStack = [];
    updateUndoRedoBtns();
}
function clearHistory() { history = []; redoStack = []; updateUndoRedoBtns(); }

function undo() {
    if (history.length > 0) {
        redoStack.push(JSON.parse(JSON.stringify(state)));
        state = history.pop();
        logActivity("Action undone.");
        updateApp();
    }
}
function redo() {
    if (redoStack.length > 0) {
        history.push(JSON.parse(JSON.stringify(state)));
        state = redoStack.pop();
        logActivity("Action redone.");
        updateApp();
    }
}
function updateUndoRedoBtns() {
    document.getElementById('undo-btn').disabled = history.length === 0;
    document.getElementById('redo-btn').disabled = redoStack.length === 0;
}

// --- Core Logic ---
function addEdge(from, to, weight) {
    let edge = { id: state.nextEdgeId++, from, to, weight };
    state.edges.push(edge);
    logActivity(`Added edge ${from}↔${to} (W:${weight})`, 'SYS');
    updateApp();
}

function removeEdge(id) {
    let idx = state.edges.findIndex(e => e.id === id);
    if (idx > -1) {
        let e = state.edges[idx];
        state.edges.splice(idx, 1);
        logActivity(`Removed edge ${e.from}↔${e.to}`, 'SYS');
        updateApp();
    }
}

function updateWeight(id, w) {
    let e = state.edges.find(x => x.id === id);
    if (e) {
        e.weight = w;
        logActivity(`Updated edge ${e.from}↔${e.to} to W:${w}`, 'SYS');
        updateApp();
    }
}

// --- Anomaly Detection ---
function detectAnomaly() {
    let anomalies = [];
    let adj = {};
    for (let i = 1; i <= state.nodesCount; i++) adj[i] = [];
    state.edges.forEach(e => { adj[e.from].push(e); adj[e.to].push(e); });

    state.edges.forEach(e => {
        let suspicion = 0, reason = "";
        
        if (e.weight <= 0) { suspicion = 100; reason = "Weight ≤ 0 violates physical laws of the web."; }
        else if (e.weight > 20) { suspicion = 100; reason = "Weight exceeds structural limit (>20)."; }
        else if (e.from === e.to) { suspicion = 100; reason = "Self-loop paradox detected."; }
        else {
            // Triangle Inequality
            let minDetour = Infinity, detourPath = null;
            let nFrom = adj[e.from].filter(x => x.id !== e.id).map(x => ({ n: x.from === e.from ? x.to : x.from, w: x.weight }));
            let nTo = adj[e.to].filter(x => x.id !== e.id).map(x => ({ n: x.from === e.to ? x.to : x.from, w: x.weight }));
            
            nFrom.forEach(nf => {
                let nt = nTo.find(n => n.n === nf.n);
                if (nt) {
                    let w = nf.w + nt.w;
                    if (w < minDetour) { minDetour = w; detourPath = nf.n; }
                }
            });

            if (minDetour !== Infinity && e.weight > minDetour) {
                suspicion = Math.min(100, Math.round((e.weight / minDetour) * 50));
                reason = `Triangle inequality violation via node ${detourPath} (Detour W: ${minDetour}).`;
            }
        }

        if (suspicion > 0) {
            anomalies.push({ edge: e, reason, suspicion, isCursed: suspicion >= 80 });
        }
    });
    return anomalies;
}

// --- MST Computation ---
function computeMST() {
    let anomalies = detectAnomaly();
    let cursedIds = new Set(anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    
    let validEdges = state.edges.filter(e => !cursedIds.has(e.id));
    validEdges.sort((a, b) => a.weight - b.weight);
    
    let dsu = new DSU(state.nodesCount);
    let mstEdges = [], totalWeight = 0, components = state.nodesCount;
    
    for (let e of validEdges) {
        if (dsu.union(e.from, e.to)) {
            mstEdges.push(e);
            totalWeight += e.weight;
            components--;
        }
    }
    
    return { edges: mstEdges, totalWeight, anomalies, components };
}

// --- Physics Engine ---
function applyPhysics() {
    if (!config.physicsEnabled) return;
    
    const repulsion = 4000, springStrength = 0.03, damping = 0.8;
    let forces = {};
    for(let i=1; i<=state.nodesCount; i++) forces[i] = {x:0, y:0};

    // Repulsion
    for (let i = 1; i <= state.nodesCount; i++) {
        for (let j = i + 1; j <= state.nodesCount; j++) {
            let dx = physicsNodes[i].x - physicsNodes[j].x, dy = physicsNodes[i].y - physicsNodes[j].y;
            let dist = Math.sqrt(dx*dx + dy*dy) || 1;
            let f = repulsion / dist;
            forces[i].x += (dx/dist)*f; forces[i].y += (dy/dist)*f;
            forces[j].x -= (dx/dist)*f; forces[j].y -= (dy/dist)*f;
        }
    }

    // Springs
    state.edges.forEach(e => {
        let n1 = physicsNodes[e.from], n2 = physicsNodes[e.to];
        let dx = n1.x - n2.x, dy = n1.y - n2.y;
        let dist = Math.sqrt(dx*dx + dy*dy) || 1;
        let ideal = 80 + (e.weight * 5);
        let f = (dist - ideal) * springStrength;
        forces[e.from].x -= (dx/dist)*f; forces[e.from].y -= (dy/dist)*f;
        forces[e.to].x += (dx/dist)*f; forces[e.to].y += (dy/dist)*f;
    });

    // Gravity to center & Apply
    let cx = canvas.width/2, cy = canvas.height/2;
    for (let i = 1; i <= state.nodesCount; i++) {
        forces[i].x += (cx - physicsNodes[i].x) * 0.02;
        forces[i].y += (cy - physicsNodes[i].y) * 0.02;

        if (!physicsNodes[i].dragged) {
            physicsNodes[i].vx = (physicsNodes[i].vx + forces[i].x) * damping;
            physicsNodes[i].vy = (physicsNodes[i].vy + forces[i].y) * damping;
            physicsNodes[i].x += physicsNodes[i].vx;
            physicsNodes[i].y += physicsNodes[i].vy;
        }
        
        // Boundaries
        physicsNodes[i].x = Math.max(30, Math.min(canvas.width - 30, physicsNodes[i].x));
        physicsNodes[i].y = Math.max(30, Math.min(canvas.height - 30, physicsNodes[i].y));
    }
}

// --- Rendering ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let mst = computeMST();
    let mstIds = new Set(mst.edges.map(e => e.id));
    if(animationMode) mstIds = animationEdges;
    
    let cursedIds = new Set(mst.anomalies.filter(a => a.isCursed).map(a => a.edge.id));
    let warnIds = new Set(mst.anomalies.filter(a => !a.isCursed).map(a => a.edge.id));

    // Edges
    state.edges.forEach(e => {
        let p1 = physicsNodes[e.from], p2 = physicsNodes[e.to];
        let isFocus = searchedNode === null || e.from === searchedNode || e.to === searchedNode;
        
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = 2; ctx.shadowBlur = 0; ctx.setLineDash([]);
        
        if (!isFocus) {
            ctx.strokeStyle = 'rgba(164, 176, 190, 0.05)';
        } else if (cursedIds.has(e.id)) {
            ctx.strokeStyle = 'rgba(255, 58, 92, 0.8)';
            ctx.setLineDash([5, 5]); ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(255, 58, 92, 0.5)'; ctx.shadowBlur = 10;
        } else if (mstIds.has(e.id)) {
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 4;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 15;
        } else if (warnIds.has(e.id)) {
            ctx.strokeStyle = '#ffa502'; ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(164, 176, 190, 0.3)';
        }

        if (hoveredEdge && hoveredEdge.id === e.id) {
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 4;
            ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20; ctx.setLineDash([]);
        }
        
        ctx.stroke();
        
        // Edge Labels
        if (config.showLabels && isFocus) {
            let mx = (p1.x + p2.x)/2, my = (p1.y + p2.y)/2;
            ctx.fillStyle = mstIds.has(e.id) ? '#00ff88' : '#a4b0be';
            if (cursedIds.has(e.id)) ctx.fillStyle = '#ff3a5c';
            ctx.font = '10px "Share Tech Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText(e.weight, mx, my - 8);
        }
    });

    // Nodes
    for (let i = 1; i <= state.nodesCount; i++) {
        let p = physicsNodes[i];
        let isFocus = searchedNode === null || searchedNode === i || 
                      state.edges.some(e => (e.from===i && e.to===searchedNode) || (e.to===i && e.from===searchedNode));
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, searchedNode === i ? 22 : 16, 0, Math.PI*2);
        
        if (isFocus) {
            ctx.fillStyle = searchedNode === i ? '#00ff88' : '#0a1a0f';
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = '#050a08'; ctx.strokeStyle = 'rgba(0,255,136,0.2)';
            ctx.lineWidth = 1; ctx.shadowBlur = 0;
        }
        ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

        ctx.fillStyle = searchedNode === i ? '#000' : '#e8ede9';
        ctx.font = 'bold 12px "Orbitron"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(i, p.x, p.y);
        
        // Node Names
        if (config.showNames && isFocus) {
            ctx.font = '9px "Share Tech Mono"';
            ctx.fillStyle = '#a4b0be';
            ctx.fillText(TROUPE_MEMBERS[i].split(' ')[0], p.x, p.y + 24);
        }
    }
}

function animate() {
    applyPhysics();
    draw();
    requestAnimationFrame(animate);
}

// --- UI Updates ---
function updateApp() {
    let mst = computeMST();
    updateUndoRedoBtns();
    
    // Header
    document.getElementById('header-edges').textContent = state.edges.length;
    let cursedCount = mst.anomalies.filter(a => a.isCursed).length;
    document.getElementById('header-threats').textContent = cursedCount;
    document.getElementById('threat-chip').className = `stat-chip ${cursedCount > 0 ? 'danger' : ''}`;

    // Panels
    document.getElementById('mst-weight').textContent = mst.totalWeight;
    document.getElementById('mst-count').textContent = mst.edges.length;
    document.getElementById('mst-components').textContent = mst.components;
    document.getElementById('mst-complete').textContent = Math.round((mst.edges.length / (state.nodesCount-1))*100) + '%';
    
    // Graph Props
    let maxEdges = (state.nodesCount * (state.nodesCount-1))/2;
    document.getElementById('graph-density').textContent = Math.round((state.edges.length/maxEdges)*100) + '%';
    document.getElementById('avg-degree').textContent = (state.edges.length*2 / state.nodesCount).toFixed(1);
    let avgW = state.edges.length ? (state.edges.reduce((a,b)=>a+b.weight,0)/state.edges.length).toFixed(1) : 0;
    document.getElementById('avg-weight').textContent = avgW;
    document.getElementById('is-connected').textContent = mst.components === 1 ? 'Yes' : 'No';

    // Edge Lists
    let selectHtml = '<option value="">Choose an edge...</option>';
    state.edges.forEach(e => { selectHtml += `<option value="${e.id}">[${e.id}] ${e.from}↔${e.to} (W:${e.weight})</option>`; });
    document.getElementById('edge-select').innerHTML = selectHtml;

    let mstHtml = mst.edges.map(e => `<li><span>${e.from}↔${e.to}</span> <span style="color:var(--neon)">${e.weight}</span></li>`).join('');
    document.getElementById('mst-edge-list').innerHTML = mstHtml || '<li>No MST edges</li>';

    // Anomalies
    document.getElementById('anomaly-count').textContent = mst.anomalies.length;
    let anomalyHtml = mst.anomalies.map(a => {
        let color = a.isCursed ? 'var(--danger)' : 'var(--warn)';
        let status = a.isCursed ? 'CURSED' : 'WARNING';
        return `<li>
            <div style="color:${color}; font-weight:bold; margin-bottom:4px;">Edge ${a.edge.from}↔${a.edge.to} [${status}]</div>
            <div style="color:var(--text-dim)">Suspicion: ${a.suspicion}%</div>
            <div style="color:var(--text-dim); margin-top:2px">${a.reason}</div>
        </li>`;
    }).join('');
    document.getElementById('anomaly-list').innerHTML = anomalyHtml || '<li class="no-anomaly"><span class="pulse-dot green"></span> Web integrity verified. No cursed edges.</li>';
}

function populateSelects() {
    let opts = '<option value="">Node...</option>';
    for(let i=1; i<=13; i++) opts += `<option value="${i}">[${i}] ${TROUPE_MEMBERS[i]}</option>`;
    document.getElementById('node-a').innerHTML = opts;
    document.getElementById('node-b').innerHTML = opts;
    
    let searchOpts = '<option value="">All nodes (reset)</option>';
    for(let i=1; i<=13; i++) searchOpts += `<option value="${i}">[${i}] ${TROUPE_MEMBERS[i]}</option>`;
    document.getElementById('search-node').innerHTML = searchOpts;
}

// --- Event Listeners ---
function setupEventListeners() {
    // Controls
    document.getElementById('add-edge-form').addEventListener('submit', e => {
        e.preventDefault();
        let u = parseInt(document.getElementById('node-a').value);
        let v = parseInt(document.getElementById('node-b').value);
        let w = parseFloat(document.getElementById('weight').value);
        if(u && v && !isNaN(w) && u !== v) { saveState(); addEdge(u, v, w); e.target.reset(); }
        else alert("Invalid nodes.");
    });

    document.getElementById('update-btn').addEventListener('click', () => {
        let id = parseInt(document.getElementById('edge-select').value);
        let w = parseFloat(document.getElementById('new-weight').value);
        if(!isNaN(id) && !isNaN(w)) { saveState(); updateWeight(id, w); document.getElementById('new-weight').value = ''; }
    });

    document.getElementById('remove-btn').addEventListener('click', () => {
        let id = parseInt(document.getElementById('edge-select').value);
        if(!isNaN(id)) { saveState(); removeEdge(id); }
    });

    document.getElementById('search-btn').addEventListener('click', () => {
        let val = document.getElementById('search-node').value;
        searchedNode = val ? parseInt(val) : null;
        let res = document.getElementById('search-results');
        if(searchedNode) res.innerHTML = `<span class="pulse-dot"></span> Focused on ${TROUPE_MEMBERS[searchedNode]}`;
        else res.innerHTML = `<span class="pulse-dot green"></span> Full network view active.`;
    });

    // Header Actions
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.addEventListener('keydown', e => {
        if(e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if(e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        let blob = new Blob([JSON.stringify(state)], {type: 'application/json'});
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a'); a.href = url; a.download = 'spider_web_data.json'; a.click();
        logActivity("Graph exported.", 'SYS');
    });

    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', e => {
        let file = e.target.files[0];
        if(!file) return;
        let reader = new FileReader();
        reader.onload = ev => {
            try {
                let data = JSON.parse(ev.target.result);
                saveState(); state = data; updateApp(); logActivity("Graph imported.", 'SYS');
            } catch(err) { alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    });

    // Toggles
    document.getElementById('physics-toggle').addEventListener('change', e => config.physicsEnabled = e.target.checked);
    document.getElementById('labels-toggle').addEventListener('change', e => config.showLabels = e.target.checked);
    document.getElementById('names-toggle').addEventListener('change', e => config.showNames = e.target.checked);
    
    let speedSlider = document.getElementById('anim-speed');
    speedSlider.addEventListener('input', e => {
        config.animSpeed = parseInt(e.target.value);
        document.getElementById('speed-label').textContent = config.animSpeed + 'ms';
    });

    // Animation
    document.getElementById('animate-mst-btn').addEventListener('click', () => {
        if(animationInterval) clearInterval(animationInterval);
        animationMode = true; animationEdges.clear();
        let mst = computeMST();
        let i = 0;
        logActivity("Starting MST Animation...", 'SYS');
        animationInterval = setInterval(() => {
            if(i < mst.edges.length) {
                animationEdges.add(mst.edges[i].id);
                i++;
            } else {
                clearInterval(animationInterval);
                logActivity("MST Animation complete.", 'SYS');
            }
        }, config.animSpeed);
    });

    document.getElementById('reset-animation-btn').addEventListener('click', () => {
        if(animationInterval) clearInterval(animationInterval);
        animationMode = false; animationEdges.clear();
    });

    // Canvas Interactions
    let draggingNode = null;
    canvas.addEventListener('mousedown', e => {
        let rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left, my = e.clientY - rect.top;
        for(let i=1; i<=state.nodesCount; i++) {
            let dx = mx - physicsNodes[i].x, dy = my - physicsNodes[i].y;
            if(Math.sqrt(dx*dx + dy*dy) < 20) {
                draggingNode = i; physicsNodes[i].dragged = true; return;
            }
        }
    });
    
    canvas.addEventListener('mousemove', e => {
        let rect = canvas.getBoundingClientRect();
        let mx = e.clientX - rect.left, my = e.clientY - rect.top;
        
        if(draggingNode) {
            physicsNodes[draggingNode].x = mx; physicsNodes[draggingNode].y = my;
            return;
        }

        // Edge Hover
        let found = null, minDist = 10;
        for(let edge of state.edges) {
            let p1 = physicsNodes[edge.from], p2 = physicsNodes[edge.to];
            let l2 = Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2);
            let t = Math.max(0, Math.min(1, ((mx-p1.x)*(p2.x-p1.x) + (my-p1.y)*(p2.y-p1.y))/l2));
            let px = p1.x + t*(p2.x-p1.x), py = p1.y + t*(p2.y-p1.y);
            let d = Math.sqrt(Math.pow(mx-px,2) + Math.pow(my-py,2));
            if(d < minDist) { found = edge; minDist = d; }
        }
        hoveredEdge = found;

        if(found) {
            let anoms = detectAnomaly();
            let a = anoms.find(x => x.edge.id === found.id);
            let color = a ? (a.isCursed ? 'var(--danger)' : 'var(--warn)') : 'var(--neon)';
            tooltip.innerHTML = `
                <div style="border-bottom:1px solid var(--border); padding-bottom:5px; margin-bottom:5px;">
                    EDGE ID: <b>#${found.id}</b>
                </div>
                Nodes: ${TROUPE_MEMBERS[found.from].split(' ')[0]} ↔ ${TROUPE_MEMBERS[found.to].split(' ')[0]}<br>
                Weight: <b style="color:${color}">${found.weight}</b><br>
                Status: <span style="color:${color}">${a ? (a.isCursed ? 'CURSED' : 'WARNING') : 'CLEAN'}</span>
                ${a ? `<div style="margin-top:5px; font-size:0.8em; color:var(--text-dim)">${a.reason}</div>` : ''}
            `;
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            tooltip.style.opacity = 1;
        } else {
            tooltip.style.opacity = 0;
        }
    });

    canvas.addEventListener('mouseup', () => {
        if(draggingNode) { physicsNodes[draggingNode].dragged = false; draggingNode = null; }
    });
    canvas.addEventListener('mouseleave', () => {
        if(draggingNode) { physicsNodes[draggingNode].dragged = false; draggingNode = null; }
        tooltip.style.opacity = 0;
    });
}

// Start
init();

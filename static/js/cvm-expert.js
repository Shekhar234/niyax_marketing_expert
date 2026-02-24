/* ========================================
   NiYA-X Marketing Expert - CLEAN VERSION
   Proper Intent Detection & Consistent Responses
   ======================================== */

// ============ STATE ============
let state = {
    currentIntent: null,
    userGoal: '',
    segments: [],
    phase: 'waiting'
};

// ============ AGENTS ============
const AGENTS = {
    intent: { name: 'Intent Parser', icon: '🎯' },
    planner: { name: 'Outcome Planner', icon: '📋' },
    discovery: { name: 'Segment Discovery', icon: '👥' },
    analyzer: { name: 'Behavior Analyzer', icon: '🔍' },
    strategist: { name: 'Strategy Designer', icon: '💡' },
    optimizer: { name: 'Channel Optimizer', icon: '📡' },
    predictor: { name: 'Impact Predictor', icon: '🔮' }
};

// ============ INTENT DETECTION - FIXED & CLEAR ============
function detectIntent(text) {
    const lower = text.toLowerCase();
    
    // CHURN - Check first as it's most specific
    if (/churn|retain|retention|losing\s*customer|stop.*leaving|prevent.*cancel|reduce.*attrition|customer.*leaving/i.test(lower)) {
        return {
            type: 'CHURN',
            label: 'Reduce Customer Churn',
            objective: 'Identify at-risk customers and prevent them from leaving',
            metric: 'Churn rate reduction'
        };
    }
    
    // WINBACK
    if (/win\s*back|reactivat|dormant|inactive|lapsed|bring.*back|lost.*customer/i.test(lower)) {
        return {
            type: 'WINBACK',
            label: 'Reactivate Dormant Customers',
            objective: 'Win back customers who have stopped using services',
            metric: 'Reactivation rate'
        };
    }
    
    // ARPU/REVENUE
    if (/arpu|revenue|upsell|upgrade|increase.*spend|more.*revenue|monetiz/i.test(lower)) {
        return {
            type: 'ARPU',
            label: 'Increase Revenue Per User',
            objective: 'Grow average revenue through upselling and upgrades',
            metric: 'ARPU uplift'
        };
    }
    
    // ADOPTION/BUNDLE
    if (/adopt|bundle|content\s*pack|ott|streaming|cross.?sell|new.*product|subscription/i.test(lower)) {
        return {
            type: 'ADOPTION',
            label: 'Drive Product Adoption',
            objective: 'Increase adoption of products and bundles',
            metric: 'Adoption rate'
        };
    }
    
    // USAGE/ENGAGEMENT
    if (/usage|engage|active|consumption|utiliz|more.*use/i.test(lower)) {
        return {
            type: 'USAGE',
            label: 'Increase Customer Engagement',
            objective: 'Boost product usage and customer engagement',
            metric: 'Usage increase'
        };
    }
    
    // Default - ask for clarification
    return null;
}

// ============ SEGMENT GENERATORS - MATCHED TO INTENT ============
function generateSegments(intent, userText) {
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    switch(intent.type) {
        case 'CHURN':
            return [
                {
                    name: 'Silent Disengagers',
                    size: r(20, 40) + 'K',
                    behavior: `App usage dropped ${r(50, 70)}% in last ${r(3, 5)} weeks with no complaints`,
                    signal: 'Quietly withdrawing - high flight risk without intervention',
                    action: 'Proactive outreach with personalized retention offer',
                    priority: 'Critical'
                },
                {
                    name: 'Vocal Complainers',
                    size: r(15, 30) + 'K',
                    behavior: `${r(3, 6)} support tickets in ${r(30, 60)} days, NPS below ${r(3, 5)}`,
                    signal: 'Expressing frustration openly - needs immediate service recovery',
                    action: 'Service recovery call + compensation + dedicated support',
                    priority: 'High'
                },
                {
                    name: 'Payment Defaulters',
                    size: r(10, 25) + 'K',
                    behavior: `${r(2, 4)} consecutive missed/failed payments, reducing usage`,
                    signal: 'Financial difficulty causing disengagement',
                    action: 'Flexible payment plan + temporary downgrade option',
                    priority: 'Medium'
                }
            ];
            
        case 'ARPU':
            return [
                {
                    name: 'Plan Limit Hitters',
                    size: r(30, 50) + 'K',
                    behavior: `Consistently using ${r(85, 98)}% of plan quota, buying top-ups`,
                    signal: 'Already spending extra - upgrade makes economic sense',
                    action: 'Show total current spend vs upgrade cost savings',
                    priority: 'High'
                },
                {
                    name: 'Premium Device Owners',
                    size: r(20, 35) + 'K',
                    behavior: `Device worth ₹${r(25, 50)}K+ but on basic ₹${r(199, 299)} plan`,
                    signal: 'Can afford more, device capabilities underutilized',
                    action: 'Premium plan trial with exclusive features',
                    priority: 'High'
                },
                {
                    name: 'Loyal Mid-Tier',
                    size: r(25, 45) + 'K',
                    behavior: `${r(18, 36)} months tenure, steady usage, mid-tier plan`,
                    signal: 'Loyal and stable - ready for loyalty-based upgrade',
                    action: 'Tenure reward + exclusive upgrade discount',
                    priority: 'Medium'
                }
            ];
            
        case 'ADOPTION':
            return [
                {
                    name: 'Content Streamers',
                    size: r(35, 55) + 'K',
                    behavior: `Using ${r(8, 15)}GB monthly on YouTube/Netflix, no bundle subscription`,
                    signal: 'Already consuming content - bundle is natural fit',
                    action: 'Show value: current data cost vs all-inclusive bundle',
                    priority: 'High'
                },
                {
                    name: 'Weekend Bingers',
                    size: r(25, 40) + 'K',
                    behavior: `${r(60, 80)}% of data used on weekends for entertainment`,
                    signal: 'Clear leisure pattern - entertainment bundle resonates',
                    action: 'Weekend unlimited streaming offer',
                    priority: 'High'
                },
                {
                    name: 'Multi-Device Families',
                    size: r(20, 35) + 'K',
                    behavior: `${r(3, 5)} devices connected, shared usage patterns`,
                    signal: 'Family household needs family bundle',
                    action: 'Family pack with individual profiles',
                    priority: 'Medium'
                }
            ];
            
        case 'USAGE':
            return [
                {
                    name: 'Sleeping Subscribers',
                    size: r(40, 70) + 'K',
                    behavior: `Using only ${r(15, 30)}% of paid plan, ${r(1, 3)} logins/week`,
                    signal: 'Paying but not using - churn risk if not engaged',
                    action: 'Gamified usage challenge with rewards',
                    priority: 'High'
                },
                {
                    name: 'Feature Blind',
                    size: r(30, 50) + 'K',
                    behavior: `Never accessed ${r(60, 80)}% of available features`,
                    signal: 'Don\'t know what they\'re missing',
                    action: 'Guided feature discovery tutorial',
                    priority: 'High'
                },
                {
                    name: 'Single-Use Customers',
                    size: r(25, 40) + 'K',
                    behavior: `${r(80, 95)}% usage on one feature only`,
                    signal: 'Narrow engagement - expand use cases',
                    action: 'Cross-feature recommendations based on behavior',
                    priority: 'Medium'
                }
            ];
            
        case 'WINBACK':
            return [
                {
                    name: 'Recent Churners',
                    size: r(15, 30) + 'K',
                    behavior: `Left ${r(30, 60)} days ago after ${r(12, 24)}+ months`,
                    signal: 'Fresh exit, emotional connection still exists',
                    action: 'Personal "we miss you" + comeback offer',
                    priority: 'Critical'
                },
                {
                    name: 'Competitor Switchers',
                    size: r(10, 25) + 'K',
                    behavior: `Ported to competitor, now paying ${r(10, 30)}% more`,
                    signal: 'Grass wasn\'t greener - value comparison works',
                    action: 'Side-by-side comparison + switch-back bonus',
                    priority: 'High'
                },
                {
                    name: 'Seasonal Pausers',
                    size: r(8, 20) + 'K',
                    behavior: `Usage dropped after specific life event/season`,
                    signal: 'Temporary pause, not permanent exit intent',
                    action: 'Flexible reconnection with welcome-back credits',
                    priority: 'Medium'
                }
            ];
            
        default:
            return [];
    }
}

// ============ IMPACT GENERATORS - MATCHED TO INTENT ============
function generateImpact(intent) {
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    switch(intent.type) {
        case 'CHURN':
            return {
                metrics: [
                    { icon: '📉', value: `-${r(15, 25)}%`, label: 'Churn Reduction' },
                    { icon: '🛡️', value: `${r(20, 40)}K`, label: 'Customers Saved' },
                    { icon: '💰', value: `₹${r(3, 8)}Cr`, label: 'Revenue Protected' }
                ],
                confidence: r(82, 92)
            };
        case 'ARPU':
            return {
                metrics: [
                    { icon: '📈', value: `+₹${r(45, 85)}`, label: 'ARPU Uplift' },
                    { icon: '⬆️', value: `${r(12, 22)}%`, label: 'Upgrade Rate' },
                    { icon: '💰', value: `₹${r(4, 10)}Cr`, label: 'Revenue Gain' }
                ],
                confidence: r(78, 88)
            };
        case 'ADOPTION':
            return {
                metrics: [
                    { icon: '📦', value: `+${r(20, 35)}%`, label: 'Adoption Rate' },
                    { icon: '👥', value: `${r(30, 60)}K`, label: 'New Subscribers' },
                    { icon: '💰', value: `₹${r(2, 6)}Cr`, label: 'Bundle Revenue' }
                ],
                confidence: r(80, 90)
            };
        case 'USAGE':
            return {
                metrics: [
                    { icon: '📊', value: `+${r(30, 50)}%`, label: 'Usage Increase' },
                    { icon: '📱', value: `+${r(35, 60)}K`, label: 'Active Users' },
                    { icon: '🎯', value: `+${r(20, 35)}`, label: 'Engagement Score' }
                ],
                confidence: r(75, 85)
            };
        case 'WINBACK':
            return {
                metrics: [
                    { icon: '🔄', value: `${r(25, 40)}%`, label: 'Win-back Rate' },
                    { icon: '🏆', value: `${r(15, 30)}K`, label: 'Customers Returned' },
                    { icon: '💰', value: `₹${r(2, 5)}Cr`, label: 'Recovered Revenue' }
                ],
                confidence: r(72, 82)
            };
        default:
            return { metrics: [], confidence: 0 };
    }
}

// ============ DOM ELEMENTS ============
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const reasoningLog = document.getElementById('reasoningLog');
const agentIcon = document.getElementById('agentIcon');
const agentName = document.getElementById('agentName');
const agentDescription = document.getElementById('agentDescription');
const activeAgentCard = document.getElementById('activeAgentCard');

// ============ MAIN FLOW ============
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    addUserMessage(text);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    processInput(text);
}

function sendSuggestion(text) {
    addUserMessage(text);
    processInput(text);
}

async function processInput(text) {
    state.userGoal = text;
    
    // Detect intent
    const intent = detectIntent(text);
    
    if (!intent) {
        // Could not understand - ask for clarification
        showTyping();
        await delay(1000);
        addAssistantMessage(`
            <p>I want to make sure I understand your goal correctly. What would you like to achieve?</p>
            <div class="options-grid">
                <button class="goal-btn" onclick="sendSuggestion('I want to reduce customer churn')">
                    <span class="goal-icon">📉</span>
                    <span class="goal-text">Reduce Churn</span>
                </button>
                <button class="goal-btn" onclick="sendSuggestion('I want to increase ARPU through upselling')">
                    <span class="goal-icon">📈</span>
                    <span class="goal-text">Increase ARPU</span>
                </button>
                <button class="goal-btn" onclick="sendSuggestion('I want to drive content bundle adoption')">
                    <span class="goal-icon">📦</span>
                    <span class="goal-text">Drive Adoption</span>
                </button>
                <button class="goal-btn" onclick="sendSuggestion('I want to reactivate dormant customers')">
                    <span class="goal-icon">🔄</span>
                    <span class="goal-text">Win Back</span>
                </button>
            </div>
        `);
        return;
    }
    
    state.currentIntent = intent;
    await runAnalysis(text, intent);
}

async function runAnalysis(userText, intent) {
    // ===== STEP 1: Intent Recognition =====
    await activateAgent('intent');
    await typeThinking([
        `Analyzing: "${userText.substring(0, 50)}${userText.length > 50 ? '...' : ''}"`,
        `Detected objective: ${intent.label.toUpperCase()}`,
        `This is about: ${intent.objective}`
    ]);
    
    await delay(800);
    
    // ===== STEP 2: Planning =====
    await activateAgent('planner');
    await typeThinking([
        `Setting up analysis framework for ${intent.type} optimization...`,
        `Defining success metrics: ${intent.metric}`,
        `Preparing data queries for subscriber base...`
    ]);
    
    showTyping();
    await delay(1200);
    
    const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    addAssistantMessage(`
        <p><strong>Analysis Framework:</strong></p>
        <div class="framework-card">
            <div class="fw-row">
                <span class="fw-label">Objective</span>
                <span class="fw-value">${intent.label}</span>
            </div>
            <div class="fw-row">
                <span class="fw-label">Goal</span>
                <span class="fw-value">${intent.objective}</span>
            </div>
            <div class="fw-row">
                <span class="fw-label">Data Scope</span>
                <span class="fw-value">${r(500, 900)}K subscribers analyzed</span>
            </div>
            <div class="fw-row">
                <span class="fw-label">Success Metric</span>
                <span class="fw-value">${intent.metric}</span>
            </div>
        </div>
        <p>Now discovering target segments...</p>
    `);
    
    await delay(1000);
    
    // ===== STEP 3: Segment Discovery =====
    await activateAgent('discovery');
    
    // Generate thinking specific to the intent
    const thinkingByIntent = {
        CHURN: [
            'Scanning for disengagement patterns in the base...',
            'Identifying customers with declining activity...',
            'Correlating complaint history with churn risk...',
            'Segmenting by risk level and value...'
        ],
        ARPU: [
            'Finding customers with upgrade potential...',
            'Analyzing usage vs plan capacity...',
            'Identifying willingness-to-pay signals...',
            'Segmenting by value headroom...'
        ],
        ADOPTION: [
            'Scanning for product affinity signals...',
            'Identifying consumption patterns matching bundles...',
            'Finding non-subscribers with high fit scores...',
            'Segmenting by adoption probability...'
        ],
        USAGE: [
            'Profiling low-engagement customers...',
            'Identifying usage barriers and gaps...',
            'Finding feature discovery opportunities...',
            'Segmenting by activation potential...'
        ],
        WINBACK: [
            'Analyzing churned customer profiles...',
            'Identifying win-back opportunity windows...',
            'Finding customers with reactivation potential...',
            'Segmenting by recency and value...'
        ]
    };
    
    await typeThinking(thinkingByIntent[intent.type] || thinkingByIntent.CHURN);
    
    // Generate segments MATCHED to intent
    state.segments = generateSegments(intent, userText);
    
    await activateAgent('analyzer');
    await typeThinking([
        `Found ${state.segments.length} high-opportunity segments`,
        'Calculating propensity scores...',
        'Ranking by priority and impact...'
    ]);
    
    // Show segments one by one
    for (let i = 0; i < state.segments.length; i++) {
        showTyping();
        await delay(1000);
        
        const seg = state.segments[i];
        addAssistantMessage(`
            <div class="segment-card priority-${seg.priority.toLowerCase()}">
                <div class="seg-header">
                    <span class="seg-num">${i + 1}</span>
                    <span class="seg-name">${seg.name}</span>
                    <span class="seg-size">${seg.size}</span>
                    <span class="seg-priority ${seg.priority.toLowerCase()}">${seg.priority}</span>
                </div>
                <div class="seg-body">
                    <div class="seg-row">
                        <strong>Behavior:</strong> ${seg.behavior}
                    </div>
                    <div class="seg-row">
                        <strong>Signal:</strong> ${seg.signal}
                    </div>
                    <div class="seg-row action-row">
                        <strong>Recommended Action:</strong> ${seg.action}
                    </div>
                </div>
            </div>
        `);
        
        if (i < state.segments.length - 1) {
            await delay(500);
        }
    }
    
    await delay(800);
    
    // ===== STEP 4: Strategy =====
    await activateAgent('strategist');
    await typeThinking([
        'Designing intervention strategy per segment...',
        'Matching offers to segment characteristics...',
        'Optimizing messaging for each group...'
    ]);
    
    showTyping();
    await delay(1000);
    
    addAssistantMessage(`
        <p><strong>Strategy Summary:</strong></p>
        <div class="strategy-summary">
            ${state.segments.map((seg, i) => `
                <div class="strat-row">
                    <span class="strat-num">${i + 1}</span>
                    <span class="strat-name">${seg.name}</span>
                    <span class="strat-action">${seg.action}</span>
                </div>
            `).join('')}
        </div>
    `);
    
    await delay(800);
    
    // ===== STEP 5: Channel Optimization =====
    await activateAgent('optimizer');
    await typeThinking([
        'Analyzing channel preferences...',
        'Optimizing contact timing...',
        'Setting frequency caps...'
    ]);
    
    showTyping();
    await delay(1000);
    
    addAssistantMessage(`
        <p><strong>Channel Strategy:</strong></p>
        <div class="channel-grid">
            <div class="ch-item">
                <span class="ch-icon">📱</span>
                <span class="ch-name">In-App</span>
                <span class="ch-when">During active sessions</span>
            </div>
            <div class="ch-item">
                <span class="ch-icon">💬</span>
                <span class="ch-name">WhatsApp</span>
                <span class="ch-when">Evening 7-9 PM</span>
            </div>
            <div class="ch-item">
                <span class="ch-icon">📧</span>
                <span class="ch-name">Email</span>
                <span class="ch-when">Morning 9-11 AM</span>
            </div>
        </div>
    `);
    
    await delay(800);
    
    // ===== STEP 6: Impact Prediction =====
    await activateAgent('predictor');
    await typeThinking([
        'Running prediction models...',
        'Calculating expected impact...',
        'Validating against benchmarks...'
    ]);
    
    showTyping();
    await delay(1200);
    
    const impact = generateImpact(intent);
    
    addAssistantMessage(`
        <p><strong>Predicted Impact:</strong></p>
        <div class="impact-grid">
            ${impact.metrics.map(m => `
                <div class="impact-item">
                    <span class="impact-icon">${m.icon}</span>
                    <span class="impact-value">${m.value}</span>
                    <span class="impact-label">${m.label}</span>
                </div>
            `).join('')}
        </div>
        <div class="confidence-bar">
            <span>Confidence: ${impact.confidence}%</span>
            <div class="conf-track">
                <div class="conf-fill" style="width: ${impact.confidence}%"></div>
            </div>
        </div>
        <p style="margin-top: 16px;">Campaign is ready. What would you like to do?</p>
        <div class="action-btns">
            <button class="action-btn primary" onclick="sendSuggestion('Deploy this campaign')">🚀 Deploy Campaign</button>
            <button class="action-btn secondary" onclick="sendSuggestion('Show me more details about segment 1')">📊 Segment Details</button>
            <button class="action-btn secondary" onclick="sendSuggestion('I want to refine the strategy')">🎯 Refine</button>
        </div>
    `);
    
    state.phase = 'complete';
    resetAgent();
}

// ============ UI HELPERS ============
function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `
        <div class="message-avatar">JD</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(text)}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addAssistantMessage(html) {
    removeTyping();
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
        <div class="message-avatar"><img src="/static/assets/niyax_picture.png" onerror="this.parentElement.innerHTML='🤖'"></div>
        <div class="message-content">
            <div class="message-text">${html}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    removeTyping();
    const div = document.createElement('div');
    div.className = 'message assistant typing-msg';
    div.innerHTML = `
        <div class="message-avatar"><img src="/static/assets/niyax_picture.png" onerror="this.parentElement.innerHTML='🤖'"></div>
        <div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    `;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    document.querySelector('.typing-msg')?.remove();
}

async function activateAgent(key) {
    const agent = AGENTS[key];
    if (!agent) return;
    
    agentIcon.textContent = agent.icon;
    agentName.textContent = agent.name;
    agentDescription.textContent = 'Processing...';
    activeAgentCard.querySelector('.status-dot').className = 'status-dot active';
    activeAgentCard.querySelector('.status-text').textContent = 'Active';
    
    // Update pipeline
    document.querySelectorAll('.pipeline-step').forEach(el => el.classList.remove('active'));
    const step = document.querySelector(`.pipeline-step[data-step="${key}"]`);
    if (step) {
        step.classList.add('active');
        step.querySelector('.step-status').textContent = 'Running...';
    }
}

async function typeThinking(thoughts) {
    clearThinking();
    
    for (const thought of thoughts) {
        const line = document.createElement('div');
        line.className = 'think-line';
        line.innerHTML = `<span class="think-dot"></span><span class="think-text"></span>`;
        reasoningLog.appendChild(line);
        
        const textEl = line.querySelector('.think-text');
        
        // Type character by character
        for (let i = 0; i < thought.length; i++) {
            textEl.textContent += thought[i];
            await delay(12);
        }
        
        reasoningLog.scrollTop = reasoningLog.scrollHeight;
        await delay(300);
    }
}

function clearThinking() {
    reasoningLog.innerHTML = '';
}

function resetAgent() {
    agentIcon.textContent = '✅';
    agentName.textContent = 'Complete';
    agentDescription.textContent = 'Analysis finished';
    activeAgentCard.querySelector('.status-dot').className = 'status-dot';
    activeAgentCard.querySelector('.status-text').textContent = 'Done';
}

function resetConversation() {
    state = { currentIntent: null, userGoal: '', segments: [], phase: 'waiting' };
    chatMessages.innerHTML = '';
    clearThinking();
    
    document.querySelectorAll('.pipeline-step').forEach(el => {
        el.classList.remove('active', 'completed');
        el.querySelector('.step-status').textContent = 'Pending';
    });
    
    agentIcon.textContent = '🎯';
    agentName.textContent = 'Ready';
    agentDescription.textContent = 'Waiting for your goal';
    activeAgentCard.querySelector('.status-dot').className = 'status-dot';
    
    addAssistantMessage(`
        <p>Hello! I'm your <strong>Marketing Expert</strong>. Tell me what you want to achieve.</p>
        <div class="options-grid">
            <button class="goal-btn" onclick="sendSuggestion('I want to reduce customer churn')">
                <span class="goal-icon">📉</span>
                <span class="goal-text">Reduce Churn</span>
            </button>
            <button class="goal-btn" onclick="sendSuggestion('I want to increase ARPU')">
                <span class="goal-icon">📈</span>
                <span class="goal-text">Increase ARPU</span>
            </button>
            <button class="goal-btn" onclick="sendSuggestion('I want to drive bundle adoption')">
                <span class="goal-icon">📦</span>
                <span class="goal-text">Drive Adoption</span>
            </button>
            <button class="goal-btn" onclick="sendSuggestion('I want to win back dormant customers')">
                <span class="goal-icon">🔄</span>
                <span class="goal-text">Win Back</span>
            </button>
        </div>
    `);
}

// ============ UTILITIES ============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    chatInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
});

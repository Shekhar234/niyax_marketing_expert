/* ========================================
   NiYA-X Marketing Expert Chat
   With Collapsible Agent Reasoning
   ======================================== */

// ============ STATE ============
let state = {
    mode: 'reactive',
    task: null,
    phase: 'initial',
    userGoal: '',
    priority: ''
};

// ============ TASK DEFINITIONS ============
const TASKS = {
    crosssell: {
        name: 'Discover Cross-sell Segments',
        mode: 'reactive',
        welcomeMessage: `You've selected <strong>Discover Cross-Sell Opportunities</strong>.

Please describe your business goal. For example:
• Increase adoption of content bundle packs
• Cross-sell data add-ons to voice-heavy users
• Promote family plans to multi-device households`
    },
    retention: {
        name: 'Design Retention Program',
        mode: 'proactive',
        welcomeMessage: null
    },
    optimize: {
        name: 'Optimise Campaign Performance',
        mode: 'reactive',
        welcomeMessage: `You've selected <strong>Optimise Campaign Performance</strong>.

Which campaign would you like me to analyze?`
    },
    revenue: {
        name: 'Accelerate Revenue Growth',
        mode: 'reactive',
        welcomeMessage: `You've selected <strong>Accelerate Revenue Growth</strong>.

What's your revenue growth objective?`
    },
    winback: {
        name: 'Reactivate Dormant Customers',
        mode: 'proactive',
        welcomeMessage: null
    },
    engagement: {
        name: 'Improve Customer Engagement',
        mode: 'reactive',
        welcomeMessage: `You've selected <strong>Improve Customer Engagement</strong>.

What engagement challenge would you like to address?`
    },
    newproduct: {
        name: 'Launch New Product Campaign',
        mode: 'reactive',
        welcomeMessage: `You've selected <strong>Launch New Product Campaign</strong>.

Tell me about the product you want to launch.`
    }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const taskType = params.get('task');
    const customQuery = params.get('custom');
    
    if (taskType && TASKS[taskType]) {
        initializeTask(taskType);
    } else if (customQuery) {
        initializeCustom(decodeURIComponent(customQuery));
    } else {
        showWelcome();
    }
    
    const input = document.getElementById('chatInput');
    input?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
});

function initializeTask(taskType) {
    const task = TASKS[taskType];
    state.task = taskType;
    state.mode = task.mode;
    state.phase = 'awaiting_goal';
    
    const badge = document.getElementById('modeBadge');
    badge.textContent = task.mode === 'proactive' ? 'Proactive Mode' : 'Reactive Mode';
    badge.className = 'mode-badge' + (task.mode === 'proactive' ? ' proactive' : '');
    
    if (task.mode === 'proactive') {
        runProactiveFlow(taskType);
    } else {
        addAssistantMessage(task.welcomeMessage);
    }
}

function initializeCustom(query) {
    state.mode = 'reactive';
    state.phase = 'awaiting_goal';
    addUserMessage(query);
    processUserInput(query);
}

function showWelcome() {
    addAssistantMessage(`Hello! I'm your <strong>Marketing Expert</strong>. What would you like to work on today?`);
}

// ============ CONVERSATION FLOW ============
async function processUserInput(text) {
    if (state.phase === 'awaiting_goal') {
        state.userGoal = text;
        state.phase = 'awaiting_priority';
        
        showTyping();
        await delay(1500);
        
        addAssistantMessage(`
            <p>Understood. I will identify cross-sell opportunities across your subscriber base and design targeted interventions.</p>
            <p>Before I proceed, what priority should I optimise for — <strong>revenue</strong>, <strong>engagement</strong>, or <strong>retention</strong>?</p>
            <div class="msg-actions">
                <button class="action-btn secondary" onclick="selectPriority('revenue')">💰 Revenue</button>
                <button class="action-btn secondary" onclick="selectPriority('engagement')">📱 Engagement</button>
                <button class="action-btn secondary" onclick="selectPriority('retention')">🛡️ Retention</button>
            </div>
        `);
        return;
    }
    
    if (state.phase === 'awaiting_priority') {
        state.priority = text;
        state.phase = 'analyzing';
        
        showTyping();
        await delay(1200);
        
        addAssistantMessage(`
            <p>Ok, noted.</p>
            <p>I will discover subscriber cohorts where bundle adoption <strong>increases ARPU</strong> without increasing downgrade or churn probability.</p>
        `);
        
        await delay(1500);
        await runFullOrchestration();
        return;
    }
    
    if (state.phase === 'complete') {
        await handleFollowUp(text);
    }
}

function selectPriority(priority) {
    const priorityText = priority === 'revenue' ? 'Revenue with minimal churn risk' :
                         priority === 'engagement' ? 'Engagement with sustainable growth' :
                         'Retention with minimal revenue impact';
    addUserMessage(priorityText);
    state.priority = priority;
    state.phase = 'analyzing';
    
    setTimeout(async () => {
        showTyping();
        await delay(1200);
        
        addAssistantMessage(`
            <p>Ok, noted.</p>
            <p>I will discover subscriber cohorts where bundle adoption <strong>increases ARPU</strong> without increasing downgrade or churn probability.</p>
        `);
        
        await delay(1500);
        await runFullOrchestration();
    }, 500);
}

// ============ FULL ORCHESTRATION WITH COLLAPSIBLE REASONING ============
async function runFullOrchestration() {
    activateMasterAgent();
    
    // ===== STEP 1: Outcome Planner Agent =====
    await runAgentWithReasoning('planner', [
        'Translate vague business goal → measurable outcome',
        'Define success metric: Incremental ARPU uplift + stable churn probability',
        'Define candidate population: Postpaid non-bundle subscribers',
        'Define constraints: Avoid price-sensitive segments'
    ], null); // No right panel output for this step
    
    await delay(1500);
    
    // ===== STEP 2: Segment Discovery Agent =====
    await runAgentWithReasoning('segment', [
        'Identify natural affinity signals instead of demographics:',
        '• OTT consumption patterns',
        '• Data usage bursts during streaming hours',
        '• App category affinity',
        '• Roaming & weekend behavior',
        '• Historical add-on purchases'
    ], `
        <p><strong>3 high-propensity micro-segments discovered:</strong></p>
        <table class="data-table">
            <tr>
                <th>Segment</th>
                <th>Behaviour Signature</th>
                <th>Bundle Fit</th>
            </tr>
            <tr>
                <td><strong>Night Streamers</strong></td>
                <td>High 11pm-2am video usage</td>
                <td>Entertainment Pack</td>
            </tr>
            <tr>
                <td><strong>Family Sharers</strong></td>
                <td>Multi-device usage</td>
                <td>Family Content Pack</td>
            </tr>
            <tr>
                <td><strong>Sports Event Spikers</strong></td>
                <td>Usage spikes during match days</td>
                <td>Sports Pack</td>
            </tr>
        </table>
    `);
    
    await delay(1500);
    
    // ===== STEP 3: Elasticity Intelligence Agent =====
    await runAgentWithReasoning('elasticity', [
        'Determine willingness-to-pay and downgrade risk',
        'Analyze price sensitivity across discovered segments',
        'Calculate churn probability under different offer scenarios',
        'Identify upsell headroom for each cohort'
    ], `
        <table class="data-table">
            <tr>
                <th>Segment</th>
                <th>Price Sensitivity</th>
                <th>Churn Risk</th>
                <th>Upsell Headroom</th>
            </tr>
            <tr>
                <td><strong>Night Streamers</strong></td>
                <td>Medium</td>
                <td>Low</td>
                <td><span class="tag green">High</span></td>
            </tr>
            <tr>
                <td><strong>Family Sharers</strong></td>
                <td>Low</td>
                <td>Very Low</td>
                <td><span class="tag green">Very High</span></td>
            </tr>
            <tr>
                <td><strong>Sports Spikers</strong></td>
                <td>High</td>
                <td>Medium</td>
                <td><span class="tag yellow">Moderate</span></td>
            </tr>
        </table>
    `);
    
    await delay(1500);
    
    // ===== STEP 4: Offer Advisor Agent =====
    await runAgentWithReasoning('offer', [
        'Not just recommend a bundle',
        '→ Recommend WHO + WHAT + WHEN + HOW',
        'Match offer intensity to segment price sensitivity',
        'Design entry points for cautious segments'
    ], `
        <table class="data-table">
            <tr>
                <th>Segment</th>
                <th>Recommended Bundle</th>
                <th>Strategy</th>
            </tr>
            <tr>
                <td><strong>Night Streamers</strong></td>
                <td>Entertainment Lite Pack</td>
                <td>Entry upgrade</td>
            </tr>
            <tr>
                <td><strong>Family Sharers</strong></td>
                <td>Premium Family Pack</td>
                <td>Value expansion</td>
            </tr>
            <tr>
                <td><strong>Sports Spikers</strong></td>
                <td>Event Pass</td>
                <td>Occasion-based offer</td>
            </tr>
        </table>
    `);
    
    await delay(1500);
    
    // ===== STEP 5: Channel Explorer Agent =====
    await runAgentWithReasoning('channel', [
        'Find moment of highest receptivity',
        'Match channel to segment behavior patterns',
        'Optimize timing for maximum conversion probability'
    ], `
        <table class="data-table">
            <tr>
                <th>Segment</th>
                <th>Best Channel</th>
                <th>Best Moment</th>
            </tr>
            <tr>
                <td><strong>Night Streamers</strong></td>
                <td>In-app banner</td>
                <td>During buffering event</td>
            </tr>
            <tr>
                <td><strong>Family Sharers</strong></td>
                <td>Email + App</td>
                <td>Billing cycle day 2</td>
            </tr>
            <tr>
                <td><strong>Sports Spikers</strong></td>
                <td>Push notification</td>
                <td>2 hrs before match</td>
            </tr>
        </table>
    `);
    
    await delay(1500);
    
    // ===== STEP 6: Campaign Design Agent =====
    await runAgentWithReasoning('campaign', [
        'Construct contextual persuasion rather than generic promotion',
        'Personalize message based on observed behavior',
        'Create urgency through relevance, not pressure'
    ], `
        <p><strong>The campaign message has been generated.</strong></p>
    `);
    
    await delay(1500);
    
    // ===== STEP 7: Outcome Optimisation Agent =====
    await runAgentWithReasoning('prediction', [
        'Simulate before execution',
        'Calculate expected lift across all segments',
        'Validate projected churn stays within safe threshold',
        'Generate confidence score for deployment'
    ], `
        <p><strong>Projected impact:</strong></p>
        <table class="data-table impact-table">
            <tr>
                <th>Metric</th>
                <th>Expected Change</th>
            </tr>
            <tr>
                <td>Bundle Adoption</td>
                <td><span class="tag green">+18%</span></td>
            </tr>
            <tr>
                <td>ARPU</td>
                <td><span class="tag green">+6.4%</span></td>
            </tr>
            <tr>
                <td>Churn</td>
                <td><span class="tag yellow">+0.2%</span> <small>(within safe threshold)</small></td>
            </tr>
        </table>
    `);
    
    await delay(1500);
    
    // ===== FINAL SUMMARY =====
    showTyping();
    await delay(1500);
    
    addAssistantMessage(`
        <p>I discovered <strong>three cross-sellable subscriber cohorts</strong> and designed targeted interventions.</p>
        <p>The campaign is predicted to increase bundle adoption by <strong>18%</strong> with safe churn levels.</p>
        <p>Would you like me to <strong>design</strong>, <strong>review creatives</strong>, or <strong>refine targeting</strong>?</p>
        <div class="msg-actions">
            <button class="action-btn primary" onclick="handleAction('design')">🎨 Design</button>
            <button class="action-btn secondary" onclick="handleAction('review')">📋 Show Campaign Details</button>
            <button class="action-btn secondary" onclick="handleAction('refine')">🎯 Refine Targeting</button>
        </div>
    `);
    
    state.phase = 'complete';
    completeMasterAgent();
}

// ============ RUN SINGLE AGENT WITH REASONING ============
async function runAgentWithReasoning(agentId, reasoningSteps, rightPanelOutput) {
    const agentItem = document.querySelector(`.agent-item[data-agent="${agentId}"]`);
    if (!agentItem) return;
    
    const statusIndicator = agentItem.querySelector('.agent-status-indicator');
    const toggle = agentItem.querySelector('.agent-toggle');
    const reasoningDiv = agentItem.querySelector('.agent-reasoning');
    
    // Show the agent (remove hidden class)
    agentItem.classList.remove('hidden');
    
    // Activate agent
    agentItem.classList.add('active');
    statusIndicator.textContent = '⟳';
    statusIndicator.classList.add('spinning');
    
    // Expand reasoning
    toggle.textContent = '▼';
    reasoningDiv.classList.add('expanded');
    reasoningDiv.innerHTML = '';
    
    // Type out reasoning steps one by one
    for (const step of reasoningSteps) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'reasoning-step';
        
        if (step.startsWith('•') || step.startsWith('→')) {
            stepDiv.className = 'reasoning-step sub';
        }
        
        stepDiv.innerHTML = `<span class="reasoning-text"></span>`;
        reasoningDiv.appendChild(stepDiv);
        
        const textEl = stepDiv.querySelector('.reasoning-text');
        for (let i = 0; i < step.length; i++) {
            textEl.textContent += step[i];
            await delay(15);
        }
        await delay(200);
    }
    
    // Mark agent as complete
    await delay(500);
    agentItem.classList.remove('active');
    agentItem.classList.add('completed');
    statusIndicator.textContent = '✓';
    statusIndicator.classList.remove('spinning');
    
    // Collapse reasoning (user can expand later by clicking)
    toggle.textContent = '▶';
    reasoningDiv.classList.remove('expanded');
    
    // Show right panel output if provided
    if (rightPanelOutput) {
        showTyping();
        await delay(1000);
        addAssistantMessage(rightPanelOutput);
    }
}

// ============ TOGGLE REASONING VISIBILITY ============
function toggleReasoning(agentId) {
    const agentItem = document.querySelector(`.agent-item[data-agent="${agentId}"]`);
    if (!agentItem) return;
    
    const toggle = agentItem.querySelector('.agent-toggle');
    const reasoningDiv = agentItem.querySelector('.agent-reasoning');
    
    // Only toggle if agent has been invoked (has reasoning content)
    if (reasoningDiv.innerHTML.trim() === '') return;
    
    if (reasoningDiv.classList.contains('expanded')) {
        reasoningDiv.classList.remove('expanded');
        toggle.textContent = '▶';
    } else {
        reasoningDiv.classList.add('expanded');
        toggle.textContent = '▼';
    }
}

// ============ CAMPAIGN BLUEPRINT ============
async function showCampaignBlueprint() {
    showTyping();
    await delay(1500);
    
    addAssistantMessage(`
        <div class="campaign-blueprint">
            <h3>📋 Campaign Blueprint</h3>
            
            <div class="blueprint-section">
                <h4>🎯 Target Segments</h4>
                <ul>
                    <li>Night Streamers (45K subscribers)</li>
                    <li>Family Sharers (32K subscribers)</li>
                    <li>Sports Event Spikers (28K subscribers)</li>
                </ul>
            </div>
            
            <div class="blueprint-section">
                <h4>🎁 Recommended Bundles</h4>
                <ul>
                    <li>Entertainment Lite Pack → Night Streamers</li>
                    <li>Premium Family Pack → Family Sharers</li>
                    <li>Event Pass → Sports Spikers</li>
                </ul>
            </div>
            
            <div class="blueprint-section">
                <h4>💰 Pricing Strategy</h4>
                <ul>
                    <li>Entry pricing for price-sensitive Night Streamers</li>
                    <li>Value bundling for high-headroom Family Sharers</li>
                    <li>Occasion-based pricing for Sports Spikers</li>
                </ul>
            </div>
            
            <div class="blueprint-section">
                <h4>📱 Channel Plan</h4>
                <ul>
                    <li>In-app banners during buffering</li>
                    <li>Email + App on billing day 2</li>
                    <li>Push notifications 2hrs before matches</li>
                </ul>
            </div>
            
            <div class="blueprint-section">
                <h4>✉️ Messaging Creatives</h4>
                <div class="sample-message small">
                    "You watched 18 hours of entertainment this week. Upgrade to the Entertainment Pack and stream without limits tonight."
                </div>
            </div>
            
            <div class="blueprint-section">
                <h4>📊 Expected Impact</h4>
                <ul>
                    <li>Bundle Adoption: <strong>+18%</strong></li>
                    <li>ARPU: <strong>+6.4%</strong></li>
                    <li>Churn: <strong>+0.2%</strong> (safe)</li>
                </ul>
            </div>
            
            <div class="blueprint-section">
                <h4>⚠️ Risk Guardrails</h4>
                <ul>
                    <li>Max 3 contacts per subscriber per week</li>
                    <li>Exclude recent complainers (NPS < 6)</li>
                    <li>Budget cap per segment</li>
                    <li>Auto-pause if churn exceeds +0.5%</li>
                </ul>
            </div>
            
            <div class="blueprint-footer">
                <div class="readiness-score">
                    <span class="label">Execution Readiness Score:</span>
                    <span class="score">92%</span>
                </div>
            </div>
        </div>
        
        <div class="msg-actions">
            <button class="action-btn primary" onclick="handleAction('design')">🎨 Design Campaign</button>
            <button class="action-btn secondary" onclick="handleAction('refine')">🎯 Refine Targeting</button>
        </div>
    `);
}

// ============ ACTION HANDLERS ============
async function handleAction(action) {
    if (action === 'design') {
        addUserMessage('Design the campaign');
        showTyping();
        await delay(1500);
        
        addAssistantMessage(`
            <p><strong>Campaign Canvas:</strong></p>
            <div class="campaign-canvas clickable" onclick="activateCampaign()">
                <img src="/static/assets/campaign_canvas.png" alt="Campaign Canvas">
                <div class="canvas-hint">Click on Activate button to launch campaign</div>
            </div>
        `);
        
    } else if (action === 'review') {
        addUserMessage('Show me the campaign details');
        await showCampaignBlueprint();
        
    } else if (action === 'refine') {
        addUserMessage('I want to refine the targeting');
        showTyping();
        await delay(1000);
        
        addAssistantMessage(`
            <p>What would you like to adjust?</p>
            <div class="msg-actions">
                <button class="action-btn secondary" onclick="sendMsg('Focus only on Family Sharers - highest headroom')">👨‍👩‍👧 Focus on Family Sharers</button>
                <button class="action-btn secondary" onclick="sendMsg('Exclude Sports Spikers - too risky')">🛡️ Exclude High Risk</button>
                <button class="action-btn secondary" onclick="sendMsg('Increase discount for Night Streamers')">💰 Adjust Pricing</button>
            </div>
        `);
    }
}

async function handleFollowUp(text) {
    showTyping();
    await delay(1500);
    
    addAssistantMessage(`
        <p>Understood. I'll adjust the campaign based on your feedback and re-optimize.</p>
        <p>Would you like me to show the updated blueprint or proceed to design?</p>
        <div class="msg-actions">
            <button class="action-btn primary" onclick="handleAction('design')">🎨 Design Updated Campaign</button>
            <button class="action-btn secondary" onclick="handleAction('review')">📋 Review Updated Blueprint</button>
        </div>
    `);
}

// ============ ACTIVATE CAMPAIGN ============
async function activateCampaign() {
    addUserMessage('Activate the campaign');
    showTyping();
    await delay(2000);
    
    addAssistantMessage(`
        <div class="activation-success">
            <div class="activation-icon">🚀</div>
            <div class="activation-content">
                <h3>Campaign Activated Successfully!</h3>
                <p>Your cross-sell campaign for <strong>Content Bundle Packs</strong> is now live and targeting postpaid subscribers.</p>
                
                <div class="activation-details">
                    <div class="detail-row">
                        <span class="detail-icon">✅</span>
                        <span>Campaign ID: <strong>CSL_CNT_2024_0287</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">✅</span>
                        <span>Target Segments: <strong>3 segments (105K subscribers)</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">✅</span>
                        <span>Status: <strong style="color: #10b981;">Live</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">⏱️</span>
                        <span>First messages will be sent within <strong>15 minutes</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-icon">📊</span>
                        <span>Real-time performance tracking is now <strong>enabled</strong></span>
                    </div>
                </div>
                
                <div class="activation-metrics">
                    <div class="metric">
                        <span class="metric-label">Expected Reach</span>
                        <span class="metric-value">105K</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Conversion Target</span>
                        <span class="metric-value green">18%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Revenue Impact</span>
                        <span class="metric-value orange">₹2.4Cr</span>
                    </div>
                </div>
            </div>
        </div>
    `);
}

// ============ PROACTIVE FLOW ============
async function runProactiveFlow(taskType) {
    activateMasterAgent();
    
    await delay(2000);
    showTyping();
    await delay(2000);
    
    if (taskType === 'retention') {
        addAssistantMessage(`
            <p>I have <strong>proactively analyzed</strong> current churn signals across your customer base.</p>
            
            <div class="findings-box">
                <h4>🚨 Key Findings</h4>
                <ul>
                    <li><strong>32K customers</strong> showing early disengagement signals</li>
                    <li>Engagement dropped <strong>45%</strong> in last 30 days</li>
                    <li>Potential revenue at risk: <strong>₹4.2Cr</strong>/month</li>
                    <li>Churn probability increased <strong>22%</strong> vs last month</li>
                </ul>
            </div>
            
            <p>I recommend launching a targeted retention program. Would you like me to proceed?</p>
            <div class="msg-actions">
                <button class="action-btn secondary" onclick="sendMsg('Show me the affected segments')">📊 Review Segments</button>
                <button class="action-btn primary" onclick="sendMsg('Design the retention program')">🚀 Design Program</button>
            </div>
        `);
    } else if (taskType === 'winback') {
        addAssistantMessage(`
            <p>I have <strong>proactively identified</strong> winback opportunities in your dormant base.</p>
            
            <div class="findings-box">
                <h4>🔄 Winback Opportunity</h4>
                <ul>
                    <li><strong>85K dormant customers</strong> in optimal winback window</li>
                    <li>Average historical ARPU: <strong>₹380</strong></li>
                    <li>Estimated winback success: <strong>28%</strong></li>
                    <li>Revenue recovery potential: <strong>₹3.8Cr</strong></li>
                </ul>
            </div>
            
            <div class="msg-actions">
                <button class="action-btn secondary" onclick="sendMsg('Review dormant segments')">📊 Review Segments</button>
                <button class="action-btn primary" onclick="sendMsg('Design winback campaign')">🚀 Design Campaign</button>
            </div>
        `);
    }
    
    state.phase = 'complete';
    completeMasterAgent();
}

// ============ UI FUNCTIONS ============
function addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `
        <div class="msg-avatar">JD</div>
        <div class="msg-content">
            <div class="msg-bubble">
                <div class="msg-text">${escapeHtml(text)}</div>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function addAssistantMessage(html) {
    removeTyping();
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `
        <div class="msg-avatar">
            <img src="/static/assets/niyax_picture.png" onerror="this.parentElement.textContent='🤖'">
        </div>
        <div class="msg-content">
            <div class="msg-bubble">
                <div class="msg-text">${html}</div>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function showTyping() {
    removeTyping();
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message assistant typing-msg';
    div.innerHTML = `
        <div class="msg-avatar">
            <img src="/static/assets/niyax_picture.png" onerror="this.parentElement.textContent='🤖'">
        </div>
        <div class="msg-content">
            <div class="msg-bubble">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

function removeTyping() {
    document.querySelector('.typing-msg')?.remove();
}

// ============ LEFT PANEL FUNCTIONS ============
function activateMasterAgent() {
    const master = document.getElementById('masterAgent');
    master.querySelector('.agent-status-dot').classList.add('active');
    master.querySelector('.agent-badge').textContent = 'Active';
    master.querySelector('.agent-badge').classList.add('active');
}

function completeMasterAgent() {
    const master = document.getElementById('masterAgent');
    master.querySelector('.agent-status-dot').classList.remove('active');
    master.querySelector('.agent-badge').textContent = 'Complete';
    master.querySelector('.agent-badge').classList.remove('active');
}

// ============ INPUT HANDLING ============
function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    
    addUserMessage(text);
    input.value = '';
    input.style.height = 'auto';
    processUserInput(text);
}

function sendMsg(text) {
    addUserMessage(text);
    processUserInput(text);
}

function resetChat() {
    window.location.href = '/cvm-expert';
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
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

let currentKeyword = "";
let score = 0;
let usedPoems = [];

// Multiplayer variables
let gameMode = 'pve';
let totalPlayers = 1;
let activePlayers = [];
let currentPlayerTurnIdx = 0;
let playerScores = {};

const setupArea = document.getElementById("setup-area");
const gameArea = document.getElementById("game-area");
const startBtn = document.getElementById("start-btn");
const customStartBtn = document.getElementById("custom-start-btn");
const customKeywordInput = document.getElementById("custom-keyword-input");
const keywordDisplay = document.getElementById("current-keyword");
const scoreDisplay = document.getElementById("score");
const pveScoreDisplay = document.getElementById("pve-score-display");
const currentPlayerDisplay = document.getElementById("current-player-display");
const multiplayerScores = document.getElementById("multiplayer-scores");
const inputField = document.getElementById("player-input");
const submitBtn = document.getElementById("submit-btn");
const surrenderBtn = document.getElementById("surrender-btn");
const messageBox = document.getElementById("message-box");
const chatHistory = document.getElementById("chat-history");

const modeRadios = document.querySelectorAll('input[name="game-mode"]');
const pvpSettings = document.getElementById("pvp-settings");
const playerCountInput = document.getElementById("player-count");

const keywords = ["春", "花", "秋", "月", "风", "雪", "夜", "云", "雨", "山", "水", "人"];

// 监听模式切换
modeRadios.forEach(r => {
    r.addEventListener("change", (e) => {
        if (e.target.value === 'pvp') {
            pvpSettings.classList.remove("hidden");
        } else {
            pvpSettings.classList.add("hidden");
        }
    });
});

function startGame(keyword) {
    currentKeyword = keyword;
    keywordDisplay.innerText = currentKeyword;
    
    usedPoems = [];
    chatHistory.innerHTML = "";
    messageBox.innerText = "";
    
    gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    
    if (gameMode === 'pve') {
        score = 0;
        scoreDisplay.innerText = score;
        pveScoreDisplay.classList.remove("hidden");
        currentPlayerDisplay.classList.add("hidden");
        multiplayerScores.classList.add("hidden");
        surrenderBtn.classList.add("hidden");
        
        addSystemMsg(`游戏开始！请说出一句带有【${currentKeyword}】字的诗词。`);
    } else {
        totalPlayers = parseInt(playerCountInput.value) || 2;
        if (totalPlayers < 1) totalPlayers = 1;
        if (totalPlayers > 20) totalPlayers = 20;
        
        activePlayers = [];
        playerScores = {};
        for(let i=1; i<=totalPlayers; i++) {
            activePlayers.push(i);
            playerScores[i] = 0;
        }
        currentPlayerTurnIdx = 0;
        
        pveScoreDisplay.classList.add("hidden");
        currentPlayerDisplay.classList.remove("hidden");
        multiplayerScores.classList.remove("hidden");
        surrenderBtn.classList.remove("hidden");
        
        updatePvpUI();
        
        addSystemMsg(`多人模式游戏开始！由 玩家 ${activePlayers[currentPlayerTurnIdx]} 先开始，请说出一句带有【${currentKeyword}】字的诗词。`);
    }
    
    setupArea.classList.add("hidden");
    gameArea.classList.remove("hidden");
    
    inputField.disabled = false;
    submitBtn.disabled = false;
    if (gameMode === 'pvp') surrenderBtn.disabled = false;
    inputField.focus();
}

// 随机初始化游戏
startBtn.addEventListener("click", () => {
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    startGame(randomKeyword);
});

// 自定义初始化游戏
customStartBtn.addEventListener("click", () => {
    const val = customKeywordInput.value.trim();
    if (!val) {
        alert("请输入一个汉字作为令字！");
        return;
    }
    startGame(val);
});

customKeywordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        customStartBtn.click();
    }
});

function updatePvpUI() {
    if (activePlayers.length > 0) {
        currentPlayerDisplay.innerText = `玩家 ${activePlayers[currentPlayerTurnIdx]}`;
    }
    
    let html = "";
    for(let i=1; i<=totalPlayers; i++) {
        const isEliminated = !activePlayers.includes(i);
        const isActive = (activePlayers.length > 0 && i === activePlayers[currentPlayerTurnIdx]);
        const activeClass = isActive ? "highlight" : "";
        const eliminatedClass = isEliminated ? "eliminated" : "";
        html += `<span class="${activeClass} ${eliminatedClass}">玩家 ${i}: ${playerScores[i]}分</span>`;
    }
    multiplayerScores.innerHTML = html;
}

// 认输逻辑
surrenderBtn.addEventListener("click", () => {
    if (gameMode !== 'pvp') return;
    
    const currentPlayer = activePlayers[currentPlayerTurnIdx];
    addSystemMsg(`玩家 ${currentPlayer} 认输了！被淘汰！`);
    
    activePlayers.splice(currentPlayerTurnIdx, 1);
    
    if (activePlayers.length === 1 && totalPlayers > 1) {
        // 只有一个人剩下
        updatePvpUI();
        addSystemMsg(`游戏结束！玩家 ${activePlayers[0]} 获胜！`);
        showMessage(`游戏结束`);
        finishMultiplayerGame();
    } else if (activePlayers.length === 0) {
        updatePvpUI();
        addSystemMsg(`游戏结束！无人获胜！`);
        showMessage(`游戏结束`);
        finishMultiplayerGame();
    } else {
        if (currentPlayerTurnIdx >= activePlayers.length) {
            currentPlayerTurnIdx = 0;
        }
        updatePvpUI();
        addSystemMsg(`轮到 玩家 ${activePlayers[currentPlayerTurnIdx]} 了！`);
        showMessage("请出句...");
        inputField.focus();
    }
});

function finishMultiplayerGame() {
    inputField.disabled = true;
    submitBtn.disabled = true;
    surrenderBtn.disabled = true;
    
    setTimeout(() => {
        setupArea.classList.remove("hidden");
        gameArea.classList.add("hidden");
    }, 3000);
}

// 提交诗词
submitBtn.addEventListener("click", handlePlayerInput);
inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        handlePlayerInput();
    }
});

async function handlePlayerInput() {
    const input = inputField.value.trim();
    if (!input) return;

    inputField.value = "";
    let prefix = gameMode === 'pvp' ? `[玩家 ${activePlayers[currentPlayerTurnIdx]}] ` : "";
    const playerBubble = addPlayerMsg(prefix + input);

    if (!input.includes(currentKeyword)) {
        showMessage(`这句诗里没有包含【${currentKeyword}】字哦，请重试！`);
        return;
    }

    const cleanInput = input.replace(/[，。？！、\s]/g, "");
    const isAlreadyUsed = usedPoems.some(p => {
        const cleanP = p.replace(/[，。？！、\s]/g, "");
        return cleanP.includes(cleanInput) || cleanInput.includes(cleanP);
    });

    if (isAlreadyUsed) {
        showMessage("这句诗已经被用过了！换一句吧。");
        return;
    }

    // 禁用输入框，避免重复提交
    inputField.disabled = true;
    submitBtn.disabled = true;
    if (gameMode === 'pvp') surrenderBtn.disabled = true;
    showMessage("系统查证中...");

    try {
        const res = await fetch(`/api/poem?action=check&sentence=${encodeURIComponent(input)}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        if (data.exists) {
            handleCorrectInput(input, data.source, playerBubble, true, false);
        } else {
            handleCorrectInput(input, null, playerBubble, false, false);
        }
    } catch (e) {
        console.error("Fetch error:", e);
        handleCorrectInput(input, null, playerBubble, false, true);
    }
}

function handleCorrectInput(input, source, playerBubble, fromDb, fromError) {
    usedPoems.push(input);
    
    let msg = "";
    if (fromDb) {
        msg = `对答如流！加 10 分。`;
        playerBubble.innerHTML += `<br><span class="poem-source">—— ${source || '未知'}</span>`;
    } else if (fromError) {
        msg = "网络连接异常，暂作通过！加 10 分。";
    } else {
        msg = "才疏学浅，数据库里未找到这句诗，算你赢！加 10 分。";
    }
    showMessage(msg);
    
    if (gameMode === 'pve') {
        score += 10;
        scoreDisplay.innerText = score;
        setTimeout(() => {
            computerTurn();
        }, 1500);
    } else {
        // PvP
        const currentPlayer = activePlayers[currentPlayerTurnIdx];
        playerScores[currentPlayer] += 10;
        
        // Next player turn
        currentPlayerTurnIdx = (currentPlayerTurnIdx + 1) % activePlayers.length;
        
        setTimeout(() => {
            updatePvpUI();
            addSystemMsg(`轮到 玩家 ${activePlayers[currentPlayerTurnIdx]} 了！`);
            showMessage("请出句...");
            inputField.disabled = false;
            submitBtn.disabled = false;
            surrenderBtn.disabled = false;
            inputField.focus();
        }, 1500);
    }
}

async function computerTurn() {
    showMessage("电脑思考中...");
    try {
        // 请求边缘函数获取对句
        const usedQuery = usedPoems.join(",");
        const res = await fetch(`/api/poem?action=computer&keyword=${encodeURIComponent(currentKeyword)}&used=${encodeURIComponent(usedQuery)}`);
        const data = await res.json();
        
        if (data.poem) {
            usedPoems.push(data.poem);
            const formattedMsg = `${data.poem}<br><span class="poem-source">—— ${data.source || '未知'}</span>`;
            addSystemMsg(formattedMsg);
            showMessage("轮到你了！");
        } else {
            // 电脑词穷了
            endGame();
            return;
        }
    } catch (e) {
        // 网络错误等情况
        console.error(e);
        endGame();
        return;
    }
    
    inputField.disabled = false;
    submitBtn.disabled = false;
    inputField.focus();
}

function endGame() {
    addSystemMsg("我词穷了，你赢了！");
    showMessage(`恭喜通关！最终得分：${score}`);
    
    setTimeout(() => {
        setupArea.classList.remove("hidden");
        gameArea.classList.add("hidden");
        startBtn.innerText = "再来一局";
        inputField.disabled = false;
        submitBtn.disabled = false;
    }, 3000);
}

function addPlayerMsg(text) {
    const div = document.createElement("div");
    div.className = "chat-bubble player-msg";
    div.innerHTML = highlightKeyword(text);
    chatHistory.appendChild(div);
    scrollToBottom();
    return div;
}

function addSystemMsg(text) {
    const div = document.createElement("div");
    div.className = "chat-bubble system-msg";
    div.innerHTML = highlightKeyword(text);
    chatHistory.appendChild(div);
    scrollToBottom();
}

function highlightKeyword(text) {
    if (!currentKeyword) return text;
    const regex = new RegExp(currentKeyword, "g");
    return text.replace(regex, `<span class="highlight">${currentKeyword}</span>`);
}

function showMessage(msg) {
    messageBox.innerText = msg;
    messageBox.style.opacity = 0;
    setTimeout(() => {
        messageBox.style.opacity = 1;
    }, 50);
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}
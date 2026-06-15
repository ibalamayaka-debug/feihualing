let currentKeyword = "";
let score = 0;
let usedPoems = [];

const setupArea = document.getElementById("setup-area");
const gameArea = document.getElementById("game-area");
const startBtn = document.getElementById("start-btn");
const keywordDisplay = document.getElementById("current-keyword");
const scoreDisplay = document.getElementById("score");
const inputField = document.getElementById("player-input");
const submitBtn = document.getElementById("submit-btn");
const messageBox = document.getElementById("message-box");
const chatHistory = document.getElementById("chat-history");

const keywords = ["春", "花", "秋", "月", "风", "雪", "夜", "云", "云", "雨", "山", "水", "人"];

// 初始化游戏
startBtn.addEventListener("click", () => {
    currentKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    keywordDisplay.innerText = currentKeyword;
    
    score = 0;
    usedPoems = [];
    scoreDisplay.innerText = score;
    chatHistory.innerHTML = "";
    messageBox.innerText = "";
    
    setupArea.classList.add("hidden");
    gameArea.classList.remove("hidden");
    
    inputField.focus();
    
    addSystemMsg(`游戏开始！请说出一句带有【${currentKeyword}】字的诗词。`);
});

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
    const playerBubble = addPlayerMsg(input);

    if (!input.includes(currentKeyword)) {
        showMessage(`这句诗里没有包含【${currentKeyword}】字哦，请重试！`);
        return;
    }

    if (usedPoems.includes(input)) {
        showMessage("这句诗已经被用过了！换一句吧。");
        return;
    }

    // 禁用输入框，避免重复提交
    inputField.disabled = true;
    submitBtn.disabled = true;
    showMessage("系统查证中...");

    try {
        const res = await fetch(`/api/poem?action=check&sentence=${encodeURIComponent(input)}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        if (data.exists) {
            usedPoems.push(input);
            score += 10;
            scoreDisplay.innerText = score;
            showMessage(`对答如流！加 10 分。`);
            playerBubble.innerHTML += `<br><span class="poem-source">—— ${data.source || '未知'}</span>`;
            
            setTimeout(() => {
                computerTurn();
            }, 1500);
        } else {
            showMessage("才疏学浅，数据库里未找到这句诗，算你赢！加 10 分。");
            usedPoems.push(input);
            score += 10;
            scoreDisplay.innerText = score;
            
            setTimeout(() => {
                computerTurn();
            }, 1500);
        }
    } catch (e) {
        console.error("Fetch error:", e);
        showMessage("网络连接异常，暂作通过！加 10 分。");
        usedPoems.push(input);
        score += 10;
        scoreDisplay.innerText = score;
        
        setTimeout(() => {
            computerTurn();
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
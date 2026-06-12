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

// 初始化游戏
startBtn.addEventListener("click", () => {
    // 随机选择一个令字
    currentKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    keywordDisplay.innerText = currentKeyword;
    
    // 重置状态
    score = 0;
    usedPoems = [];
    scoreDisplay.innerText = score;
    chatHistory.innerHTML = "";
    messageBox.innerText = "";
    
    // 切换界面
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

function handlePlayerInput() {
    const input = inputField.value.trim();
    if (!input) return;

    // 清空输入框
    inputField.value = "";
    
    // 显示玩家输入
    addPlayerMsg(input);

    // 验证：是否包含令字
    if (!input.includes(currentKeyword)) {
        showMessage(`这句诗里没有包含【${currentKeyword}】字哦，请重试！`);
        return;
    }

    // 验证：是否使用过
    if (usedPoems.includes(input)) {
        showMessage("这句诗已经被用过了！换一句吧。");
        return;
    }

    // 验证：是否存在于题库 (简单匹配，只要包含即可，实际应用中可以接入API或更完善的正则)
    const matchedPoem = poems.find(p => p.includes(input) || input.includes(p.replace(/[，。？！]/g, '')));
    
    if (matchedPoem) {
        // 答对了
        usedPoems.push(input);
        score += 10;
        scoreDisplay.innerText = score;
        showMessage("对答如流！加 10 分。");
        
        // 延迟一下，系统回答
        setTimeout(() => {
            computerTurn();
        }, 1000);
    } else {
        // 库里没找到
        showMessage("才疏学浅，这句诗没在我的词库里，算你赢！加 10 分。");
        usedPoems.push(input);
        score += 10;
        scoreDisplay.innerText = score;
        
        setTimeout(() => {
            computerTurn();
        }, 1000);
    }
}

function computerTurn() {
    // 查找包含令字且未被使用的诗
    const availablePoems = poems.filter(p => p.includes(currentKeyword) && !usedPoems.includes(p));
    
    if (availablePoems.length > 0) {
        // 随机抽一句
        const randomPoem = availablePoems[Math.floor(Math.random() * availablePoems.length)];
        usedPoems.push(randomPoem);
        addSystemMsg(randomPoem);
        showMessage("轮到你了！");
        inputField.focus();
    } else {
        // 电脑词穷了
        addSystemMsg("我词穷了，你赢了！");
        showMessage(`恭喜通关！最终得分：${score}`);
        inputField.disabled = true;
        submitBtn.disabled = true;
        
        setTimeout(() => {
            setupArea.classList.remove("hidden");
            startBtn.innerText = "再来一局";
            inputField.disabled = false;
            submitBtn.disabled = false;
        }, 3000);
    }
}

function addPlayerMsg(text) {
    const div = document.createElement("div");
    div.className = "chat-bubble player-msg";
    div.innerHTML = highlightKeyword(text);
    chatHistory.appendChild(div);
    scrollToBottom();
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
    // 使用正则全局替换关键字，加上高亮类
    const regex = new RegExp(currentKeyword, "g");
    return text.replace(regex, `<span class="highlight">${currentKeyword}</span>`);
}

function showMessage(msg) {
    messageBox.innerText = msg;
    // 简单动画效果
    messageBox.style.opacity = 0;
    setTimeout(() => {
        messageBox.style.opacity = 1;
    }, 50);
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}
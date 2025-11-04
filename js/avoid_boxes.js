// ========================================
// Avoid Boxes 게임 JavaScript 코드 (테마 기능 포함)
// ========================================

// ========================================
// Canvas 설정
// ========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400; 
canvas.height = 500; 

// ========================================
// 플레이어 설정
// ========================================
let player = {
  x: 180,          
  y: 450,          
  width: 40,       
  height: 20,      
  speed: 5         
};

// 플레이어 초기 위치 저장 (충돌 후 리셋용)
const PLAYER_START_X = player.x;
const PLAYER_START_Y = player.y;

// ========================================
// 게임 상태 관리 변수
// ========================================
let obstacles = [];       
let powerUps = [];      
let gameOver = false; 
let gameStarted = false; // ✨ 이 변수가 false이면 update()가 실행되지 않음
let startTime = Date.now();  
let elapsedTime = 0;      
let frameCount = 0;       
let lives = 3; 
let difficulty = 'Normal'; 

// 아이템 타입 정의
const ITEM_TYPE = {
    INVINCIBILITY: "star",
    BOMB: "bomb",
};

// 테마 관련 변수
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};
let currentTheme = THEMES.LIGHT; 

// 무적 상태 관리 변수
let isInvincible = false;       
const INVINCIBILITY_DURATION = 5000; 
let invincibilityEndTime = 0;      
const POWERUP_SPAWN_FREQUENCY = 1800; 
const BOMB_SPAWN_FREQUENCY = 3600; 
const HIT_INVINCIBILITY_DURATION = 1500; 

// 레이저 관련 변수
let isLaserActive = false;
let laserTime = 0; 
const LASER_WARNING_DURATION = 3000;
const LASER_ACTIVE_DURATION = 5000; // ✨ 레이저 유지 시간 5초 추가 
const LASER_WIDTH = 20;
const LASER_INTERVAL_MS = 20000; // 20초
let laserEndTime = 0; // ✨ 레이저가 사라질 시간을 기록할 변수 추가
let laserXPosition = 0; // 레이저가 발사될 x 좌표

// ========================================
// 난이도별 설정 값 
// ========================================
const DIFFICULTY_SETTINGS = {
    'Easy': { 
        lives: 3, obstacleFrequency: 55, minSpeed: 1.5, maxSpeed: 2.5, itemsEnabled: true
    },
    'Normal': { 
        lives: 3, obstacleFrequency: 47, minSpeed: 2, maxSpeed: 4, itemsEnabled: true
    },
    'Hard': { 
        lives: 3, obstacleFrequency: 39, minSpeed: 3, maxSpeed: 5, itemsEnabled: true
    },
    'Hardcore': { 
        lives: 1, obstacleFrequency: 35, minSpeed: 3, maxSpeed: 5, itemsEnabled: true
    },
    'Hell': { 
        lives: 1, obstacleFrequency: 28, minSpeed: 4, maxSpeed: 6, itemsEnabled: false
    }
};

let currentSettings = DIFFICULTY_SETTINGS.Normal; 

// ========================================
// 키보드 입력 처리 (기존 로직 유지)
// ========================================
let keys = {
  ArrowLeft: false,   
  ArrowRight: false   
};

document.addEventListener("keydown", function(e) {
  if (e.key === "ArrowLeft" || e.key ==="ArrowRight") {
    keys[e.key] = true;
    e.preventDefault();     
  }
    if (e.key === " ") { 
        currentTheme = (currentTheme === THEMES.LIGHT) ? THEMES.DARK : THEMES.LIGHT;
        applyTheme(); 
        e.preventDefault(); 
    }
});

document.addEventListener("keyup", function(e) {
  if (e.key === "ArrowLeft" || e.key ==="ArrowRight") {
    keys[e.key] = false;
    e.preventDefault();
  }
});

function movePlayer() {
  if ( keys.ArrowLeft) {
    player.x -= player.speed;
  }
  if ( keys.ArrowRight) {
    player.x += player.speed;
  }

if (player.x < 0) {
    player.x = 0
}
if ( player.x + player.width > canvas.width) {
  player.x =canvas.width - player.width;
  }
}

// ========================================
// 테마, 그리기, 충돌, 장애물 로직 (기존 로직 유지)
// ========================================
function applyTheme() {
    if (currentTheme === THEMES.DARK) {
        canvas.style.backgroundColor = "#222222"; 
    } else {
        canvas.style.backgroundColor = "#FFFFFF"; 
    }
}

function drawPlayer() {
    if (!isInvincible) {
        if (currentTheme === THEMES.DARK) {
            ctx.fillStyle = "white"; 
        } else {
            ctx.fillStyle = "black"; 
        }
    } else {
        const hue = (frameCount * 5) % 360; 
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; 
    }
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawLaser() {
    // 지옥 모드가 아니거나 레이저가 활성화되지 않았으면 종료
    if (!isLaserActive || difficulty !== 'Hell') return;

    const laserX = laserXPosition; 
    const currentTime = Date.now(); // 현재 시간

    // 1. 레이저 경고 단계 (3초)
    if (laserTime > 0) { 
        // 깜빡이는 경고 영역 (랜덤 위치 사용)
        if (laserTime > LASER_WARNING_DURATION / 2 && (Math.floor(currentTime / 200) % 2 === 0)) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.4)"; 
            ctx.fillRect(laserX, 0, LASER_WIDTH, canvas.height); 
        }
        
        ctx.fillStyle = "red";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LASER ⚠️", canvas.width / 2, canvas.height / 2); 

        // 레이저 카운트다운 업데이트 (경고 시간만 줄어듦)
        laserTime -= 16.67; 
    } 
    
    // 2. 레이저 발사 및 유지 단계 (5초)
    // laserTime이 0 이하이거나, laserEndTime이 현재 시간보다 클 때 유지 (발사 중)
    else if (currentTime < laserEndTime) {
        
        // 실제 레이저 발사 (랜덤 위치 사용)
        ctx.fillStyle = "rgba(255, 0, 0, 1.0)"; 
        ctx.fillRect(laserX, 0, LASER_WIDTH, canvas.height); 

        // 충돌 판정: 레이저가 유지되는 동안 항상 검사
        if (!isInvincible && 
            player.x < laserX + LASER_WIDTH && 
            player.x + player.width > laserX) {
            
            gameOver = true;
            alert(`Game Over! (레이저 충돌) 생존 시간: ${elapsedTime}초`);
        }
    }
    
    // 3. 레이저 유지 시간 초과
    else {
        // 5초 유지 시간이 끝나면 레이저를 비활성화 (화면에서 제거)
        isLaserActive = false;
        laserEndTime = 0; // 다음 발동을 위해 초기화
    }
}

// ========================================
// 레이저 발동 타이머 함수 **[수정]**
// ========================================
function triggerLaser() {
    // 레이저가 이미 활성화되어 있으면 새 레이저를 발동하지 않음
    if (gameOver || difficulty !== 'Hell') return;

    // **🚨 중요 수정: 다음 레이저 발동 전에 현재 레이저를 비활성화 (제거)**
    // 다음 레이저 발동은 1분 뒤에 일어나므로, 캔버스에서 이전 레이저를 지웁니다.
    // 레이저가 캔버스에 영구히 남아있기를 원하신다면, 아래 isLaserActive = false; 를 제거해야 합니다.
    // 하지만 "1분마다 레이저가 떨어진다"는 것은 레이저가 주기적으로 나타난다는 의미로 해석하여,
    // 새 레이저가 발동될 때 이전 레이저를 초기화하고 3초 경고를 시작하도록 로직을 유지합니다.
    
    // 이전 레이저 비활성화 (화면에서 제거)
    isLaserActive = false; 
    
    // 새 레이저 경고 시작
    isLaserActive = true;
    laserTime = LASER_WARNING_DURATION; // 3초 경고 시작
}

function drawTime() {
  elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
  ctx.fillStyle = (currentTheme === THEMES.DARK) ? "#FFFFFF" : "black";      
  ctx.font = "24px Arial";      
  ctx.textAlign = "left";      
  ctx.fillText(`시간: ${elapsedTime}초`, 10, 30);
  
  if (isInvincible) {
    const remainingItemTime = ((invincibilityEndTime - Date.now()) / 1000);
    if (remainingItemTime > 0 && remainingItemTime < INVINCIBILITY_DURATION/1000) {
      ctx.fillStyle = "red"; 
      ctx.fillText(`무적: ${remainingItemTime.toFixed(1)}초`, 10, 60); 
    }
  }
}

function drawLives() {
  ctx.fillStyle = (currentTheme === THEMES.DARK) ? "#FFFFFF" : "black";      
  ctx.font = "24px Arial";      
  ctx.textAlign = "right";      
  const heartString = (lives > 0) ? "🧡".repeat(lives) : "💀";
  ctx.fillText(`목숨: ${heartString} (${difficulty})`, canvas.width - 10, 30);
}

function drawObstacles() { /* ... (생략) ... */
  obstacles.forEach(ob => {
    ctx.fillStyle = ob.color;   
    ctx.fillRect(ob.x, ob.y, ob.width, ob.height);    
    ob.y += ob.speed;    
  });
}
function getRandomColor() { /* ... (생략) ... */
  const r = Math.floor(Math.random() * 156) + 100;
  const g = Math.floor(Math.random() * 156) + 100;
  const b = Math.floor(Math.random() * 156) + 100;
  const average = (r + g + b) / 3;
  const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  if (average < 150 || maxDiff < 50) {
    return getRandomColor();  
  }
  return `rgb(${r}, ${g}, ${b})`;
}
function generateObstacle() {
  const x = Math.random() * (canvas.width - 40);
  const speedRange = currentSettings.maxSpeed - currentSettings.minSpeed;
  const speed = currentSettings.minSpeed + Math.random() * speedRange;
  obstacles.push({   
    x: x, y: 0, width: 40, height: 20,                      
    speed: speed, 
    color: getRandomColor()
  });
}
function triggerLaser() {
    if (gameOver || difficulty !== 'Hell') return;

    // 이전 레이저 비활성화 (혹시 모를 잔여 레이저 제거)
    isLaserActive = false; 
    
    // 레이저의 새로운 랜덤 위치 설정
    laserXPosition = Math.random() * (canvas.width - LASER_WIDTH); 

    // 새 레이저 경고 시작
    isLaserActive = true;
    laserTime = LASER_WARNING_DURATION; // 3초 경고 시작

    // ✨ 레이저 유지 시간 설정: 3초 경고 후 5초 동안 레이저가 유지되도록 시간 예약
    // 경고 시간(3000ms) + 발사 유지 시간(5000ms)을 현재 시간에 더하여 레이저 종료 시간 예약
    laserEndTime = Date.now() + LASER_WARNING_DURATION + LASER_ACTIVE_DURATION;

    console.log(`새 레이저 위치: X=${laserXPosition.toFixed(2)}. 총 8초 후(경고 3초 + 발사 5초) 비활성화.`);
}
function checkCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && 
         rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}
function drawPowerUps() { 
  powerUps.forEach(item => {
        
        // 아이템도 아래로 이동
        item.y += item.speed;

        // 아이템 종류에 따라 다른 색상/모양으로 그립니다.
        if (item.type === ITEM_TYPE.INVINCIBILITY) {
            // 무적 아이템: 금색 별 모양 ⭐
            ctx.fillStyle = "gold"; 
            const centerX = item.x + item.width / 2;
            const centerY = item.y + item.height / 2;
            const outerRadius = item.width / 2;
            const innerRadius = outerRadius / 2;
            const points = 5; // 5개의 꼭지점
            
            // 별 그리기 로직
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / points) * i - (Math.PI / 2); // 0도에서 시작하지 않고 위를 향하도록 보정
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();

        } else if (item.type === ITEM_TYPE.BOMB) {
            // 폭탄 아이템: 검은색 몸체 + 빨간색 심지 💣
            
            // 1. 폭탄 몸체 (검은색 원)
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 2. 심지 (빨간색)
            ctx.fillStyle = "red"; 
            ctx.fillRect(item.x + item.width / 2 - 2, item.y - 5, 4, 5);
        }
    });
 }
function generatePowerUp(type) { 
    const x = Math.random() * (canvas.width - 20); // 크기 20 가정
    // 아이템은 장애물보다 조금 느리게 떨어지도록 속도 설정
    const speedRange = currentSettings.maxSpeed - currentSettings.minSpeed;
    const speed = (currentSettings.minSpeed + Math.random() * speedRange) * 0.7; 

    powerUps.push({
        x: x, 
        y: 0, 
        width: 20, // 아이템 크기
        height: 20, 
        speed: speed, 
        type: type // 아이템 타입: "star" 또는 "bomb"
    });
}
function checkInvincibility() {
    // 무적 상태이고, 무적 종료 시간이 현재 시간을 지났다면 (즉, 무적 시간이 만료되었다면)
    if (isInvincible && Date.now() > invincibilityEndTime) {
        isInvincible = false; // ✨ 무적 상태 해제!
        invincibilityEndTime = 0; // 초기화
        console.log("무적 상태 해제됨.");
    }
}


// ========================================
// 난이도 설정 및 게임 시작 함수 **[수정]**
// ========================================
function setDifficultyAndStart() {
    let validDifficulties = Object.keys(DIFFICULTY_SETTINGS);
    let difficultyPrompt = "난이도를 선택하세요: " + validDifficulties.join(", ");
    
    // 1. prompt로 난이도 입력받기
    let selectedDifficulty = prompt(difficultyPrompt, "Normal");

    // 2. 입력 취소 또는 null/빈 문자열 처리
    if (selectedDifficulty === null || selectedDifficulty.trim() === '') {
        alert("난이도 선택이 취소되었습니다. 게임을 시작할 수 없습니다.");
        return; // 게임 시작하지 않고 함수 종료
    }

    // 3. 입력값 표준화 및 유효성 검사
    selectedDifficulty = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1).toLowerCase();
    
    if (!DIFFICULTY_SETTINGS[selectedDifficulty]) {
        selectedDifficulty = 'Normal';
        alert("잘못된 난이도입니다. 'Normal' 모드로 시작합니다.");
    }

    // 4. 난이도 설정 적용
    difficulty = selectedDifficulty;
    currentSettings = DIFFICULTY_SETTINGS[difficulty];
    lives = currentSettings.lives; // 난이도에 따라 목숨 초기화

    // 5. 레이저 발동 타이머 설정 (지옥 모드일 경우)
    if (difficulty === 'Hell') {
        setInterval(triggerLaser, LASER_INTERVAL_MS);
    }

    // 6. 게임 시작 상태로 변경 및 루프 시작 **(핵심 수정)**
    gameStarted = true;
    startTime = Date.now();
    applyTheme(); // 초기 테마 적용 (캔버스 배경)
    update(); // 🚀 게임 루프 시작!
    
    console.log(`게임 시작! 난이도: ${difficulty}, 목숨: ${lives}`);
}


// ========================================
// 게임 메인 루프 (업데이트 함수) **[수정]**
// ========================================
function update() {
  // gameStarted가 true일 때만 실행
  if (gameOver || !gameStarted) return;  

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  checkInvincibility();
  movePlayer();

  drawPlayer();      
  drawObstacles();   
  
  // 난이도에 따라 아이템 활성화/비활성화
  if (currentSettings.itemsEnabled) {
    drawPowerUps();    
  } else {
    powerUps = [];
  }

  drawTime();        
  drawLives(); 
    
  // 지옥 모드에서 레이저 그리기/충돌 검사
  if (difficulty === 'Hell') {
      drawLaser();
  }

  // 아이템 획득 확인 (아이템 활성화 모드에서만)
  if (currentSettings.itemsEnabled) {
    for (let i = 0; i < powerUps.length; i++) {
        const item = powerUps[i];
        if (checkCollision(player, item)) {
            if (item.type === ITEM_TYPE.INVINCIBILITY) {
                isInvincible = true;
                invincibilityEndTime = Date.now() + INVINCIBILITY_DURATION;
            } else if (item.type === ITEM_TYPE.BOMB) {
                obstacles = []; 
            }
            powerUps.splice(i, 1);  
            i--; 
        }
    }
  }

  // 장애물 충돌 확인 
  if (!isInvincible) {
    for (let ob of obstacles) {
      if (checkCollision(player, ob)) {
        
        lives--;
        
        if (lives <= 0) {
          gameOver = true;  
          alert(`Game Over! 생존 시간: ${elapsedTime}초`);  
          return;  
        }
        
        obstacles = obstacles.filter(item => item !== ob); 
        player.x = PLAYER_START_X;
        player.y = PLAYER_START_Y;
        isInvincible = true;
        invincibilityEndTime = Date.now() + HIT_INVINCIBILITY_DURATION;
        break; 
      }
    }
  }
  
  obstacles = obstacles.filter(ob => ob.y < canvas.height);
  powerUps = powerUps.filter(item => item.y < canvas.height);

  frameCount++;

  // 새로운 장애물 생성 
  if (frameCount % currentSettings.obstacleFrequency === 0) generateObstacle();
  
  // 아이템 생성 (난이도에 따라 활성화)
  if (currentSettings.itemsEnabled) {
      if (frameCount % POWERUP_SPAWN_FREQUENCY === 0) generatePowerUp(ITEM_TYPE.INVINCIBILITY);
      if (frameCount % BOMB_SPAWN_FREQUENCY === 0) generatePowerUp(ITEM_TYPE.BOMB);
  }

  requestAnimationFrame(update);
}

// ========================================
// 게임 시작!
// ========================================
setDifficultyAndStart();
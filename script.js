// 전역 변수
const ACCOUNT_COUNT = 6; // 계정 수를 6개로 확장
let accounts = {};
let volumeLevel = 50; // 기본 볼륨 레벨 (%)
const alertSound = document.getElementById('alert-sound');

// 초기화 함수
function initializeApp() {
    // 볼륨 컨트롤 초기화
    const volumeControl = document.getElementById('volume-control');
    const volumeValue = document.getElementById('volume-value');
    
    volumeControl.addEventListener('input', function() {
        volumeLevel = this.value;
        volumeValue.textContent = `${volumeLevel}%`;
        alertSound.volume = volumeLevel / 100;
    });
    
    // 초기 볼륨 설정
    alertSound.volume = volumeLevel / 100;
    
    // 각 계정 초기화
    for (let i = 1; i <= ACCOUNT_COUNT; i++) {
        initializeAccount(i);
    }
    
    // 로그 추가
    addLogEntry('시스템 시작');
    addLogEntry('정확한 시간 측정을 위해 performance.now() API를 사용합니다.');
}

// 계정 초기화 함수
function initializeAccount(accountNumber) {
    const accountId = `account${accountNumber}`;
    
    // 계정 객체 생성
    accounts[accountId] = {
        isRunning: false,
        startTime: 0,
        totalTime: 0,
        sessionTime: 0,
        goalTime: parseInt(document.getElementById(`${accountId}-goal-time`).value) * 60 * 60 * 1000, // 시간 -> 밀리초
        intervalTime: parseInt(document.getElementById(`${accountId}-interval-time`).value) * 60 * 1000, // 분 -> 밀리초
        restTime: parseInt(document.getElementById(`${accountId}-rest-time`).value) * 60 * 1000, // 분 -> 밀리초
        nextRestTime: parseInt(document.getElementById(`${accountId}-interval-time`).value) * 60 * 1000, // 분 -> 밀리초
        isResting: false,
        restStartTime: 0,
        restElapsedTime: 0,
        timerId: null,
        restTimerId: null
    };
    
    // 목표 시간 입력 이벤트 리스너
    document.getElementById(`${accountId}-goal-time`).addEventListener('change', function() {
        const goalHours = parseInt(this.value);
        accounts[accountId].goalTime = goalHours * 60 * 60 * 1000; // 시간 -> 밀리초
        document.getElementById(`${accountId}-goal-display`).textContent = goalHours;
        document.getElementById(`${accountId}-remaining`).textContent = formatTime(accounts[accountId].goalTime - accounts[accountId].totalTime);
        updateProgressBar(accountId);
    });
    
    // 휴식 알림 간격 입력 이벤트 리스너
    document.getElementById(`${accountId}-interval-time`).addEventListener('change', function() {
        const intervalMinutes = parseInt(this.value);
        accounts[accountId].intervalTime = intervalMinutes * 60 * 1000; // 분 -> 밀리초
        if (!accounts[accountId].isRunning) {
            accounts[accountId].nextRestTime = accounts[accountId].intervalTime;
            document.getElementById(`${accountId}-next-rest`).textContent = formatTime(accounts[accountId].nextRestTime);
        }
    });
    
    // 휴식 시간 입력 이벤트 리스너
    document.getElementById(`${accountId}-rest-time`).addEventListener('change', function() {
        const restMinutes = parseInt(this.value);
        accounts[accountId].restTime = restMinutes * 60 * 1000; // 분 -> 밀리초
    });
    
    // 시작 버튼 이벤트 리스너
    document.getElementById(`${accountId}-start`).addEventListener('click', function() {
        startTimer(accountId);
    });
    
    // 종료 버튼 이벤트 리스너
    document.getElementById(`${accountId}-stop`).addEventListener('click', function() {
        stopTimer(accountId);
    });
    
    // 초기화 버튼 이벤트 리스너
    document.getElementById(`${accountId}-reset`).addEventListener('click', function() {
        resetTimer(accountId);
    });
    
    // 알림 확인 버튼 이벤트 리스너
    document.getElementById('notification-close').addEventListener('click', function() {
        document.getElementById('notification').style.display = 'none';
        alertSound.pause();
        alertSound.currentTime = 0;
    });
    
    // 초기 표시 업데이트
    document.getElementById(`${accountId}-goal-display`).textContent = accounts[accountId].goalTime / (60 * 60 * 1000);
    document.getElementById(`${accountId}-total`).textContent = formatTime(accounts[accountId].totalTime);
    document.getElementById(`${accountId}-remaining`).textContent = formatTime(accounts[accountId].goalTime);
    document.getElementById(`${accountId}-session`).textContent = formatTime(accounts[accountId].sessionTime);
    document.getElementById(`${accountId}-next-rest`).textContent = formatTime(accounts[accountId].nextRestTime);
}

// 타이머 시작 함수
function startTimer(accountId) {
    if (accounts[accountId].isResting) {
        return;
    }
    
    if (!accounts[accountId].isRunning) {
        accounts[accountId].isRunning = true;
        accounts[accountId].startTime = performance.now() - accounts[accountId].sessionTime;
        
        // 버튼 상태 업데이트
        document.getElementById(`${accountId}-start`).disabled = true;
        document.getElementById(`${accountId}-stop`).disabled = false;
        
        // 상태 업데이트
        document.getElementById(`${accountId}-status`).textContent = '실행 중';
        
        // 타이머 시작
        accounts[accountId].timerId = setInterval(function() {
            updateTimer(accountId);
        }, 1000);
        
        // 로그 추가
        addLogEntry(`${accountId.replace('account', '')}번 계정 타이머 시작`);
    }
}

// 타이머 업데이트 함수
function updateTimer(accountId) {
    const now = performance.now();
    const elapsed = now - accounts[accountId].startTime;
    
    accounts[accountId].sessionTime = elapsed;
    accounts[accountId].totalTime += 1000; // 1초씩 증가
    accounts[accountId].nextRestTime -= 1000; // 1초씩 감소
    
    // 화면 업데이트
    document.getElementById(`${accountId}-total`).textContent = formatTime(accounts[accountId].totalTime);
    document.getElementById(`${accountId}-remaining`).textContent = formatTime(Math.max(0, accounts[accountId].goalTime - accounts[accountId].totalTime));
    document.getElementById(`${accountId}-session`).textContent = formatTime(accounts[accountId].sessionTime);
    document.getElementById(`${accountId}-next-rest`).textContent = formatTime(Math.max(0, accounts[accountId].nextRestTime));
    
    // 진행 상태 업데이트
    updateProgressBar(accountId);
    
    // 휴식 시간 체크
    if (accounts[accountId].nextRestTime <= 0) {
        startRest(accountId);
    }
    
    // 목표 달성 체크
    if (accounts[accountId].totalTime >= accounts[accountId].goalTime) {
        showNotification(`${accountId.replace('account', '')}번 계정의 목표 시간에 도달했습니다!`);
        stopTimer(accountId);
    }
}

// 진행 상태 업데이트 함수
function updateProgressBar(accountId) {
    const progress = Math.min(100, (accounts[accountId].totalTime / accounts[accountId].goalTime) * 100);
    document.getElementById(`${accountId}-progress`).style.width = `${progress}%`;
}

// 타이머 정지 함수
function stopTimer(accountId) {
    if (accounts[accountId].isRunning) {
        accounts[accountId].isRunning = false;
        clearInterval(accounts[accountId].timerId);
        
        // 버튼 상태 업데이트
        document.getElementById(`${accountId}-start`).disabled = false;
        document.getElementById(`${accountId}-stop`).disabled = true;
        
        // 상태 업데이트
        document.getElementById(`${accountId}-status`).textContent = '대기 중';
        
        // 로그 추가
        addLogEntry(`${accountId.replace('account', '')}번 계정 타이머 정지 (총 ${formatTime(accounts[accountId].totalTime)})`);
    }
}

// 타이머 초기화 함수
function resetTimer(accountId) {
    stopTimer(accountId);
    
    accounts[accountId].totalTime = 0;
    accounts[accountId].sessionTime = 0;
    accounts[accountId].nextRestTime = accounts[accountId].intervalTime;
    
    // 화면 업데이트
    document.getElementById(`${accountId}-total`).textContent = formatTime(accounts[accountId].totalTime);
    document.getElementById(`${accountId}-remaining`).textContent = formatTime(accounts[accountId].goalTime);
    document.getElementById(`${accountId}-session`).textContent = formatTime(accounts[accountId].sessionTime);
    document.getElementById(`${accountId}-next-rest`).textContent = formatTime(accounts[accountId].nextRestTime);
    
    // 진행 상태 업데이트
    document.getElementById(`${accountId}-progress`).style.width = '0%';
    
    // 휴식 타이머 숨기기
    document.getElementById(`${accountId}-rest-timer`).style.display = 'none';
    
    // 로그 추가
    addLogEntry(`${accountId.replace('account', '')}번 계정 타이머 초기화`);
}

// 휴식 시작 함수
function startRest(accountId) {
    if (accounts[accountId].isResting) {
        return;
    }
    
    stopTimer(accountId);
    
    accounts[accountId].isResting = true;
    accounts[accountId].restStartTime = performance.now();
    accounts[accountId].restElapsedTime = 0;
    
    // 휴식 타이머 표시
    document.getElementById(`${accountId}-rest-timer`).style.display = 'block';
    document.getElementById(`${accountId}-rest-remaining`).textContent = formatTime(accounts[accountId].restTime);
    document.getElementById(`${accountId}-rest-progress`).style.width = '0%';
    
    // 상태 업데이트
    document.getElementById(`${accountId}-status`).textContent = '휴식 중';
    
    // 알림 표시
    showNotification(`${accountId.replace('account', '')}번 계정의 휴식 시간입니다!`);
    
    // 휴식 타이머 시작
    accounts[accountId].restTimerId = setInterval(function() {
        updateRestTimer(accountId);
    }, 1000);
    
    // 로그 추가
    addLogEntry(`${accountId.replace('account', '')}번 계정 휴식 시작 (${formatTime(accounts[accountId].restTime)})`);
}

// 휴식 타이머 업데이트 함수
function updateRestTimer(accountId) {
    const now = performance.now();
    const elapsed = now - accounts[accountId].restStartTime;
    
    accounts[accountId].restElapsedTime = elapsed;
    const remaining = Math.max(0, accounts[accountId].restTime - accounts[accountId].restElapsedTime);
    
    // 화면 업데이트
    document.getElementById(`${accountId}-rest-remaining`).textContent = formatTime(remaining);
    
    // 진행 상태 업데이트
    const progress = Math.min(100, (accounts[accountId].restElapsedTime / accounts[accountId].restTime) * 100);
    document.getElementById(`${accountId}-rest-progress`).style.width = `${progress}%`;
    
    // 휴식 종료 체크
    if (remaining <= 0) {
        endRest(accountId);
    }
}

// 휴식 종료 함수
function endRest(accountId) {
    if (!accounts[accountId].isResting) {
        return;
    }
    
    accounts[accountId].isResting = false;
    clearInterval(accounts[accountId].restTimerId);
    
    // 휴식 타이머 숨기기
    document.getElementById(`${accountId}-rest-timer`).style.display = 'none';
    
    // 다음 휴식 시간 초기화
    accounts[accountId].nextRestTime = accounts[accountId].intervalTime;
    document.getElementById(`${accountId}-next-rest`).textContent = formatTime(accounts[accountId].nextRestTime);
    
    // 상태 업데이트
    document.getElementById(`${accountId}-status`).textContent = '대기 중';
    
    // 알림 표시
    showNotification(`${accountId.replace('account', '')}번 계정의 휴식 시간이 종료되었습니다!`);
    
    // 로그 추가
    addLogEntry(`${accountId.replace('account', '')}번 계정 휴식 종료`);
}

// 알림 표시 함수
function showNotification(message) {
    document.getElementById('notification-message').textContent = message;
    document.getElementById('notification').style.display = 'flex';
    
    // 알림 소리 재생 (3초 동안)
    alertSound.currentTime = 0;
    alertSound.play();
    
    // 3초 후 소리 중지
    setTimeout(() => {
        alertSound.pause();
        alertSound.currentTime = 0;
    }, 3000);
}

// 시간 포맷 함수 (밀리초 -> HH:MM:SS)
function formatTime(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    
    seconds %= 60;
    minutes %= 60;
    
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// 숫자 앞에 0 추가 함수
function padZero(number) {
    return number.toString().padStart(2, '0');
}

// 로그 추가 함수
function addLogEntry(message) {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${timeString}] ${message}`;
    
    const logContainer = document.getElementById('log-container');
    logContainer.insertBefore(logEntry, logContainer.firstChild);
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', initializeApp);

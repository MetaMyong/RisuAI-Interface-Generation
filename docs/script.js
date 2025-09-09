// --- 로컬 스토리지 키 정의 ---
const API_KEY_STORAGE_KEY = 'risuai_helper_api_key';
const CHAT_HISTORY_STORAGE_KEY = 'risuai_helper_chat_history';
// 새로 추가될 키
const REGEX_INPUT_STORAGE_KEY = 'risuai_helper_regex_input';
const REPLACE_TEMPLATE_STORAGE_KEY = 'risuai_helper_replace_template';
const SAMPLE_TEXT_STORAGE_KEY = 'risuai_helper_sample_text';

// --- 전역 변수 ---
let chatHistory = [];
let systemPrompt = '';

// --- DOM 요소 가져오기 ---
const processBtn = document.getElementById('process-btn');
const regexIn = document.getElementById('regex-in');
const replaceOut = document.getElementById('replace-out');
const sampleText = document.getElementById('sample-text');
const previewOutput = document.getElementById('preview-output');
const aiGenerateBtn = document.getElementById('ai-generate-btn');
const resetChatBtn = document.getElementById('reset-chat-btn');
const apiKeyInput = document.getElementById('api-key-input');
const aiPrompt = document.getElementById('ai-prompt');
const aiLog = document.getElementById('ai-log');


// --- 함수 정의 ---

// 시스템 프롬프트를 파일에서 불러와 초기 대화 이력 설정
async function initializeChatFromPrompt() {
    try {
        const response = await fetch('Interface.prompt');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        systemPrompt = await response.text();
        chatHistory = [{
            role: 'user',
            parts: [{ text: systemPrompt }]
        }, {
            role: 'model',
            parts: [{ text: "Understood. I will now act as an expert front-end developer and provide the complete package in the specified format." }]
        }];
        console.log("시스템 프롬프트로부터 새 대화 이력을 시작합니다.");
    } catch (error) {
        console.error("시스템 프롬프트 파일(Interface.prompt)을 불러오는 데 실패했습니다:", error);
        aiLog.textContent = "오류: Interface.prompt 파일을 불러올 수 없습니다.";
    }
}

// 페이지 로드 시 로컬 스토리지에서 모든 데이터 불러오기
function loadDataFromStorage() {
    // API 키 불러오기
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    // 대화 이력 불러오기
    const savedChatHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (savedChatHistory) {
        chatHistory = JSON.parse(savedChatHistory);
        aiLog.textContent = "저장된 대화 이력을 불러왔습니다.";
    } else {
        initializeChatFromPrompt();
    }

    // 왼쪽 패널 입력창 3개 데이터 불러오기
    const savedRegex = localStorage.getItem(REGEX_INPUT_STORAGE_KEY);
    const savedReplace = localStorage.getItem(REPLACE_TEMPLATE_STORAGE_KEY);
    const savedSample = localStorage.getItem(SAMPLE_TEXT_STORAGE_KEY);

    if (savedRegex) regexIn.value = savedRegex;
    if (savedReplace) replaceOut.value = savedReplace;
    if (savedSample) sampleText.value = savedSample;

    // *** 중요: 로드된 데이터로 미리보기 자동 생성 ***
    if (regexIn.value && sampleText.value) {
        handlePreviewGeneration();
        console.log("저장된 입력값으로 미리보기를 자동 복원했습니다.");
    }
}

// 정규식 파서 및 미리보기 기능
function handlePreviewGeneration() {
    const regexPattern = regexIn.value;
    const replaceTemplate = replaceOut.value;
    const inputText = sampleText.value;

    if (!regexPattern || !inputText) {
        previewOutput.innerHTML = '<p style="color: #999;">정규식(IN)과 예시 문구를 입력 후 버튼을 눌러주세요.</p>';
        return;
    }

    try {
        const regex = new RegExp(regexPattern, 'g');
        const resultHtml = inputText.replace(regex, replaceTemplate);
        previewOutput.innerHTML = resultHtml;
    } catch (error) {
        previewOutput.textContent = `잘못된 정규식입니다: ${error.message}`;
    }
}

// AI 응답을 파싱하여 각 입력창에 채워넣는 함수
function parseAndPopulate(aiResponse) {
    const regexpPattern = /\[REGEXP\]([\s\S]*?)\[\/REGEXP\]/;
    const samplePattern = /\[SAMPLE\]([\s\S]*?)\[\/SAMPLE\]/;
    const codePattern = /\[CODE\]([\s\S]*?)\[\/CODE\]/;

    const regexpMatch = aiResponse.match(regexpPattern);
    const sampleMatch = aiResponse.match(samplePattern);
    const codeMatch = aiResponse.match(codePattern);

    if (!regexpMatch || !sampleMatch || !codeMatch) {
        throw new Error("AI 응답이 올바른 형식(REGEXP, SAMPLE, CODE)이 아닙니다.");
    }

    regexIn.value = regexpMatch[1].trim();
    sampleText.value = sampleMatch[1].trim();
    replaceOut.value = codeMatch[1].trim();
    
    // AI가 생성한 값들도 즉시 로컬 스토리지에 저장
    localStorage.setItem(REGEX_INPUT_STORAGE_KEY, regexIn.value);
    localStorage.setItem(REPLACE_TEMPLATE_STORAGE_KEY, replaceOut.value);
    localStorage.setItem(SAMPLE_TEXT_STORAGE_KEY, sampleText.value);
}

// AI에게 콘텐츠 생성 요청
async function handleAiGeneration() {
    // (이 함수 내용은 변경 없음)
    const apiKey = apiKeyInput.value;
    const userPrompt = aiPrompt.value;

    if (!apiKey || !userPrompt) {
        aiLog.textContent = 'API 키와 프롬프트를 모두 입력해주세요.';
        return;
    }

    aiLog.textContent = 'AI에게 요청을 전송하고 응답을 기다리는 중...';
    aiGenerateBtn.disabled = true;

    chatHistory.push({ role: 'user', parts: [{ text: userPrompt }] });

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: chatHistory,
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API 요청 실패: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("API로부터 유효한 응답을 받지 못했습니다. 안전 설정에 의해 차단되었을 수 있습니다.");
        }

        const aiResult = data.candidates[0].content.parts[0].text;
        parseAndPopulate(aiResult);
        handlePreviewGeneration();

        aiLog.textContent = "✅ AI가 성공적으로 코드를 생성하고 미리보기를 업데이트했습니다.";

        chatHistory.push({ role: 'model', parts: [{ text: aiResult }] });
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));

    } catch (error) {
        aiLog.textContent = `❌ 오류 발생: ${error.message}`;
        chatHistory.pop();
    } finally {
        aiGenerateBtn.disabled = false;
    }
}


// --- 이벤트 리스너 연결 ---

// 페이지가 완전히 로드되면 저장된 데이터 불러오기
document.addEventListener('DOMContentLoaded', loadDataFromStorage);

// API 키 입력 시 자동으로 로컬 스토리지에 저장
apiKeyInput.addEventListener('input', () => {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.value);
});

// 왼쪽 패널 입력창 3개에 대한 실시간 저장 이벤트 리스너 추가
regexIn.addEventListener('input', () => localStorage.setItem(REGEX_INPUT_STORAGE_KEY, regexIn.value));
replaceOut.addEventListener('input', () => localStorage.setItem(REPLACE_TEMPLATE_STORAGE_KEY, replaceOut.value));
sampleText.addEventListener('input', () => localStorage.setItem(SAMPLE_TEXT_STORAGE_KEY, sampleText.value));

// 버튼 클릭 이벤트
processBtn.addEventListener('click', handlePreviewGeneration);
aiGenerateBtn.addEventListener('click', handleAiGeneration);

resetChatBtn.addEventListener('click', () => {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    initializeChatFromPrompt(); 
    aiLog.textContent = '대화 이력이 초기화되었습니다.';
    aiPrompt.value = '';
});
// --- 전역 변수 및 초기화 ---
let chatHistory = [];
let systemPrompt = '';

// --- DOM 요소 가져오기 ---
// 기능 1 요소
const processBtn = document.getElementById('process-btn');
const regexIn = document.getElementById('regex-in');
const replaceOut = document.getElementById('replace-out');
const sampleText = document.getElementById('sample-text');
const previewOutput = document.getElementById('preview-output');

// 기능 2 요소
const aiGenerateBtn = document.getElementById('ai-generate-btn');
const resetChatBtn = document.getElementById('reset-chat-btn');
const apiKeyInput = document.getElementById('api-key-input');
const aiPrompt = document.getElementById('ai-prompt');
const aiLog = document.getElementById('ai-log'); // ID 변경


// --- 함수 정의 ---

// 시스템 프롬프트를 파일에서 불러와 초기 대화 이력 설정
async function initializeChat() {
    try {
        const response = await fetch('Interface.prompt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        systemPrompt = await response.text();
        
        chatHistory = [{
            role: 'user',
            parts: [{ text: systemPrompt }]
        }, {
            role: 'model',
            parts: [{ text: "Understood. I will now act as an expert front-end developer and provide the complete package in the specified format." }]
        }];
        console.log("시스템 프롬프트 로딩 및 초기화 완료.");
    } catch (error) {
        console.error("시스템 프롬프트 파일(Interface.prompt)을 불러오는 데 실패했습니다:", error);
        aiLog.textContent = "오류: Interface.prompt 파일을 불러올 수 없습니다. 파일이 public 폴더에 있고 서버가 실행 중인지 확인하세요.";
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
    // 각 블록의 내용을 추출하는 정규식
    const regexpPattern = /\[REGEXP\]([\s\S]*?)\[\/REGEXP\]/;
    const samplePattern = /\[SAMPLE\]([\s\S]*?)\[\/SAMPLE\]/;
    const codePattern = /\[CODE\]([\s\S]*?)\[\/CODE\]/;

    const regexpMatch = aiResponse.match(regexpPattern);
    const sampleMatch = aiResponse.match(samplePattern);
    const codeMatch = aiResponse.match(codePattern);

    if (!regexpMatch || !sampleMatch || !codeMatch) {
        throw new Error("AI 응답이 올바른 형식(REGEXP, SAMPLE, CODE)이 아닙니다. 프롬프트를 확인하거나 다시 시도해주세요.");
    }

    // trim()으로 앞뒤 공백 제거
    regexIn.value = regexpMatch[1].trim();
    sampleText.value = sampleMatch[1].trim();
    replaceOut.value = codeMatch[1].trim();
}

// AI에게 콘텐츠 생성 요청
async function handleAiGeneration() {
    const apiKey = apiKeyInput.value;
    const userPrompt = aiPrompt.value;

    if (!apiKey || !userPrompt) {
        aiLog.textContent = 'API 키와 프롬프트를 모두 입력해주세요.';
        return;
    }
    if (!systemPrompt) {
        aiLog.textContent = '시스템 프롬프트가 로드되지 않았습니다. 페이지를 새로고침하거나 콘솔 오류를 확인하세요.';
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

        // AI 응답 파싱 및 입력창 채우기
        parseAndPopulate(aiResult);
        
        // AI가 생성한 내용으로 즉시 미리보기 업데이트
        handlePreviewGeneration();

        aiLog.textContent = "✅ AI가 성공적으로 코드를 생성하고 미리보기를 업데이트했습니다.";

        // 성공한 AI 응답을 대화 이력에 추가
        chatHistory.push({ role: 'model', parts: [{ text: aiResult }] });

    } catch (error) {
        aiLog.textContent = `❌ 오류 발생: ${error.message}`;
        chatHistory.pop(); // 실패한 요청은 이력에서 제거
    } finally {
        aiGenerateBtn.disabled = false;
    }
}


// --- 이벤트 리스너 연결 ---
document.addEventListener('DOMContentLoaded', initializeChat);
processBtn.addEventListener('click', handlePreviewGeneration);
aiGenerateBtn.addEventListener('click', handleAiGeneration);
resetChatBtn.addEventListener('click', () => {
    initializeChat();
    aiLog.textContent = '대화 이력이 초기화되었습니다. 새로운 요청을 시작할 수 있습니다.';
    aiPrompt.value = '';
});
// --- 로컬 스토리지 키 정의 ---
const API_KEY_STORAGE_KEY = 'risuai_helper_api_key';
const CHAT_HISTORY_STORAGE_KEY = 'risuai_helper_chat_history';
const REGEX_INPUT_STORAGE_KEY = 'risuai_helper_regex_input';
const REPLACE_TEMPLATE_STORAGE_KEY = 'risuai_helper_replace_template';
const SAMPLE_TEXT_STORAGE_KEY = 'risuai_helper_sample_text';

// --- 전역 변수 ---
let chatHistory = [];
let systemPrompt = '';
let uploadedImageData = null;
const assetImages = {}; 

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
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const userUploadInput = document.getElementById('user-upload'); 
const charUploadInput = document.getElementById('char-upload');
const assetUploadInput = document.getElementById('asset-upload'); 
const userUploadStatus = document.getElementById('user-upload-status');
const charUploadStatus = document.getElementById('char-upload-status'); 
const assetUploadStatus = document.getElementById('asset-upload-status');


// --- 함수 정의 ---

// 탭 전환 함수
function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active-pane'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
    document.getElementById(tabId).classList.add('active-pane');
    document.querySelector(`.tab-btn[onclick="showTab('${tabId}')"]`).classList.add('active-tab');
}

async function initializeChatFromPrompt() {
    try {
        const response = await fetch('Interface.prompt');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        systemPrompt = await response.text();
        chatHistory = [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: "Understood." }] }];
    } catch (error) {
        aiLog.textContent = `오류: Interface.prompt 파일을 불러올 수 없습니다. ${error.message}`;
    }
}

function loadDataFromStorage() {
    apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    const savedChatHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (savedChatHistory) {
        chatHistory = JSON.parse(savedChatHistory);
        aiLog.textContent = "저장된 대화 이력을 불러왔습니다.";
    } else {
        initializeChatFromPrompt();
    }
    regexIn.value = localStorage.getItem(REGEX_INPUT_STORAGE_KEY) || '';
    replaceOut.value = localStorage.getItem(REPLACE_TEMPLATE_STORAGE_KEY) || '';
    sampleText.value = localStorage.getItem(SAMPLE_TEXT_STORAGE_KEY) || '';
    
    if (regexIn.value && sampleText.value) {
        handlePreviewGeneration();
    }
}

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
        let resultHtml = inputText.replace(regex, replaceTemplate);
        
        resultHtml = resultHtml.replace(/\{\{source::(.*?)\}\}/g, (match, name) => {
            return assetImages[name] || `${name}.png`;
        });
        
        resultHtml = resultHtml.replace(/\{\{raw::(.*?)\}\}/g, (match, filename) => {
            return assetImages['asset'] || filename;
        });

        previewOutput.innerHTML = resultHtml;
    } catch (error) {
        previewOutput.textContent = `잘못된 정규식입니다: ${error.message}`;
    }
}

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
    
    localStorage.setItem(REGEX_INPUT_STORAGE_KEY, regexIn.value);
    localStorage.setItem(REPLACE_TEMPLATE_STORAGE_KEY, replaceOut.value);
    localStorage.setItem(SAMPLE_TEXT_STORAGE_KEY, sampleText.value);
}

async function handleAiGeneration() {
    const apiKey = apiKeyInput.value;
    const userPrompt = aiPrompt.value;
    if (!apiKey || (!userPrompt && !uploadedImageData)) {
        aiLog.textContent = 'API 키를 입력하고, 프롬프트 또는 이미지를 제공해주세요.';
        return;
    }
    aiLog.textContent = 'AI에게 요청을 전송하고 응답을 기다리는 중...';
    aiGenerateBtn.disabled = true;
    
    const userParts = [];
    if (uploadedImageData) userParts.push({ inline_data: { mime_type: uploadedImageData.mimeType, data: uploadedImageData.base64 } });
    if (userPrompt) userParts.push({ text: userPrompt });

    chatHistory.push({ role: 'user', parts: userParts });

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
        const requestBody = { contents: chatHistory, generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } };
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
             throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
        }
        const aiResult = data.candidates[0].content.parts[0].text;
        parseAndPopulate(aiResult);
        handlePreviewGeneration();
        aiLog.textContent = "✅ AI가 성공적으로 코드를 생성하고 미리보기를 업데이트했습니다.";
        chatHistory.push(data.candidates[0].content); 
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (error) {
        aiLog.textContent = `❌ 오류 발생: ${error.message}`;
        chatHistory.pop();
    } finally {
        aiGenerateBtn.disabled = false;
        uploadedImageData = null;
        imagePreview.innerHTML = '';
        imageUpload.value = '';
    }
}

// 예시 이미지 파일 업로드 처리 함수
function handleAssetUpload(event, assetName, statusElement) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
        // assetImages 객체에 Data URL(Base64) 저장
        assetImages[assetName] = reader.result;
        // 사용자에게 피드백 제공
        statusElement.textContent = '✔';
        console.log(`${assetName} 이미지가 업로드되었습니다.`);
    };
    reader.readAsDataURL(file);
}



// --- 이벤트 리스너 연결 ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    showTab('editor-ai-tab');
});

// 실시간 저장 이벤트 리스너
apiKeyInput.addEventListener('input', () => localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.value));
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
    uploadedImageData = null;
    imagePreview.innerHTML = '';
    imageUpload.value = '';
});
userUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'user', userUploadStatus));
charUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'char', charUploadStatus));
assetUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'asset', assetUploadStatus));

// 이미지 업로드 처리
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        uploadedImageData = null;
        imagePreview.innerHTML = '';
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result;
        uploadedImageData = {
            mimeType: file.type,
            base64: base64String.split(',')[1] 
        };
        imagePreview.innerHTML = `<img src="${base64String}" alt="Image preview">`;
    };
    reader.readAsDataURL(file);
});
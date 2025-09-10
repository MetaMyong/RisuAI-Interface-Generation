// =================================================================================
// RisuAI Helper - script.js
// =================================================================================

// ---------------------------------------------------------------------------------
// # 로컬 스토리지 키 (LocalStorage Keys)
// ---------------------------------------------------------------------------------
const API_KEY_STORAGE_KEY = 'risuai_helper_api_key';
const MODEL_STORAGE_KEY = 'risuai_helper_selected_model';
const PREFILL_OPTION_STORAGE_KEY = 'risuai_helper_prefill_option';

// 인터페이스 편집기
const CHAT_HISTORY_STORAGE_KEY = 'risuai_helper_chat_history';
const REGEX_INPUT_STORAGE_KEY = 'risuai_helper_regex_input';
const REPLACE_TEMPLATE_STORAGE_KEY = 'risuai_helper_replace_template';
const SAMPLE_TEXT_STORAGE_KEY = 'risuai_helper_sample_text';

// 캐릭터 시트
const CHARACTER_HISTORY_STORAGE_KEY = 'risuai_helper_character_history';

// 출력 지침 생성기
const LORE_HISTORY_STORAGE_KEY = 'risuai_helper_lore_history';

// 커스터마이징
const CUSTOM_INTERFACE_PROMPT_KEY = 'risuai_custom_interface_prompt';
const CUSTOM_CHARACTER_PROMPT_KEY = 'risuai_custom_character_prompt';
const CUSTOM_LORE_PROMPT_KEY = 'risuai_custom_lore_prompt';

// ---------------------------------------------------------------------------------
// # 전역 변수 (Global Variables)
// ---------------------------------------------------------------------------------
// --- 대화 이력 ---
let interfaceChatHistory = [];
let characterChatHistory = [];
let loreChatHistory = [];
// --- 시스템 프롬프트 캐시 ---
let interfaceSystemPrompt = '';
let characterSystemPrompt = '';
let loreSystemPrompt = '';

let uploadedImageData = null;
const assetImages = {};


// ---------------------------------------------------------------------------------
// # DOM 요소 캐싱 (DOM Element Caching)
// ---------------------------------------------------------------------------------
// --- 공통 및 설정 ---
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const prefillOptionCheckbox = document.getElementById('prefill-option-checkbox');

// --- 탭: 인터페이스 편집기 ---
const processBtn = document.getElementById('process-btn');
const regexIn = document.getElementById('regex-in');
const replaceOut = document.getElementById('replace-out');
const sampleText = document.getElementById('sample-text');
const previewOutput = document.getElementById('preview-output');
const aiPrompt = document.getElementById('ai-prompt');
const aiGenerateBtn = document.getElementById('ai-generate-btn');
const resetChatBtn = document.getElementById('reset-chat-btn');
const aiLog = document.getElementById('ai-log');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const userUploadInput = document.getElementById('user-upload');
const charUploadInput = document.getElementById('char-upload');
const assetUploadInput = document.getElementById('asset-upload');
const userUploadStatus = document.getElementById('user-upload-status');
const charUploadStatus = document.getElementById('char-upload-status');
const assetUploadStatus = document.getElementById('asset-upload-status');
const debugRegexBtn = document.getElementById('debug-regex-btn');
const regexDebugOutput = document.getElementById('regex-debug-output');

// --- 탭: 캐릭터 시트 ---
const characterPrompt = document.getElementById('character-prompt');
const characterGenerateBtn = document.getElementById('character-generate-btn');
const koreanOutputContent = document.getElementById('korean-output-content');
const englishOutputContent = document.getElementById('english-output-content');
const characterResetBtn = document.getElementById('character-reset-btn');
const characterLog = document.getElementById('character-log');

// --- 탭: 출력 지침 생성기 ---
const lorePrompt = document.getElementById('lore-prompt');
const loreGenerateBtn = document.getElementById('lore-generate-btn');
const koreanLoreOutputContent = document.getElementById('korean-lore-output-content');
const englishLoreOutputContent = document.getElementById('english-lore-output-content');
const loreResetBtn = document.getElementById('lore-reset-btn');
const loreLog = document.getElementById('lore-log');

// --- 기타 UI 요소 ---
const versionLink = document.getElementById('version-link');
const changelogModal = document.getElementById('changelog-modal');
const changelogContent = document.getElementById('changelog-content');
const modalCloseBtn = document.querySelector('.modal-close-btn');
const savePromptsBtn = document.getElementById('save-prompts-btn');
const resetPromptsBtn = document.getElementById('reset-prompts-btn');
const interfacePromptEditor = document.getElementById('interface-prompt-editor');
const characterPromptEditor = document.getElementById('character-prompt-editor');
const lorePromptEditor = document.getElementById('lore-prompt-editor');
const promptLog = document.getElementById('prompt-log');


// ---------------------------------------------------------------------------------
// # 초기화 및 데이터 로딩 (Initialization & Data Loading)
// ---------------------------------------------------------------------------------
/**
 * DOM이 로드되면 저장된 데이터를 불러오고 기본 탭을 표시합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
	loadAllPrompts();
    showTab('character-sheet-tab');
});

/**
 * 로컬 스토리지에서 모든 사용자 데이터와 설정을 불러옵니다.
 */
function loadDataFromStorage() {
    apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    modelSelect.value = localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-pro';
    prefillOptionCheckbox.checked = localStorage.getItem(PREFILL_OPTION_STORAGE_KEY) === 'true';

    // 인터페이스 편집기 데이터 로딩
    regexIn.value = localStorage.getItem(REGEX_INPUT_STORAGE_KEY) || '';
    replaceOut.value = localStorage.getItem(REPLACE_TEMPLATE_STORAGE_KEY) || '';
    sampleText.value = localStorage.getItem(SAMPLE_TEXT_STORAGE_KEY) || '';
    
    // 각 기능별 대화 이력 로딩 (시스템 프롬프트는 제외하고 순수 대화만 로드)
    const loadHistory = (key, logElement) => {
        try {
            const savedHistory = localStorage.getItem(key);
            if (savedHistory) {
                const history = JSON.parse(savedHistory);
                if (history.length > 0 && logElement) {
                    logElement.textContent = "저장된 대화 이력을 불러왔습니다.";
                }
                return history;
            }
        } catch (e) {
            console.error(`${key} 대화 이력 파싱 오류:`, e);
        }
        return [];
    };

    interfaceChatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE_KEY) || '[]');
    characterChatHistory = JSON.parse(localStorage.getItem(CHARACTER_HISTORY_STORAGE_KEY) || '[]');
    loreChatHistory = JSON.parse(localStorage.getItem(LORE_HISTORY_STORAGE_KEY) || '[]');
	
	if(interfaceChatHistory.length > 0) aiLog.textContent = "저장된 대화 이력을 불러왔습니다.";
    if(characterChatHistory.length > 0) characterLog.textContent = "저장된 대화 이력을 불러왔습니다.";
    if(loreChatHistory.length > 0) loreLog.textContent = "저장된 대화 이력을 불러왔습니다.";

    if (regexIn.value && sampleText.value) {
        handlePreviewGeneration();
    }
}


// ---------------------------------------------------------------------------------
// # UI 제어 함수 (UI Control Functions)
// ---------------------------------------------------------------------------------
/**
 * 지정된 ID의 탭을 활성화합니다.
 * @param {string} tabId - 활성화할 탭의 ID
 */
function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active-pane'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
    document.getElementById(tabId).classList.add('active-pane');
    document.querySelector(`.tab-btn[onclick="showTab('${tabId}')"]`).classList.add('active-tab');
}

/**
 * 변경 내역(Changelog) 모달 창을 표시합니다.
 */
async function showChangelogModal() {
    changelogModal.style.display = 'block';
    changelogContent.innerHTML = '<p>변경 내역을 불러오는 중입니다...</p>';
    try {
        const response = await fetch('changelog.md');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const markdownText = await response.text();
        changelogContent.innerHTML = marked.parse(markdownText);
    } catch (error) {
        changelogContent.innerHTML = `<p style="color: red;">변경 내역을 불러오는 데 실패했습니다: ${error.message}</p>`;
    }
}

/**
 * 모달 창을 닫습니다.
 */
function hideChangelogModal() {
    changelogModal.style.display = 'none';
}

/**
 * 지정된 ID의 서브 탭을 활성화합니다.
 * @param {string} subTabId - 활성화할 서브 탭 pane의 ID
 */
function showSubTab(subTabId) {
    document.querySelectorAll('.sub-tab-pane').forEach(pane => pane.classList.remove('active-sub-pane'));
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active-sub-tab'));
    document.getElementById(subTabId).classList.add('active-sub-pane');
    document.querySelector(`.sub-tab-btn[onclick="showSubTab('${subTabId}')"]`).classList.add('active-sub-tab');
    
    // 프롬프트 설정 탭이 보일 때 에디터 내용을 채워줍니다.
    if (subTabId === 'prompt-settings-pane') {
        populatePromptEditors();
    }
}

/**
 * 모든 시스템 프롬프트를 로드 (저장된 값 우선) 하고, 없으면 파일에서 가져옵니다.
 */
async function loadAllPrompts() {
    const fetchPrompt = async (cacheVar, storageKey, filePath) => {
        let promptText = localStorage.getItem(storageKey);
        if (!promptText) {
            try {
                const response = await fetch(filePath);
                if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
                promptText = await response.text();
            } catch (error) {
                console.error(error);
                promptText = `Error: Could not load prompt from ${filePath}.`;
            }
        }
        return promptText;
    };
    
    interfaceSystemPrompt = await fetchPrompt(interfaceSystemPrompt, CUSTOM_INTERFACE_PROMPT_KEY, 'Interface.prompt');
    characterSystemPrompt = await fetchPrompt(characterSystemPrompt, CUSTOM_CHARACTER_PROMPT_KEY, 'Character.prompt');
    loreSystemPrompt = await fetchPrompt(loreSystemPrompt, CUSTOM_LORE_PROMPT_KEY, 'Lore.prompt');
}

/**
 * 프롬프트 에디터의 내용을 현재 로드된 프롬프트로 채웁니다.
 */
function populatePromptEditors() {
    interfacePromptEditor.value = interfaceSystemPrompt;
    characterPromptEditor.value = characterSystemPrompt;
    lorePromptEditor.value = loreSystemPrompt;
}

// ---------------------------------------------------------------------------------
// # 핵심 기능 함수 (Core Feature Functions)
// ---------------------------------------------------------------------------------

/**
 * [인터페이스 편집기] AI에게 코드 생성을 요청합니다.
 */
async function handleAiGeneration() {
    const apiKey = apiKeyInput.value;
    const userPrompt = aiPrompt.value;
    const selectedModel = modelSelect.value;
    
    if (!apiKey || (!userPrompt && !uploadedImageData)) {
        aiLog.textContent = 'API 키를 입력하고, 프롬프트 또는 이미지를 제공해주세요.';
        return;
    }
    
    aiLog.textContent = 'AI에게 요청 중입니다...';
    aiGenerateBtn.disabled = true;
    
    try {
        const userParts = [];
        if (uploadedImageData) userParts.push({ inline_data: { mime_type: uploadedImageData.mimeType, data: uploadedImageData.base64 } });
        if (userPrompt) userParts.push({ text: userPrompt });
        const currentUserInput = { role: 'user', parts: userParts };

        const aiResult = await callGenerativeApi(interfaceSystemPrompt, interfaceChatHistory, currentUserInput, apiKey, selectedModel, "인터페이스 생성");
        
        parseAndPopulate(aiResult);
        handlePreviewGeneration();
        
        interfaceChatHistory.push(currentUserInput);
        interfaceChatHistory.push({ role: 'model', parts: [{ text: aiResult }] });
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(interfaceChatHistory));
        aiLog.textContent = "대화가 저장되었습니다. 이어서 요청하거나 이력을 초기화할 수 있습니다.";

    } catch (error) {
        console.error("❌ 인터페이스 생성 오류:", error);
        aiLog.textContent = `오류 발생: ${error.message}`;
    } finally {
        aiGenerateBtn.disabled = false;
        uploadedImageData = null;
        imagePreview.innerHTML = '';
        imageUpload.value = '';
    }
}

/**
 * [캐릭터 시트] AI에게 캐릭터 시트 생성을 요청합니다.
 */
async function handleCharacterSheetGeneration() {
    const apiKey = apiKeyInput.value;
    const userCharacterPrompt = characterPrompt.value;
    const selectedModel = modelSelect.value;

    if (!apiKey || !userCharacterPrompt) {
        alert('Gemini API 키를 설정하고, 캐릭터 설정을 입력해주세요.');
        return;
    }

    koreanOutputContent.textContent = 'AI에게 요청 중입니다...';
    englishOutputContent.textContent = 'Requesting from AI...';
    characterGenerateBtn.disabled = true;
    characterLog.textContent = '';

    try {
        const currentUserInput = { role: 'user', parts: [{ text: userCharacterPrompt }] };
        const aiResult = await callGenerativeApi(characterSystemPrompt, characterChatHistory, currentUserInput, apiKey, selectedModel, "캐릭터 시트 생성");

        const koreanMatch = aiResult.match(/\[KOREAN\]([\s\S]*?)\[\/KOREAN\]/);
        const englishMatch = aiResult.match(/\[ENGLISH\]([\s\S]*?)\[\/ENGLISH\]/);

        if (!koreanMatch || !englishMatch) {
            throw new Error("AI 응답이 올바른 형식([KOREAN], [ENGLISH])이 아닙니다.");
        }

        koreanOutputContent.textContent = koreanMatch[1].trim();
        englishOutputContent.textContent = englishMatch[1].trim();
        
        characterChatHistory.push(currentUserInput);
        characterChatHistory.push({ role: 'model', parts: [{ text: aiResult }] });
        localStorage.setItem(CHARACTER_HISTORY_STORAGE_KEY, JSON.stringify(characterChatHistory));
        characterLog.textContent = "대화가 저장되었습니다. 이어서 요청하거나 이력을 초기화할 수 있습니다.";

    } catch (error) {
        console.error("❌ 캐릭터 시트 생성 오류:", error);
        characterLog.textContent = `오류 발생: ${error.message}`;
        koreanOutputContent.textContent = `오류 발생: ${error.message}`;
        englishOutputContent.textContent = `Error: ${error.message}`;
    } finally {
        characterGenerateBtn.disabled = false;
    }
}

/**
 * [출력 지침] AI에게 출력 지침 생성을 요청합니다.
 */
async function handleLoreGeneration() {
    const apiKey = apiKeyInput.value;
    const userLorePrompt = lorePrompt.value;
    const selectedModel = modelSelect.value;

    if (!apiKey || !userLorePrompt) {
        alert('Gemini API 키를 설정하고, 생성 조건을 입력해주세요.');
        return;
    }

    koreanLoreOutputContent.textContent = 'AI에게 요청 중입니다...';
    englishLoreOutputContent.textContent = 'Requesting from AI...';
    loreGenerateBtn.disabled = true;
    loreLog.textContent = '';

    try {
        const currentUserInput = { role: 'user', parts: [{ text: userLorePrompt }] };
        const aiResult = await callGenerativeApi(loreSystemPrompt, loreChatHistory, currentUserInput, apiKey, selectedModel, "출력 지침 생성");

        const koreanMatch = aiResult.match(/\[KOREAN\]([\s\S]*?)\[\/KOREAN\]/);
        const englishMatch = aiResult.match(/\[ENGLISH\]([\s\S]*?)\[\/ENGLISH\]/);

        if (!koreanMatch || !englishMatch) {
            throw new Error("AI 응답이 올바른 형식([KOREAN], [ENGLISH])이 아닙니다.");
        }

        koreanLoreOutputContent.textContent = koreanMatch[1].trim();
        englishLoreOutputContent.textContent = englishMatch[1].trim();

        loreChatHistory.push(currentUserInput);
        loreChatHistory.push({ role: 'model', parts: [{ text: aiResult }] });
        localStorage.setItem(LORE_HISTORY_STORAGE_KEY, JSON.stringify(loreChatHistory));
        loreLog.textContent = "대화가 저장되었습니다. 이어서 요청하거나 이력을 초기화할 수 있습니다.";

    } catch (error) {
        console.error("❌ 출력 지침 생성 오류:", error);
        loreLog.textContent = `오류 발생: ${error.message}`;
        koreanLoreOutputContent.textContent = `오류 발생: ${error.message}`;
        englishLoreOutputContent.textContent = `Error: ${error.message}`;
    } finally {
        loreGenerateBtn.disabled = false;
    }
}


// ---------------------------------------------------------------------------------
// # 보조 및 유틸리티 함수 (Helper & Utility Functions)
// ---------------------------------------------------------------------------------

/**
 * Gemini API를 호출하고 결과 텍스트를 반환하는 공통 함수
 * @param {string} systemPrompt - 시스템 프롬프트 텍스트
 * @param {object[]} history - 이전 대화 이력 배열
 * @param {object} currentUserInput - 현재 사용자의 입력
 * @param {string} apiKey - Gemini API 키
 * @param {string} selectedModel - 사용할 모델 이름
 * @param {string} logPurpose - 콘솔 로그에 표시할 요청 목적
 * @returns {Promise<string>} AI가 생성한 텍스트
 */
async function callGenerativeApi(systemPrompt, history, currentUserInput, apiKey, selectedModel, logPurpose) {
    const contents = [];

    // 1. 시스템 프롬프트 추가
    if (systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    }

    // 2. 대화 이력 추가
    contents.push(...history);

    // 3. 현재 사용자 입력 추가
    contents.push(currentUserInput);

    // 4. 프리필 옵션이 켜져 있으면 마지막에 'Understood' 추가
    if (prefillOptionCheckbox.checked) {
        contents.push({ role: 'model', parts: [{ text: "Understood. Here is my response:" }] });
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
    const requestBody = {
        contents: contents,
        generationConfig: { temperature: 1, maxOutputTokens: 16384 }
    };

    console.log(`🚀 ${logPurpose} 요청:`, { url: API_URL, body: requestBody });

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
    console.log("✅ API 응답 수신:", data);
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
    }
    
    return data.candidates[0].content.parts.map(part => part.text).join('');
}


/**
 * AI 응답에서 태그를 파싱하여 인터페이스 편집기 필드에 채워넣습니다.
 * @param {string} aiResponse - AI가 생성한 전체 텍스트
 */
function parseAndPopulate(aiResponse) {
    const regexpMatch = aiResponse.match(/\[REGEXP\]([\s\S]*?)\[\/REGEXP\]/);
    const sampleMatch = aiResponse.match(/\[SAMPLE\]([\s\S]*?)\[\/SAMPLE\]/);
    const codeMatch = aiResponse.match(/\[CODE\]([\s\S]*?)\[\/CODE\]/);

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

/**
 * 인터페이스 편집기의 수동 미리보기를 생성합니다.
 */
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
        
        // 에셋 이미지 치환
        resultHtml = resultHtml.replace(/\{\{source::(.*?)\}\}/g, (match, name) => assetImages[name] || `${name}.png`);
        resultHtml = resultHtml.replace(/\{\{raw::(.*?)\}\}/g, (match, filename) => assetImages['asset'] || filename);

        previewOutput.innerHTML = resultHtml;
    } catch (error) {
        previewOutput.textContent = `잘못된 정규식입니다: ${error.message}`;
    }
}

/**
 * 정규식 디버깅을 웹 워커를 통해 비동기적으로 수행합니다.
 */
async function handleRegexDebug() {
    const regexPattern = regexIn.value;
    const inputText = sampleText.value;

    if (!regexPattern || !inputText) {
        regexDebugOutput.innerHTML = '<div class="no-match">정규식과 예시 문구를 모두 입력해주세요.</div>';
        return;
    }
    regexDebugOutput.innerHTML = '디버깅 중...';

    try {
        const worker = new Worker('regex-worker.js');
        const timer = setTimeout(() => {
            worker.terminate();
            regexDebugOutput.innerHTML = '<div class="error">정규식 실행 시간이 초과되었습니다. 무한 루프를 확인하세요.</div>';
        }, 2000);

        worker.onmessage = (event) => {
            clearTimeout(timer);
            worker.terminate();
            const { status, matches, message } = event.data;
            if (status === 'success') {
                if (matches.length > 0) {
                    let resultHtml = '<div><strong>✅ 전체 패턴 매치 성공!</strong></div>';
                    matches.forEach((match, index) => {
                        resultHtml += `<div class="match-block">`;
                        resultHtml += `<div><strong>매치 ${index + 1}:</strong> <span class="full-match">${escapeHtml(match[0])}</span></div>`;
                        if (match.length > 1) {
                            for (let k = 1; k < match.length; k++) {
                                resultHtml += `<div>&nbsp;&nbsp;<strong>그룹 ${k}:</strong> <span class="capture-group">${escapeHtml(match[k] || '')}</span></div>`;
                            }
                        }
                        resultHtml += `</div>`;
                    });
                    regexDebugOutput.innerHTML = resultHtml;
                } else {
                    regexDebugOutput.innerHTML = '<div class="no-match">일치하는 항목이 없습니다.</div>';
                }
            } else {
                regexDebugOutput.innerHTML = `<div class="error"><strong>❌ 정규식 오류:</strong> ${escapeHtml(message)}</div>`;
            }
        };
        worker.postMessage({ pattern: regexPattern, text: inputText });
    } catch (error) {
        regexDebugOutput.innerHTML = `<div class="error">디버거 실행 중 오류가 발생했습니다: ${error.message}</div>`;
    }
}

/**
 * XSS 방지를 위해 HTML 특수문자를 이스케이프합니다.
 * @param {string} str - 이스케이프할 원본 문자열
 * @returns {string} 이스케이프된 문자열
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
}


// ---------------------------------------------------------------------------------
// # 이벤트 리스너 (Event Listeners)
// ---------------------------------------------------------------------------------

// --- 실시간 데이터 저장 ---
apiKeyInput.addEventListener('input', () => localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.value));
modelSelect.addEventListener('change', () => localStorage.setItem(MODEL_STORAGE_KEY, modelSelect.value));
prefillOptionCheckbox.addEventListener('change', () => localStorage.setItem(PREFILL_OPTION_STORAGE_KEY, prefillOptionCheckbox.checked));
regexIn.addEventListener('input', () => localStorage.setItem(REGEX_INPUT_STORAGE_KEY, regexIn.value));
replaceOut.addEventListener('input', () => localStorage.setItem(REPLACE_TEMPLATE_STORAGE_KEY, replaceOut.value));
sampleText.addEventListener('input', () => localStorage.setItem(SAMPLE_TEXT_STORAGE_KEY, sampleText.value));

// --- 버튼 클릭 ---
processBtn.addEventListener('click', handlePreviewGeneration);
aiGenerateBtn.addEventListener('click', handleAiGeneration);
characterGenerateBtn.addEventListener('click', handleCharacterSheetGeneration);
loreGenerateBtn.addEventListener('click', handleLoreGeneration);
debugRegexBtn.addEventListener('click', handleRegexDebug);

// --- 대화 이력 초기화 ---
resetChatBtn.addEventListener('click', () => {
    interfaceChatHistory = [];
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    aiLog.textContent = '대화 이력이 초기화되었습니다.';
    aiPrompt.value = '';
    uploadedImageData = null;
    imagePreview.innerHTML = '';
    imageUpload.value = '';
});

characterResetBtn.addEventListener('click', () => {
    characterChatHistory = [];
    localStorage.removeItem(CHARACTER_HISTORY_STORAGE_KEY);
    koreanOutputContent.textContent = '생성 버튼을 눌러주세요.';
    englishOutputContent.textContent = 'Please press the generate button.';
    characterLog.textContent = '대화 이력이 초기화되었습니다.';
    characterPrompt.value = '';
});

loreResetBtn.addEventListener('click', () => {
    loreChatHistory = [];
    localStorage.removeItem(LORE_HISTORY_STORAGE_KEY);
    koreanLoreOutputContent.textContent = '생성 버튼을 눌러주세요.';
    englishLoreOutputContent.textContent = 'Please press the generate button.';
    loreLog.textContent = '대화 이력이 초기화되었습니다.';
    lorePrompt.value = '';
});

// --- 파일 업로드 ---
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

const handleAssetUpload = (event, assetName, statusElement) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        assetImages[assetName] = reader.result;
        statusElement.textContent = '✔';
    };
    reader.readAsDataURL(file);
};
userUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'user', userUploadStatus));
charUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'char', charUploadStatus));
assetUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'asset', assetUploadStatus));

// --- 모달 창 제어 ---
versionLink.addEventListener('click', (e) => {
    e.preventDefault();
    showChangelogModal();
});
modalCloseBtn.addEventListener('click', hideChangelogModal);
window.addEventListener('click', (event) => {
    if (event.target === changelogModal) {
        hideChangelogModal();
    }
});

// --- 프롬프트 설정 저장 및 초기화 ---
savePromptsBtn.addEventListener('click', () => {
    // 1. 에디터의 값을 가져옵니다.
    const newInterfacePrompt = interfacePromptEditor.value;
    const newCharacterPrompt = characterPromptEditor.value;
    const newLorePrompt = lorePromptEditor.value;

    // 2. 로컬 스토리지에 저장합니다.
    localStorage.setItem(CUSTOM_INTERFACE_PROMPT_KEY, newInterfacePrompt);
    localStorage.setItem(CUSTOM_CHARACTER_PROMPT_KEY, newCharacterPrompt);
    localStorage.setItem(CUSTOM_LORE_PROMPT_KEY, newLorePrompt);

    // 3. 전역 변수를 업데이트합니다.
    interfaceSystemPrompt = newInterfacePrompt;
    characterSystemPrompt = newCharacterPrompt;
    loreSystemPrompt = newLorePrompt;

    promptLog.textContent = "✅ 모든 프롬프트가 브라우저에 성공적으로 저장되었습니다.";
});

resetPromptsBtn.addEventListener('click', async () => {
    if (!confirm("정말로 모든 프롬프트를 기본값으로 되돌리시겠습니까? 저장된 커스텀 프롬프트가 삭제됩니다.")) {
        return;
    }

    // 1. 로컬 스토리지에서 커스텀 프롬프트를 삭제합니다.
    localStorage.removeItem(CUSTOM_INTERFACE_PROMPT_KEY);
    localStorage.removeItem(CUSTOM_CHARACTER_PROMPT_KEY);
    localStorage.removeItem(CUSTOM_LORE_PROMPT_KEY);

    // 2. 기본 프롬프트를 파일에서 다시 불러옵니다.
    await loadAllPrompts();
    
    // 3. 에디터 내용을 새로 불러온 기본값으로 채웁니다.
    populatePromptEditors();

    promptLog.textContent = "✅ 모든 프롬프트가 기본값으로 초기화되었습니다.";
});
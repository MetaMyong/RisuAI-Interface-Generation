// --- 로컬 스토리지 키 정의 ---
const API_KEY_STORAGE_KEY = 'risuai_helper_api_key';
const CHAT_HISTORY_STORAGE_KEY = 'risuai_helper_chat_history';
const REGEX_INPUT_STORAGE_KEY = 'risuai_helper_regex_input';
const REPLACE_TEMPLATE_STORAGE_KEY = 'risuai_helper_replace_template';
const SAMPLE_TEXT_STORAGE_KEY = 'risuai_helper_sample_text';
// 모델 선택
const MODEL_STORAGE_KEY = 'risuai_helper_selected_model';
const PREFILL_OPTION_STORAGE_KEY = 'risuai_helper_prefill_option';

// --- 전역 변수 ---
let chatHistory = [];
let systemPrompt = '';
let uploadedImageData = null;
const assetImages = {}; 
let debugWorker = null; 
let debugTimer = null; 

// -----------------------
// --- DOM 요소 가져오기 ---
// -----------------------
// 기본
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

//이미지 업로드
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const userUploadInput = document.getElementById('user-upload'); 
const charUploadInput = document.getElementById('char-upload');
const assetUploadInput = document.getElementById('asset-upload'); 
const userUploadStatus = document.getElementById('user-upload-status');
const charUploadStatus = document.getElementById('char-upload-status'); 
const assetUploadStatus = document.getElementById('asset-upload-status');

// 정규식 디버그
const debugRegexBtn = document.getElementById('debug-regex-btn');
const regexDebugOutput = document.getElementById('regex-debug-output');
const versionLink = document.getElementById('version-link');

// 변경 내역
const changelogModal = document.getElementById('changelog-modal');
const changelogContent = document.getElementById('changelog-content');
const modalCloseBtn = document.querySelector('.modal-close-btn');

// 캐릭터 시트
const characterPrompt = document.getElementById('character-prompt');
const characterGenerateBtn = document.getElementById('character-generate-btn');
const koreanOutputContent = document.getElementById('korean-output-content');
const englishOutputContent = document.getElementById('english-output-content');

// 모델 선택
const modelSelect = document.getElementById('model-select');
const prefillOptionCheckbox = document.getElementById('prefill-option-checkbox')

// 지시문 생성기
const lorePrompt = document.getElementById('lore-prompt');
const loreGenerateBtn = document.getElementById('lore-generate-btn');
const koreanLoreOutputContent = document.getElementById('korean-lore-output-content');
const englishLoreOutputContent = document.getElementById('english-lore-output-content');

// -----------------------
// --- 함수 정의 ---
// -----------------------

/**
 * 잠재적인 XSS 공격을 막기 위해 HTML 문자를 이스케이프하는 헬퍼 함수
 * @param {string} str 
 */
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

// 정규식 디버깅 시각 피드백
/**
 * 웹 워커에서 정규식을 실행하고 결과를 Promise로 반환하는 함수
 * @param {string} pattern - 테스트할 정규식 패턴
 * @param {string} text - 테스트할 텍스트
 * @returns {Promise<{status: string, matches?: any[], message?: string}>}
 */
function runRegexInWorker(pattern, text) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('regex-worker.js');
        let timer;

        worker.onmessage = (event) => {
            clearTimeout(timer);
            worker.terminate();
            resolve(event.data);
        };

        worker.onerror = (error) => {
            clearTimeout(timer);
            worker.terminate();
            reject(new Error(`워커 오류: ${error.message}`));
        };

        worker.postMessage({ pattern, text });

        timer = setTimeout(() => {
            worker.terminate();
            reject(new Error('실행 시간이 초과되었습니다.'));
        }, 2000);
    });
}

/**
 * 정규식 입력을 점진적으로 디버깅하여 부분 일치 결과를 찾는 비동기 함수
 */
async function handleRegexDebug() {
    const regexPattern = regexIn.value;
    const inputText = sampleText.value;

    if (!regexPattern || !inputText) {
        regexDebugOutput.innerHTML = '<div class="no-match">정규식과 예시 문구를 모두 입력해주세요.</div>';
        return;
    }

    regexDebugOutput.innerHTML = '디버깅 중...';

    // 전체 패턴부터 시작하여 한 글자씩 줄여나가는 루프
    for (let i = regexPattern.length; i > 0; i--) {
        const currentPattern = regexPattern.slice(0, i);
        if (!currentPattern) continue;

        try {
            const result = await runRegexInWorker(currentPattern, inputText);

            if (result.status === 'success' && result.matches.length > 0) {
                // 매치에 성공한 경우
                
                if (i === regexPattern.length) {
                    // 1. 전체 패턴이 성공한 경우
                    let resultHtml = '<div><strong>✅ 전체 패턴 매치 성공!</strong></div>';
                    result.matches.forEach((match, index) => {
                        resultHtml += `<div class="match-block">`;
                        resultHtml += `<div><strong>매치 ${index + 1}:</strong> <span class="full-match">${escapeHtml(match[0])}</span></div>`;
                        if (match.length > 1) {
                            for (let k = 1; k < match.length; k++) {
                                const groupText = match[k] === undefined ? 'undefined' : match[k];
                                resultHtml += `<div>&nbsp;&nbsp;<strong>그룹 ${k}:</strong> <span class="capture-group">${escapeHtml(groupText)}</span></div>`;
                            }
                        }
                        resultHtml += `</div>`;
                    });
                    regexDebugOutput.innerHTML = resultHtml;

                } else {
                    // 2. 부분 패턴이 성공한 경우
                    const matchedText = result.matches[0][0];
                    const successPattern = escapeHtml(currentPattern);
                    const failurePoint = escapeHtml(regexPattern.slice(i));

                    let resultHtml = `<div class="match-block">`;
                    resultHtml += `<div><strong>부분 매치 성공:</strong> <span class="full-match">${escapeHtml(matchedText)}</span></div>`;
                    resultHtml += `<hr style="border-color: #555; margin: 5px 0;">`;
                    resultHtml += `<div style="color: #2ecc71;"><strong>✅ 여기까지 매치 성공:</strong></div>`;
                    resultHtml += `<div style="white-space: pre-wrap; word-break: break-all;">${successPattern}</div>`;
                    resultHtml += `<hr style="border-color: #555; margin: 5px 0;">`;
                    resultHtml += `<div class="error"><strong>❌ 여기서부터 매치 실패 추정:</strong></div>`;
                    resultHtml += `<div class="error" style="white-space: pre-wrap; word-break: break-all;">${failurePoint}</div>`;
                    resultHtml += `</div>`;
                    
                    regexDebugOutput.innerHTML = resultHtml;
                }
                
                return; // 가장 긴 성공 패턴을 찾았으므로 함수 종료
            }
            // `status`가 `error`(구문 오류)이거나 `matches`가 비어있으면 루프 계속

        } catch (error) {
            // runRegexInWorker에서 타임아웃 등의 오류가 발생한 경우
            // 오류 메시지를 표시하지 않고 그냥 다음 루프로 넘어감
            // (더 짧은 패턴으로 계속 시도)
            if (i === regexPattern.length) {
                // 전체 패턴에서 타임아웃이 발생했음을 사용자에게 알려주면 더 좋음
                regexDebugOutput.innerHTML = '전체 패턴 실행 시간 초과. 가장 긴 부분 매치를 찾는 중...';
            }
            continue;
        }
    }

    // 루프가 끝날 때까지 아무것도 찾지 못했다면
    regexDebugOutput.innerHTML = '<div class="no-match">어떤 부분도 일치하는 항목을 찾을 수 없습니다.</div>';
}

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
	modelSelect.value = localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-pro';
    prefillOptionCheckbox.checked = localStorage.getItem(PREFILL_OPTION_STORAGE_KEY) === 'true';
    
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
    const selectedModel = modelSelect.value;
    const usePrefill = prefillOptionCheckbox.checked;
	
    if (!apiKey || (!userPrompt && !uploadedImageData)) {
        aiLog.textContent = 'API 키를 입력하고, 프롬프트 또는 이미지를 제공해주세요.';
        return;
    }
    aiLog.textContent = 'AI에게 요청을 전송하고 응답을 기다리는 중...';
    aiGenerateBtn.disabled = true;
    
    const userParts = [];
    if (uploadedImageData) userParts.push({ inline_data: { mime_type: uploadedImageData.mimeType, data: uploadedImageData.base64 } });
    if (userPrompt) userParts.push({ text: userPrompt });

    const contentToSend = [...chatHistory];
    contentToSend.push({ role: 'user', parts: userParts });

    if (usePrefill) {
        contentToSend.push({ role: 'model', parts: [{ text: "Understood." }] });
    }

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = { contents: contentToSend, generationConfig: { temperature: 1, maxOutputTokens: 16384 } };
		
		console.log("🚀 인터페이스 생성 요청:", { url: API_URL, body: requestBody });
		
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
		
        console.log("✅ 인터페이스 생성 응답:", data);
		
        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
        }
        const aiParts = data.candidates[0].content.parts;
		const aiResult = aiParts.map(part => part.text).join('');

        parseAndPopulate(aiResult);
        handlePreviewGeneration();
        aiLog.textContent = "✅ AI가 성공적으로 코드를 생성하고 미리보기를 업데이트했습니다.";
		
        chatHistory.push({ role: 'user', parts: userParts });
        chatHistory.push(data.candidates[0].content);
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));

    } catch (error) {
        console.error("❌ 인터페이스 생성 오류:", error);
        aiLog.textContent = `❌ 오류 발생: ${error.message}`;
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

/**
 * changelog.md 파일을 가져와서 모달에 표시하는 함수
 */
async function showChangelogModal() {
    changelogModal.style.display = 'block';
    changelogContent.innerHTML = '<p>변경 내역을 불러오는 중입니다...</p>';

    try {
        const response = await fetch('changelog.md');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const markdownText = await response.text();
        // marked.js를 사용하여 Markdown을 HTML로 변환
        changelogContent.innerHTML = marked.parse(markdownText);
    } catch (error) {
        changelogContent.innerHTML = `<p style="color: red;">변경 내역을 불러오는 데 실패했습니다: ${error.message}</p>`;
    }
}

/**
 * 모달 창을 닫는 함수
 */
function hideChangelogModal() {
    changelogModal.style.display = 'none';
}

// 캐릭터 시트 생성 함수
async function handleCharacterSheetGeneration() {
    const apiKey = apiKeyInput.value;
    const userCharacterPrompt = characterPrompt.value;
	const selectedModel = modelSelect.value;
    const usePrefill = prefillOptionCheckbox.checked;


    if (!apiKey || !userCharacterPrompt) {
        alert('Gemini API 키를 설정하고, 캐릭터 설정을 입력해주세요.');
        return;
    }

    koreanOutputContent.textContent = 'AI에게 요청 중입니다...';
    englishOutputContent.textContent = 'Requesting from AI...';
    characterGenerateBtn.disabled = true;

    try {
        // 1. Character.prompt 파일 불러오기
        const response = await fetch('Character.prompt');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const characterSystemPrompt = await response.text();

        // 2. 시스템 프롬프트와 사용자 입력을 조합
        const finalPrompt = characterSystemPrompt + "\n\n" + userCharacterPrompt;
        
		const contents = [{ role: 'user', parts: [{ text: finalPrompt }] }];
        if (usePrefill) {
            contents.push({ role: 'model', parts: [{ text: "Understood." }] });
        }
		
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: contents, // 수정된 contents 사용
            generationConfig: { temperature: 1, maxOutputTokens: 16384 }
        };
		
        console.log("🚀 캐릭터 시트 생성 요청:", { url: API_URL, body: requestBody });

        // 3. API 요청
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.error.message || `API 요청 실패: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
		
		console.log("✅ 캐릭터 시트 생성 응답:", data);

        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
        }
        const aiParts = data.candidates[0].content.parts;
		const aiResult = aiParts.map(part => part.text).join('');

        // 4. 결과 파싱
        const koreanMatch = aiResult.match(/\[KOREAN\]([\s\S]*?)\[\/KOREAN\]/);
        const englishMatch = aiResult.match(/\[ENGLISH\]([\s\S]*?)\[\/ENGLISH\]/);

        if (!koreanMatch || !englishMatch) {
            throw new Error("AI 응답이 올바른 형식([KOREAN], [ENGLISH])이 아닙니다.");
        }

        // 5. 미리보기에 출력
        koreanOutputContent.textContent = koreanMatch[1].trim();
        englishOutputContent.textContent = englishMatch[1].trim();

    } catch (error) {
        console.error("❌ 캐릭터 시트 생성 오류:", error);
        koreanOutputContent.textContent = `오류 발생: ${error.message}`;
        englishOutputContent.textContent = `Error: ${error.message}`;
    } finally {
        characterGenerateBtn.disabled = false;
    }
}

// 지시문 생성 함수
async function handleLoreGeneration() {
    const apiKey = apiKeyInput.value;
    const userLorePrompt = lorePrompt.value;
    const selectedModel = modelSelect.value;
    const usePrefill = prefillOptionCheckbox.checked;

    if (!apiKey || !userLorePrompt) {
        alert('Gemini API 키를 설정하고, 생성 조건을 입력해주세요.');
        return;
    }

    koreanLoreOutputContent.textContent = 'AI가 지시문을 생성하는 중입니다...';
    englishLoreOutputContent.textContent = 'Generating the directive...';
    loreGenerateBtn.disabled = true;

    try {
        const response = await fetch('Lore.prompt');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const loreSystemPrompt = await response.text();

        const finalPrompt = loreSystemPrompt + "\n\n--- User's Request ---\n" + userLorePrompt;
        
        const contents = [{ role: 'user', parts: [{ text: finalPrompt }] }];
        if (usePrefill) {
            contents.push({ role: 'model', parts: [{ text: "Understood. I will now generate the directive in both Korean and English based on the user's request." }] });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
        };

        console.log("🚀 지시문 생성 요청:", { url: API_URL, body: requestBody });

        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.error.message || `API 요청 실패: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        console.log("✅ 지시문 생성 응답:", data);

        if (!data.candidates || data.candidates.length === 0) {
             throw new Error("API로부터 유효한 응답을 받지 못했습니다.");
        }

        const aiParts = data.candidates[0].content.parts;
        const aiResult = aiParts.map(part => part.text).join('');

        // 결과 파싱
        const koreanMatch = aiResult.match(/\[KOREAN\]([\s\S]*?)\[\/KOREAN\]/);
        const englishMatch = aiResult.match(/\[ENGLISH\]([\s\S]*?)\[\/ENGLISH\]/);

        if (!koreanMatch || !englishMatch) {
            throw new Error("AI 응답이 올바른 형식([KOREAN], [ENGLISH])이 아닙니다. 받은 응답: " + aiResult);
        }

        // 미리보기에 출력
        koreanLoreOutputContent.textContent = koreanMatch[1].trim();
        englishLoreOutputContent.textContent = englishMatch[1].trim();

    } catch (error) {
        console.error("❌ 지시문 생성 오류:", error);
        koreanLoreOutputContent.textContent = `오류 발생: ${error.message}`;
        englishLoreOutputContent.textContent = `Error: ${error.message}`;
    } finally {
        loreGenerateBtn.disabled = false;
    }
}

// -----------------------
// --- 이벤트 리스너 연결 ---
// -----------------------
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    showTab('editor-ai-tab');
});

// 실시간 저장 이벤트 리스너
apiKeyInput.addEventListener('input', () => localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.value));
regexIn.addEventListener('input', () => localStorage.setItem(REGEX_INPUT_STORAGE_KEY, regexIn.value));
replaceOut.addEventListener('input', () => localStorage.setItem(REPLACE_TEMPLATE_STORAGE_KEY, replaceOut.value));
sampleText.addEventListener('input', () => localStorage.setItem(SAMPLE_TEXT_STORAGE_KEY, sampleText.value));
modelSelect.addEventListener('change', () => localStorage.setItem(MODEL_STORAGE_KEY, modelSelect.value));
prefillOptionCheckbox.addEventListener('change', () => localStorage.setItem(PREFILL_OPTION_STORAGE_KEY, prefillOptionCheckbox.checked));

// 버튼 클릭 이벤트 리스너
processBtn.addEventListener('click', handlePreviewGeneration);
aiGenerateBtn.addEventListener('click', handleAiGeneration);
characterGenerateBtn.addEventListener('click', handleCharacterSheetGeneration);
loreGenerateBtn.addEventListener('click', handleLoreGeneration);
resetChatBtn.addEventListener('click', () => {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    initializeChatFromPrompt(); 
    aiLog.textContent = '대화 이력이 초기화되었습니다.';
    aiPrompt.value = '';
    uploadedImageData = null;
    imagePreview.innerHTML = '';
    imageUpload.value = '';
});

// 이미지 이벤트 리스너
userUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'user', userUploadStatus));
charUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'char', charUploadStatus));
assetUploadInput.addEventListener('change', (e) => handleAssetUpload(e, 'asset', assetUploadStatus));

// 정규식 리스너
debugRegexBtn.addEventListener('click', handleRegexDebug);
versionLink.addEventListener('click', (e) => {
    e.preventDefault(); // 기본 링크 동작 방지
    showChangelogModal();
});
modalCloseBtn.addEventListener('click', hideChangelogModal);

// 모달 창 바깥 영역을 클릭하면 닫히게 함
window.addEventListener('click', (event) => {
    if (event.target == changelogModal) {
        hideChangelogModal();
    }
});

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
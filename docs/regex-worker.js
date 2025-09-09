/**
 * 웹 워커 스크립트: 정규식 실행을 백그라운드에서 처리합니다.
 */
self.onmessage = function(event) {
    const { pattern, text } = event.data;

    try {
        const regex = new RegExp(pattern, 'g');
        const matches = [...text.matchAll(regex)];
        
        // postMessage는 일반 객체/배열만 전달할 수 있으므로,
        // match 객체(특수한 배열)를 일반 배열로 변환합니다.
        const serializableMatches = matches.map(match => Array.from(match));

        // 성공 결과를 메인 스레드로 보냅니다.
        self.postMessage({
            status: 'success',
            matches: serializableMatches
        });

    } catch (error) {
        // 정규식 구문 오류 발생 시 에러를 메인 스레드로 보냅니다.
        self.postMessage({
            status: 'error',
            message: error.message
        });
    }
};
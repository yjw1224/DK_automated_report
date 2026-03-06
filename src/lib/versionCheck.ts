declare const __APP_VERSION__: string;

const POLL_INTERVAL = 60_000; // 1분마다 폴링
let timerId: ReturnType<typeof setInterval> | null = null;

async function checkVersion(): Promise<void> {
    try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return;

        const { version } = await res.json();
        if (version && version !== __APP_VERSION__) {
            console.log('[VersionCheck] 새 버전 감지, 새로고침합니다.');
            window.location.reload();
        }
    } catch {
        // 네트워크 오류 시 무시
    }
}

export function startVersionCheck(): () => void {
    // 탭 활성화 시 즉시 체크
    const onVisible = () => {
        if (document.visibilityState === 'visible') {
            checkVersion();
        }
    };

    document.addEventListener('visibilitychange', onVisible);

    // 주기적 폴링
    timerId = setInterval(checkVersion, POLL_INTERVAL);

    // cleanup 함수 반환
    return () => {
        document.removeEventListener('visibilitychange', onVisible);
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    };
}

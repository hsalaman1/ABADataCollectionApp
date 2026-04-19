// Compact session header — Option A style

function SessionHeader({ clientName, elapsed, isPaused, onPause, onResume, onEnd, isEnded, onResumeSession, onClose }) {
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
      background: isEnded ? '#7f1d1d' : '#1e293b', color: '#fff',
      position: 'sticky', top: 0, zIndex: 100,
      transition: 'background 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{clientName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            {isEnded ? 'Session Ended — export or resume below' : 'Active Session'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            fontFamily: "'SF Mono', 'Menlo', monospace",
            color: isEnded ? '#fca5a5' : isPaused ? '#fbbf24' : '#fff',
          }}>
            {formatTime(elapsed)}
          </div>
          {isEnded && <div style={{ fontSize: 9, fontWeight: 700, color: '#fca5a5', letterSpacing: '0.08em' }}>ENDED</div>}
          {!isEnded && isPaused && <div style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.08em' }}>PAUSED</div>}
        </div>

        {isEnded ? (
          <>
            <button onClick={onResumeSession} style={{
              padding: '7px 12px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
            }}>
              ▶ Resume
            </button>
            <button onClick={onClose} style={{
              padding: '7px 12px', borderRadius: 7, border: 'none',
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
            }}>
              Close
            </button>
          </>
        ) : (
          <>
            <button onClick={isPaused ? onResume : onPause} style={{
              padding: '7px 12px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
            }}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button onClick={onEnd} style={{
              padding: '7px 12px', borderRadius: 7, border: 'none',
              background: '#ef4444', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
            }}>
              End
            </button>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SessionHeader });

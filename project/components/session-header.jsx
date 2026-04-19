// Compact session header — Option A style

function SessionHeader({ clientName, elapsed, isPaused, onPause, onResume, onEnd }) {
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
      background: '#1e293b', color: '#fff',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{clientName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Home Session</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            fontFamily: "'SF Mono', 'Menlo', monospace",
            color: isPaused ? '#fbbf24' : '#fff',
          }}>
            {formatTime(elapsed)}
          </div>
          {isPaused && <div style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.08em' }}>PAUSED</div>}
        </div>
        <button
          onClick={isPaused ? onResume : onPause}
          style={{
            padding: '7px 12px', borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.08)', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
          }}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button onClick={onEnd} style={{
          padding: '7px 12px', borderRadius: 7, border: 'none',
          background: '#ef4444', color: '#fff',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
        }}>
          End
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { SessionHeader });

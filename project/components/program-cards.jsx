// Compact event recording card for Option A grid layout

function EventRecordingCard({ program, state, onCorrect, onIncorrect, onPromptChange, onUndo }) {
  const { trialsCorrect, trialsTotal, selectedPrompt, trials } = state;
  const pct = trialsTotal > 0 ? Math.round((trialsCorrect / trialsTotal) * 100) : 0;
  const indep = trials.filter(t => t.correct && t.prompt === 'independent').length;
  const indepPct = trialsTotal > 0 ? Math.round((indep / trialsTotal) * 100) : 0;
  const prompts = [
    { key: 'independent', label: 'Ind', color: '#0d9488' },
    { key: 'gestural', label: 'Ges', color: '#6366f1' },
    { key: 'verbal', label: 'Vrb', color: '#8b5cf6' },
    { key: 'partial_physical', label: 'PP', color: '#f59e0b' },
    { key: 'full_physical', label: 'FP', color: '#ef4444' },
  ];

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
      padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.2, flex: 1, marginRight: 8 }}>{program.name}</div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {trialsCorrect}/{trialsTotal}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{pct}% acc</div>
        </div>
      </div>
      {/* Prompt selector — compact */}
      <div style={{ display: 'flex', gap: 3 }}>
        {prompts.map(p => (
          <button
            key={p.key}
            onClick={() => onPromptChange(p.key)}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 5,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              textAlign: 'center', minHeight: 30,
              background: selectedPrompt === p.key ? p.color : 'transparent',
              color: selectedPrompt === p.key ? '#fff' : '#94a3b8',
              border: `1.5px solid ${selectedPrompt === p.key ? p.color : '#e9ecef'}`,
              transition: 'all 0.15s',
            }}
          >{p.label}</button>
        ))}
      </div>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onCorrect} style={{
          flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
          background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          minHeight: 46,
        }}>
          <span style={{ fontSize: 18 }}>✓</span> Correct
        </button>
        <button onClick={onIncorrect} style={{
          flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
          background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          minHeight: 46,
        }}>
          <span style={{ fontSize: 18 }}>✗</span> Incorrect
        </button>
      </div>
      {/* Trial dots + stats row */}
      {trials.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
            {trials.slice(-12).map((t, i) => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: 9,
                background: t.correct ? '#10b981' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 8, fontWeight: 700,
              }}>{t.correct ? '+' : '−'}</div>
            ))}
          </div>
          <button onClick={onUndo} style={{
            padding: '4px 8px', borderRadius: 5, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#94a3b8', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
          }}>↩ Undo</button>
        </div>
      )}
      {/* Independence stat */}
      {trialsTotal > 0 && (
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'flex', gap: 10 }}>
          <span>Indep: <strong style={{ color: '#0d9488' }}>{indepPct}%</strong></span>
        </div>
      )}
    </div>
  );
}

// Compact tally card for deceleration

function TallyCard({ program, count, onTap, onDecrement, timerState, onTimerToggle }) {
  const formatDur = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '1px solid #fecaca',
      padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', lineHeight: 1.2 }}>{program.name}</div>
          <div style={{ fontSize: 10, color: '#f87171', fontWeight: 500, marginTop: 1 }}>Deceleration</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{count}</div>
      </div>
      {/* Count button */}
      <button onClick={onTap} style={{
        padding: '12px 0', borderRadius: 8, border: '2px solid #fecaca',
        background: '#fef2f2', color: '#dc2626', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', minHeight: 46,
      }}>
        + Tap to Count
      </button>
      {/* Inline timer */}
      {timerState && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 7,
          background: timerState.isRunning ? 'rgba(239,68,68,0.06)' : '#f8fafc',
          border: timerState.isRunning ? '1px solid rgba(239,68,68,0.25)' : '1px solid #e2e8f0',
        }}>
          <button onClick={onTimerToggle} style={{
            width: 30, height: 30, borderRadius: 15, border: 'none',
            background: timerState.isRunning ? '#ef4444' : '#64748b',
            color: '#fff', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>{timerState.isRunning ? '■' : '▶'}</button>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'SF Mono', monospace", fontVariantNumeric: 'tabular-nums', color: timerState.isRunning ? '#ef4444' : '#475569' }}>
            {formatDur(timerState.isRunning ? timerState.totalMs + timerState.currentMs : timerState.totalMs)}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>×{timerState.instances}</div>
        </div>
      )}
      {/* Undo */}
      {count > 0 && (
        <button onClick={onDecrement} style={{
          padding: '4px 8px', borderRadius: 5, border: '1px solid #e2e8f0',
          background: '#f8fafc', color: '#94a3b8', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', alignSelf: 'flex-start',
        }}>↩ Undo (-1)</button>
      )}
    </div>
  );
}

// Compact duration card

function DurationCard({ program, timerState, onTimerToggle }) {
  const formatDur = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
      padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{program.name}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>Duration</div>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>×{timerState.instances} episodes</div>
      </div>
      {/* Timer display */}
      <div style={{
        textAlign: 'center', padding: '8px 0',
        fontFamily: "'SF Mono', 'Menlo', monospace",
        fontSize: 30, fontWeight: 700,
        color: timerState.isRunning ? '#0d9488' : '#1e293b',
        fontVariantNumeric: 'tabular-nums',
        animation: timerState.isRunning ? 'timerPulse 2s ease-in-out infinite' : 'none',
        borderRadius: 8,
      }}>
        {formatDur(timerState.isRunning ? timerState.totalMs + timerState.currentMs : timerState.totalMs)}
      </div>
      <button onClick={onTimerToggle} style={{
        padding: '12px 0', borderRadius: 8, border: 'none',
        background: timerState.isRunning ? '#ef4444' : '#0d9488',
        color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 46,
      }}>
        {timerState.isRunning ? '■  Stop' : '▶  Start Timer'}
      </button>
    </div>
  );
}

Object.assign(window, { EventRecordingCard, TallyCard, DurationCard });

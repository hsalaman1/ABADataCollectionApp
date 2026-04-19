// Bottom export/action bar (inspired by Repo 2's ExportButtons)

function SessionActionBar({ onNotes, onABC, onExport, notesCount, abcCount }) {
  return (
    <div style={actionBarStyles.container}>
      <div style={actionBarStyles.inner}>
        <button onClick={onNotes} style={actionBarStyles.btn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Notes
          {notesCount > 0 && <span style={actionBarStyles.badge}>{notesCount}</span>}
        </button>
        <button onClick={onABC} style={actionBarStyles.btn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/>
          </svg>
          ABC
          {abcCount > 0 && <span style={actionBarStyles.badge}>{abcCount}</span>}
        </button>
        <div style={actionBarStyles.exportGroup}>
          <button onClick={() => onExport('csv')} style={{...actionBarStyles.exportBtn, background: '#10b981'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
            </svg>
            CSV
          </button>
          <button onClick={() => onExport('pdf')} style={{...actionBarStyles.exportBtn, background: '#ef4444'}}>
            PDF
          </button>
          <button onClick={() => onExport('docx')} style={{...actionBarStyles.exportBtn, background: '#3b82f6'}}>
            DOCX
          </button>
        </div>
      </div>
    </div>
  );
}

const actionBarStyles = {
  container: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#fff', borderTop: '1px solid #e2e8f0',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
    zIndex: 90, paddingBottom: 'env(safe-area-inset-bottom)',
  },
  inner: {
    maxWidth: 960, margin: '0 auto',
    padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
  },
  btn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#475569', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', minHeight: 44, position: 'relative',
  },
  badge: {
    background: '#0d9488', color: '#fff', fontSize: 10, fontWeight: 700,
    padding: '1px 6px', borderRadius: 10, marginLeft: 2,
  },
  exportGroup: {
    display: 'flex', gap: 4, marginLeft: 'auto',
  },
  exportBtn: {
    padding: '10px 14px', borderRadius: 8, border: 'none',
    color: '#fff', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', minHeight: 44,
    display: 'flex', alignItems: 'center', gap: 4,
  },
};

// SOAP Notes slide-up sheet

function NotesSheet({ isOpen, onClose, notes, onNotesChange }) {
  if (!isOpen) return null;

  const fields = [
    { key: 'sessionNote', label: 'Session Notes', placeholder: 'How did the session go? Client behavior, motivation, engagement...' },
    { key: 'modifications', label: 'Modifications', placeholder: 'Any changes made to programs, prompting, reinforcement, materials...' },
    { key: 'followUp', label: 'Next Session / Follow-Up', placeholder: 'Goals or things to focus on next session, parent/caregiver follow-up items...' },
  ];

  return (
    <div style={sheetStyles.overlay} onClick={onClose}>
      <div style={sheetStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={sheetStyles.handle} />
        <div style={sheetStyles.sheetHeader}>
          <h3 style={sheetStyles.sheetTitle}>Session Notes</h3>
          <button onClick={onClose} style={sheetStyles.closeBtn}>✕</button>
        </div>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={sheetStyles.label}>{f.label}</label>
            <textarea
              value={notes[f.key] || ''}
              onChange={e => onNotesChange({ ...notes, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={{ ...sheetStyles.textarea, minHeight: 70 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ABC Data entry sheet

function ABCSheet({ isOpen, onClose, records, onAddRecord }) {
  const [form, setForm] = React.useState({ antecedent: '', behavior: '', consequence: '' });

  const antecedents = ['Demand placed', 'Denied access', 'Transition', 'Low attention', 'Task presented', 'Change in routine'];
  const consequences = ['Escape provided', 'Attention given', 'Access to item', 'Redirected', 'Verbal prompt', 'Ignored'];

  const handleSave = () => {
    if (!form.antecedent && !form.behavior) return;
    onAddRecord({
      ...form,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    });
    setForm({ antecedent: '', behavior: '', consequence: '' });
  };

  if (!isOpen) return null;

  return (
    <div style={sheetStyles.overlay} onClick={onClose}>
      <div style={sheetStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={sheetStyles.handle} />
        <div style={sheetStyles.sheetHeader}>
          <h3 style={sheetStyles.sheetTitle}>ABC Data</h3>
          <button onClick={onClose} style={sheetStyles.closeBtn}>✕</button>
        </div>
        {/* Quick select antecedent */}
        <label style={sheetStyles.label}>Antecedent</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {antecedents.map(a => (
            <button key={a} onClick={() => setForm(f => ({ ...f, antecedent: a }))}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: form.antecedent === a ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                background: form.antecedent === a ? '#f0fdfa' : '#fff',
                color: form.antecedent === a ? '#0d9488' : '#64748b',
                cursor: 'pointer',
              }}
            >{a}</button>
          ))}
        </div>
        <textarea
          value={form.antecedent}
          onChange={e => setForm(f => ({ ...f, antecedent: e.target.value }))}
          placeholder="Or type / paste antecedent details..."
          style={{ ...sheetStyles.textarea, minHeight: 44, marginBottom: 10 }}
        />
        {/* Behavior */}
        <label style={sheetStyles.label}>Behavior</label>
        <textarea value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))}
          placeholder="Describe the behavior..." style={{ ...sheetStyles.textarea, minHeight: 50, marginBottom: 8 }} />
        {/* Consequence */}
        <label style={sheetStyles.label}>Consequence</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {consequences.map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, consequence: c }))}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: form.consequence === c ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                background: form.consequence === c ? '#f0fdfa' : '#fff',
                color: form.consequence === c ? '#0d9488' : '#64748b',
                cursor: 'pointer',
              }}
            >{c}</button>
          ))}
        </div>
        <textarea
          value={form.consequence}
          onChange={e => setForm(f => ({ ...f, consequence: e.target.value }))}
          placeholder="Or type / paste consequence details..."
          style={{ ...sheetStyles.textarea, minHeight: 44, marginBottom: 12 }}
        />
        <button onClick={handleSave} style={{
          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
          background: '#0d9488', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>Save ABC Record</button>
        {/* History */}
        {records.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>RECENT ({records.length})</div>
            {records.slice(-3).reverse().map((r, i) => (
              <div key={i} style={{
                padding: '8px 10px', borderRadius: 8, background: '#f8fafc',
                border: '1px solid #e2e8f0', marginBottom: 4, fontSize: 12, color: '#475569',
              }}>
                <strong>A:</strong> {r.antecedent} → <strong>B:</strong> {r.behavior} → <strong>C:</strong> {r.consequence}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const sheetStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600,
    maxHeight: '85vh', overflow: 'auto', padding: '8px 20px 24px',
    animation: 'slideUp 0.25s ease-out',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, background: '#d1d5db',
    margin: '4px auto 12px',
  },
  sheetHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, border: 'none',
    background: '#f1f5f9', color: '#64748b', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b',
    marginBottom: 4, letterSpacing: '0.02em',
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
    color: '#1e293b',
  },
};

Object.assign(window, { SessionActionBar, NotesSheet, ABCSheet });

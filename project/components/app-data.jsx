// Sample data + session screen logic

const INITIAL_CLIENTS = [
  {
    id: 'c1', name: 'Alex M.', dateOfBirth: '2018-03-15', phone: '407-555-1234',
    address: '123 Oak Lane, Orlando, FL', location: 'Home', sessions: 12,
    programs: [
      { id: 'p1', name: '1-Step Directions', category: 'acquisition', dataType: 'event',
        definition: 'Client follows a 1-step instruction within 5 seconds without additional prompting.',
        runDescription: 'Present SD "Do this" with a 1-step instruction. Wait 5 seconds. Score + for independent correct, or record prompt level. Run 10 trials per session.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
        stos: [
          { id: 's1', target: 50, description: 'Achieve 50% with no more than gestural prompt', status: 'mastered' },
          { id: 's2', target: 75, description: 'Achieve 75% independently', status: 'active' },
          { id: 's3', target: 90, description: 'Achieve 90% independently', status: 'active' },
        ],
      },
      { id: 'p2', name: 'Receptive ID — Colors', category: 'acquisition', dataType: 'event',
        definition: 'Client touches/points to the correct color when presented with a field of 3.',
        runDescription: 'Place 3 color cards. Present SD "Touch [color]." Rotate target position. Run 10 trials.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
        stos: [
          { id: 's4', target: 50, description: '50% with field of 2', status: 'mastered' },
          { id: 's5', target: 80, description: '80% with field of 3', status: 'active' },
        ],
      },
      { id: 'p3', name: 'Manding with PECS', category: 'acquisition', dataType: 'event',
        definition: 'Client independently exchanges PECS card for desired item.',
        runDescription: 'Place preferred item in view but out of reach. PECS book within reach. Wait for initiation.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
        stos: [{ id: 's6', target: 60, description: '60% independent exchanges', status: 'active' }],
      },
      { id: 'p4', name: 'Waiting Tolerance', category: 'acquisition', dataType: 'duration',
        definition: 'Duration client waits appropriately without problem behavior.',
        runDescription: 'Present SD "Wait please." Start timer. Stop on problem behavior or when wait period ends.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'correct' }, stos: [],
      },
      { id: 'p5', name: 'Physical Aggression', category: 'deceleration', dataType: 'frequency',
        definition: 'Hitting, kicking, biting, or scratching directed at another person.',
        runDescription: 'Record each instance. Start duration timer per episode. Record ABC data.',
        isActive: true, masteryCriteria: { percentage: 0, consecutiveSessions: 3, metric: 'correct' }, stos: [],
      },
      { id: 'p6', name: 'Self-Injurious Behavior', category: 'deceleration', dataType: 'frequency',
        definition: 'Head banging, hand biting, skin picking directed at self.',
        runDescription: 'Record each instance. Note intensity. Record ABC data.',
        isActive: true, masteryCriteria: { percentage: 0, consecutiveSessions: 3, metric: 'correct' }, stos: [],
      },
    ],
  },
  {
    id: 'c2', name: 'Jordan K.', dateOfBirth: '2019-07-22', phone: '407-555-5678',
    address: '456 Pine St, Orlando, FL', location: 'Home', sessions: 8,
    programs: [
      { id: 'p7', name: 'Imitation — Gross Motor', category: 'acquisition', dataType: 'event',
        definition: 'Client imitates a gross motor action within 5 seconds of model.',
        runDescription: 'Present SD "Do this" while modeling. Wait 5 seconds. Run 10 trials.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
        stos: [{ id: 's7', target: 80, description: '80% accuracy', status: 'active' }],
      },
      { id: 'p8', name: 'Elopement', category: 'deceleration', dataType: 'frequency',
        definition: 'Leaving designated area without permission.',
        runDescription: 'Record each instance with duration.',
        isActive: true, masteryCriteria: { percentage: 0, consecutiveSessions: 3, metric: 'correct' }, stos: [],
      },
    ],
  },
  {
    id: 'c3', name: 'Riley S.', dateOfBirth: '2020-01-10', location: 'Clinic', sessions: 3,
    programs: [
      { id: 'p9', name: 'Eye Contact', category: 'acquisition', dataType: 'event',
        definition: 'Client makes eye contact within 3 seconds of name being called.',
        runDescription: 'Call client name. Wait 3 seconds. Score + for eye contact.',
        isActive: true, masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
        stos: [{ id: 's8', target: 50, description: '50% responding', status: 'active' }],
      },
    ],
  },
];

const INITIAL_SESSIONS = [
  { id: 'ses1', clientId: 'c1', date: '2026-04-18', dateLabel: 'Apr 18, 2026', duration: '45 min',
    notes: 'Good session. Alex motivated by tablet time.',
    behaviorData: [{ id: 'p1', pct: 70 }, { id: 'p2', pct: 60 }, { id: 'p3', pct: 45 }],
    summary: [{ name: '1-Step', value: '70%' }, { name: 'Colors', value: '60%' }, { name: 'Aggression', value: '2' }, { name: 'SIB', value: '1' }],
  },
  { id: 'ses2', clientId: 'c1', date: '2026-04-16', dateLabel: 'Apr 16, 2026', duration: '30 min',
    notes: 'Shorter session.', behaviorData: [{ id: 'p1', pct: 65 }, { id: 'p2', pct: 55 }],
    summary: [{ name: '1-Step', value: '65%' }, { name: 'Colors', value: '55%' }, { name: 'Aggression', value: '3' }],
  },
  { id: 'ses3', clientId: 'c1', date: '2026-04-14', dateLabel: 'Apr 14, 2026', duration: '55 min',
    notes: '', behaviorData: [{ id: 'p1', pct: 60 }, { id: 'p2', pct: 50 }],
    summary: [{ name: '1-Step', value: '60%' }, { name: 'Colors', value: '50%' }, { name: 'Aggression', value: '4' }],
  },
  { id: 'ses4', clientId: 'c1', date: '2026-04-11', dateLabel: 'Apr 11, 2026', duration: '45 min',
    notes: 'First session at new time.', behaviorData: [{ id: 'p1', pct: 55 }],
    summary: [{ name: '1-Step', value: '55%' }, { name: 'Aggression', value: '5' }],
  },
  { id: 'ses5', clientId: 'c1', date: '2026-04-09', dateLabel: 'Apr 9, 2026', duration: '50 min',
    notes: '', behaviorData: [{ id: 'p1', pct: 50 }],
    summary: [{ name: '1-Step', value: '50%' }],
  },
  { id: 'ses6', clientId: 'c2', date: '2026-04-17', dateLabel: 'Apr 17, 2026', duration: '40 min',
    notes: 'Jordan had a great day.', behaviorData: [{ id: 'p7', pct: 65 }],
    summary: [{ name: 'Imitation', value: '65%' }, { name: 'Elopement', value: '1' }],
  },
];

// ── Independent timer hook ──
function useIndependentTimer() {
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentMs, setCurrentMs] = React.useState(0);
  const [totalMs, setTotalMs] = React.useState(0);
  const [instances, setInstances] = React.useState(0);
  const startRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const toggle = React.useCallback(() => {
    if (isRunning) {
      clearInterval(intervalRef.current);
      setTotalMs(prev => prev + (Date.now() - startRef.current));
      setInstances(prev => prev + 1);
      setCurrentMs(0); setIsRunning(false);
    } else {
      startRef.current = Date.now(); setIsRunning(true);
      intervalRef.current = setInterval(() => setCurrentMs(Date.now() - startRef.current), 100);
    }
  }, [isRunning]);
  React.useEffect(() => () => clearInterval(intervalRef.current), []);
  return { isRunning, currentMs, totalMs, instances, toggle };
}

// ── Session Screen ──
function SessionScreen({ client, onEnd }) {
  const [sessionStart] = React.useState(Date.now());
  const [elapsed, setElapsed] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const pauseOffsetRef = React.useRef(0);
  const pauseStartRef = React.useRef(null);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (!isPaused) setElapsed(Date.now() - sessionStart - pauseOffsetRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [sessionStart, isPaused]);

  const handlePause = () => { setIsPaused(true); pauseStartRef.current = Date.now(); };
  const handleResume = () => {
    if (pauseStartRef.current) pauseOffsetRef.current += Date.now() - pauseStartRef.current;
    setIsPaused(false);
  };

  const activePrograms = client.programs.filter(p => p.isActive !== false);

  const [programStates, setProgramStates] = React.useState(() => {
    const s = {};
    activePrograms.forEach(p => {
      if (p.dataType === 'event') s[p.id] = { trialsCorrect: 0, trialsTotal: 0, selectedPrompt: 'independent', trials: [] };
      else if (p.dataType === 'frequency') s[p.id] = { count: 0 };
      else s[p.id] = {};
    });
    return s;
  });

  const timerRefs = {};
  activePrograms.filter(p => p.category === 'deceleration' || p.dataType === 'duration').forEach(p => {
    timerRefs[p.id] = useIndependentTimer();
  });

  const [showNotes, setShowNotes] = React.useState(false);
  const [showABC, setShowABC] = React.useState(false);
  const [notes, setNotes] = React.useState({});
  const [abcRecords, setABCRecords] = React.useState([]);
  const [filter, setFilter] = React.useState('all');

  const up = (id, updates) => setProgramStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));

  const acq = activePrograms.filter(p => p.category === 'acquisition');
  const decel = activePrograms.filter(p => p.category === 'deceleration');

  const renderCard = (prog) => {
    const st = programStates[prog.id];
    if (!st) return null;
    if (prog.dataType === 'event') {
      return <EventRecordingCard program={prog} state={st}
        onCorrect={() => up(prog.id, { trialsCorrect: st.trialsCorrect+1, trialsTotal: st.trialsTotal+1,
          trials: [...st.trials, { correct: true, prompt: st.selectedPrompt, ts: Date.now() }] })}
        onIncorrect={() => up(prog.id, { trialsTotal: st.trialsTotal+1,
          trials: [...st.trials, { correct: false, prompt: st.selectedPrompt, ts: Date.now() }] })}
        onPromptChange={p => up(prog.id, { selectedPrompt: p })}
        onUndo={() => { if (!st.trials.length) return; const l = st.trials.at(-1);
          up(prog.id, { trialsCorrect: st.trialsCorrect-(l.correct?1:0), trialsTotal: st.trialsTotal-1, trials: st.trials.slice(0,-1) }); }}
      />;
    }
    if (prog.dataType === 'duration') return <DurationCard program={prog} timerState={timerRefs[prog.id]} onTimerToggle={timerRefs[prog.id].toggle} />;
    if (prog.dataType === 'frequency') return <TallyCard program={prog} count={st.count}
      onTap={() => up(prog.id, { count: st.count+1 })}
      onDecrement={() => up(prog.id, { count: Math.max(0, st.count-1) })}
      timerState={timerRefs[prog.id]} onTimerToggle={timerRefs[prog.id]?.toggle} />;
  };

  const showA = filter === 'all' || filter === 'acquisition';
  const showD = filter === 'all' || filter === 'deceleration';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SessionHeader clientName={client.name} elapsed={elapsed} isPaused={isPaused}
        onPause={handlePause} onResume={handleResume} onEnd={onEnd} />
      <div style={{ padding: '10px 16px', display: 'flex', gap: 6, alignItems: 'center',
        background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        {[{ key: 'all', label: `All (${activePrograms.length})` },
          { key: 'acquisition', label: `Acq (${acq.length})` },
          { key: 'deceleration', label: `Decel (${decel.length})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '6px 14px', borderRadius: 16, fontSize: 12, fontWeight: 600,
            border: filter===f.key ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
            background: filter===f.key ? '#f0fdfa' : '#fff',
            color: filter===f.key ? '#0d9488' : '#64748b', cursor: 'pointer',
          }}>{f.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
          {Object.values(programStates).reduce((s,v) => s+(v.trialsTotal||0)+(v.count||0), 0)} pts
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 80px', maxWidth: 1060, margin: '0 auto', width: '100%' }}>
        {showA && acq.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-label" style={{ color: '#0d9488' }}>Acquisition Programs</div>
            <div className="program-grid">{acq.map(p => <div key={p.id} className="program-card">{renderCard(p)}</div>)}</div>
          </div>
        )}
        {showD && decel.length > 0 && (
          <div>
            <div className="section-label" style={{ color: '#dc2626' }}>Deceleration Targets</div>
            <div className="program-grid">{decel.map(p => <div key={p.id} className="program-card">{renderCard(p)}</div>)}</div>
          </div>
        )}
      </div>
      <SessionActionBar onNotes={() => setShowNotes(true)} onABC={() => setShowABC(true)}
        onExport={fmt => {
          const progs = client.programs.filter(p => p.isActive !== false);
          if (fmt === 'docx') downloadSessionDocx(client, elapsed, programStates, timerRefs, abcRecords, notes, progs);
          else if (fmt === 'pdf') downloadSessionPdf(client, elapsed, programStates, timerRefs, abcRecords, notes, progs);
        }}
        notesCount={Object.values(notes).filter(Boolean).length} abcCount={abcRecords.length} />
      <NotesSheet isOpen={showNotes} onClose={() => setShowNotes(false)} notes={notes} onNotesChange={setNotes} />
      <ABCSheet isOpen={showABC} onClose={() => setShowABC(false)} records={abcRecords}
        onAddRecord={r => setABCRecords(prev => [...prev, r])} />
    </div>
  );
}

Object.assign(window, { INITIAL_CLIENTS, INITIAL_SESSIONS, useIndependentTimer, SessionScreen });

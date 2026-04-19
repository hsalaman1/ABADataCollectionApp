// Data review page — charts, session history, filters
// Reports page — progress reports with export

function DataReviewPage({ clients, sessions, onViewSession }) {
  const [selectedClientId, setSelectedClientId] = React.useState(clients[0]?.id || '');
  const [selectedBehavior, setSelectedBehavior] = React.useState(null);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const client = clients.find(c => c.id === selectedClientId);
  const clientSessions = sessions
    .filter(s => s.clientId === selectedClientId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredSessions = clientSessions.filter(s => {
    if (dateFrom && s.date < dateFrom) return false;
    if (dateTo && s.date > dateTo) return false;
    return true;
  });

  const chartSessions = [...filteredSessions].reverse().slice(-10);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Data Review"
        actions={client && clientSessions.length > 0 && (
          <OutlineBtn small onClick={() => alert('Export CSV')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
            </svg>
            Export CSV
          </OutlineBtn>
        )}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* Client selector */}
        <FormField label="Client">
          <Select value={selectedClientId}
            onChange={v => { setSelectedClientId(v); setSelectedBehavior(null); }}
            placeholder="Select a client..."
            options={clients.map(c => ({ value: c.id, label: c.name }))}
          />
        </FormField>

        {client && (
          <>
            {/* Behavior filter chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <button onClick={() => setSelectedBehavior(null)} style={{
                padding: '5px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                border: !selectedBehavior ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                background: !selectedBehavior ? '#f0fdfa' : '#fff',
                color: !selectedBehavior ? '#0d9488' : '#64748b', cursor: 'pointer',
              }}>All</button>
              {client.programs.map(p => (
                <button key={p.id} onClick={() => setSelectedBehavior(p.id)} style={{
                  padding: '5px 12px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                  border: selectedBehavior === p.id ? '1.5px solid #0d9488' : '1.5px solid #e2e8f0',
                  background: selectedBehavior === p.id ? '#f0fdfa' : '#fff',
                  color: selectedBehavior === p.id ? '#0d9488' : '#64748b', cursor: 'pointer',
                }}>{p.name}</button>
              ))}
            </div>

            {/* Chart area */}
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
              padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12 }}>
                TREND — Last {chartSessions.length} sessions
              </div>
              {chartSessions.length > 0 ? (
                <ChartPlaceholder sessions={chartSessions} programs={client.programs} selectedBehavior={selectedBehavior} />
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                  No session data yet
                </div>
              )}
            </div>

            {/* Date filters */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end',
            }}>
              <FormField label="From" style={{ marginBottom: 0, flex: 1 }}>
                <TextInput type="date" value={dateFrom} onChange={setDateFrom} />
              </FormField>
              <FormField label="To" style={{ marginBottom: 0, flex: 1 }}>
                <TextInput type="date" value={dateTo} onChange={setDateTo} />
              </FormField>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{
                  padding: '8px 12px', borderRadius: 6, border: 'none',
                  background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', marginBottom: 0,
                }}>Clear</button>
              )}
            </div>

            {/* Session list */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
              SESSION HISTORY ({filteredSessions.length})
            </div>
            {filteredSessions.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                No sessions found
              </div>
            )}
            {filteredSessions.map(session => (
              <button key={session.id} onClick={() => onViewSession?.(session)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px', background: '#fff', borderRadius: 8,
                  border: '1px solid #e2e8f0', marginBottom: 6, cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{session.dateLabel}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{session.duration}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {session.summary.slice(0, 4).map((s, i) => (
                    <div key={i} style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                    }}>
                      {s.name}: <strong>{s.value}</strong>
                    </div>
                  ))}
                </div>
                {session.notes && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.notes}
                  </div>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Simple inline chart (SVG-based, no deps)

function ChartPlaceholder({ sessions, programs, selectedBehavior }) {
  const displayed = selectedBehavior
    ? programs.filter(p => p.id === selectedBehavior)
    : programs.filter(p => p.category === 'acquisition');

  const colors = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const h = 160;
  const w = 600;
  const pad = { top: 10, right: 10, bottom: 24, left: 36 };

  // Generate plausible data
  const data = sessions.map((s, si) => {
    const point = { index: si, date: s.dateLabel?.split(',')[0] || `S${si+1}` };
    displayed.forEach(p => {
      const behaviorData = s.behaviorData?.find(b => b.id === p.id);
      point[p.id] = behaviorData?.pct ?? (30 + Math.round(Math.random() * 50 + si * 3));
    });
    return point;
  });

  const maxVal = 100;
  const xStep = sessions.length > 1 ? (w - pad.left - pad.right) / (sessions.length - 1) : 0;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = pad.top + (1 - v / maxVal) * (h - pad.top - pad.bottom);
          return (
            <React.Fragment key={v}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={pad.left - 4} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}%</text>
            </React.Fragment>
          );
        })}
        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={pad.left + i * xStep} y={h - 4} fontSize="8" fill="#94a3b8" textAnchor="middle">
            {d.date}
          </text>
        ))}
        {/* Lines */}
        {displayed.map((p, pi) => {
          const points = data.map((d, i) => {
            const x = pad.left + i * xStep;
            const y = pad.top + (1 - (d[p.id] || 0) / maxVal) * (h - pad.top - pad.bottom);
            return `${x},${y}`;
          });
          return (
            <React.Fragment key={p.id}>
              <polyline points={points.join(' ')} fill="none" stroke={colors[pi % colors.length]}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {data.map((d, i) => {
                const x = pad.left + i * xStep;
                const y = pad.top + (1 - (d[p.id] || 0) / maxVal) * (h - pad.top - pad.bottom);
                return <circle key={i} cx={x} cy={y} r="3" fill={colors[pi % colors.length]} />;
              })}
            </React.Fragment>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
        {displayed.map((p, pi) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
            <div style={{ width: 10, height: 3, borderRadius: 2, background: colors[pi % colors.length] }} />
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reports Page ──

function ReportsPage({ clients, sessions }) {
  const [selectedClientId, setSelectedClientId] = React.useState(clients[0]?.id || '');
  const client = clients.find(c => c.id === selectedClientId);
  const clientSessions = sessions.filter(s => s.clientId === selectedClientId);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Progress Reports"
        actions={client && (
          <div style={{ display: 'flex', gap: 6 }}>
            <PrimaryBtn small onClick={() => alert('Export PDF')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
              </svg>
              PDF
            </PrimaryBtn>
            <OutlineBtn small onClick={() => alert('Export DOCX')}>DOCX</OutlineBtn>
          </div>
        )}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <FormField label="Client">
          <Select value={selectedClientId} onChange={setSelectedClientId}
            placeholder="Select a client..."
            options={clients.map(c => ({ value: c.id, label: c.name }))}
          />
        </FormField>

        {client && (
          <>
            {/* Summary header */}
            <div style={{
              background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
              padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {clientSessions.length} sessions · {client.programs.length} programs
              </div>
            </div>

            {/* Goal progress cards */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Goal Progress
            </div>
            {client.programs.map((prog, pi) => {
              // Simulated progress
              const current = prog.category === 'deceleration'
                ? Math.max(0, 8 - pi * 2)
                : Math.min(100, 40 + pi * 15);
              const target = prog.category === 'deceleration' ? 0 : (prog.masteryCriteria?.percentage || 80);
              const pctProgress = prog.category === 'deceleration'
                ? Math.max(0, Math.round((1 - current / 8) * 100))
                : Math.round((current / target) * 100);
              const trend = pctProgress > 50 ? 'improving' : pctProgress > 30 ? 'stable' : 'needs attention';
              const trendColor = trend === 'improving' ? '#10b981' : trend === 'stable' ? '#f59e0b' : '#ef4444';

              const currentSto = (prog.stos || []).find(s => s.status === 'active');
              const masteredCount = (prog.stos || []).filter(s => s.status === 'mastered').length;

              return (
                <div key={prog.id} style={{
                  background: '#fff', borderRadius: 10,
                  border: `1px solid ${prog.category === 'deceleration' ? '#fecaca' : '#e2e8f0'}`,
                  padding: 14, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{prog.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                        {prog.category === 'deceleration' ? 'Deceleration' : 'Acquisition'} · {prog.dataType}
                      </div>
                    </div>
                    <div style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: `${trendColor}15`, color: trendColor,
                    }}>
                      {trend === 'improving' ? '↑' : trend === 'stable' ? '→' : '↓'} {trend}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {prog.category === 'deceleration' ? `${current}/session` : `${current}%`}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        Target: {prog.category === 'deceleration' ? '0' : `${target}%`}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#f1f5f9' }}>
                      <div style={{
                        height: 6, borderRadius: 3,
                        background: prog.category === 'deceleration' ? '#ef4444' : '#0d9488',
                        width: `${Math.min(100, pctProgress)}%`,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                  {/* STO status */}
                  {(prog.stos?.length > 0) && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {currentSto ? (
                        <span>Current STO: <strong>{currentSto.target}%</strong> — {currentSto.description}</span>
                      ) : (
                        <span>All STOs mastered</span>
                      )}
                      {masteredCount > 0 && <span style={{ color: '#10b981', marginLeft: 8 }}>★ {masteredCount} mastered</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary stats */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              marginTop: 8, marginBottom: 16,
            }}>
              {[
                { label: 'On Track', value: client.programs.filter(p => p.category === 'acquisition').length, color: '#10b981' },
                { label: 'Sessions', value: clientSessions.length, color: '#0d9488' },
                { label: 'STOs Mastered', value: client.programs.reduce((sum, p) => sum + (p.stos || []).filter(s => s.status === 'mastered').length, 0), color: '#6366f1' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0',
                  padding: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Session Detail Page (view + edit notes) ──

function SessionDetailPage({ session, client, onBack, onSave }) {
  const [notes, setNotes] = React.useState(session.notes || '');
  const [soapNotes, setSoapNotes] = React.useState(session.soapNotes || { subjective: '', objective: '', assessment: '', plan: '' });
  const [editing, setEditing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    onSave?.({ ...session, notes, soapNotes });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={session.dateLabel || 'Session Detail'}
        subtitle={client ? `${client.name} · ${session.duration}` : session.duration}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <OutlineBtn small onClick={onBack}>← Back</OutlineBtn>
            <OutlineBtn small onClick={() => alert('Export PDF')}>PDF</OutlineBtn>
          </div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, maxWidth: 700, margin: '0 auto', width: '100%' }}>
        {/* Behavior data summary */}
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Session Data
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {(session.summary || []).map((s, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 8, background: '#f8fafc',
                border: '1px solid #e2e8f0', textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Notes — viewable + editable */}
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Session Notes
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {saved && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Saved</span>}
              {!editing ? (
                <button onClick={() => setEditing(true)} style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                  background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>Edit</button>
              ) : (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditing(false)} style={{
                    padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0',
                    background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Cancel</button>
                  <PrimaryBtn small onClick={handleSave}>Save</PrimaryBtn>
                </div>
              )}
            </div>
          </div>
          {/* Quick notes */}
          {editing ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Session notes..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                background: '#fff', outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', minHeight: 80, boxSizing: 'border-box',
              }}
            />
          ) : (
            <div style={{
              padding: '10px 12px', borderRadius: 8, background: '#f8fafc',
              border: '1px solid #e2e8f0', minHeight: 50, fontSize: 14,
              color: notes ? '#1e293b' : '#94a3b8', lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}>
              {notes || 'No notes recorded for this session.'}
            </div>
          )}
        </div>

        {/* SOAP Notes */}
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            SOAP Notes
          </div>
          {[
            { key: 'subjective', label: 'S — Subjective', placeholder: 'Client presentation, caregiver report...' },
            { key: 'objective', label: 'O — Objective', placeholder: 'Data summary, observed behaviors...' },
            { key: 'assessment', label: 'A — Assessment', placeholder: 'Clinical interpretation, progress toward goals...' },
            { key: 'plan', label: 'P — Plan', placeholder: 'Next session goals, modifications...' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{f.label}</label>
              {editing ? (
                <textarea value={soapNotes[f.key] || ''} onChange={e => setSoapNotes(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b',
                    background: '#fff', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit', minHeight: 50, boxSizing: 'border-box',
                  }}
                />
              ) : (
                <div style={{
                  padding: '8px 10px', borderRadius: 8, background: '#f8fafc',
                  border: '1px solid #e2e8f0', fontSize: 13,
                  color: soapNotes[f.key] ? '#1e293b' : '#c0c8d4',
                  lineHeight: 1.5, minHeight: 36, whiteSpace: 'pre-wrap',
                }}>
                  {soapNotes[f.key] || f.placeholder}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ABC Records (read-only display) */}
        {session.abcRecords && session.abcRecords.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0',
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ABC Records ({session.abcRecords.length})
            </div>
            {session.abcRecords.map((r, i) => (
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

Object.assign(window, { DataReviewPage, ReportsPage, ChartPlaceholder, SessionDetailPage });

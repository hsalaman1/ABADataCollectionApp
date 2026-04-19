// Clients list page + Client admin/form with programs, STOs, descriptions

function ClientsListPage({ clients, onSelectClient, onNewClient }) {
  const [search, setSearch] = React.useState('');
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length !== 1 ? 's' : ''}`}
        actions={<PrimaryBtn small onClick={onNewClient}>+ New Client</PrimaryBtn>}
      />
      <div style={{ padding: '12px 16px 8px' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {filtered.length === 0 && search && (
          <EmptyState title={`No clients matching "${search}"`} subtitle="Try a different search term" />
        )}
        {clients.length === 0 && !search && (
          <EmptyState
            title="No clients yet"
            subtitle="Add your first client to get started with data collection."
            action={<PrimaryBtn onClick={onNewClient}>+ Add Client</PrimaryBtn>}
          />
        )}
        {filtered.map(client => (
          <button key={client.id} onClick={() => onSelectClient(client.id)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '14px 12px', background: '#fff', border: 'none',
            borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left',
            borderRadius: 0,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {client.programs.length} program{client.programs.length !== 1 ? 's' : ''} ·{' '}
                {client.sessions || 0} session{client.sessions !== 1 ? 's' : ''}
                {client.location && ` · ${client.location}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Quick status dots */}
              <div style={{ display: 'flex', gap: 3 }}>
                {client.programs.slice(0, 4).map((p, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 4,
                    background: p.category === 'deceleration' ? '#fca5a5' : '#6ee7b7',
                  }} title={p.name} />
                ))}
                {client.programs.length > 4 && (
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>+{client.programs.length - 4}</span>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Client Admin Page (edit info, manage programs + STOs) ──

function ClientAdminPage({ client, onSave, onBack, onDelete }) {
  const [form, setForm] = React.useState({
    name: client?.name || '',
    dateOfBirth: client?.dateOfBirth || '',
    phone: client?.phone || '',
    address: client?.address || '',
    location: client?.location || '',
  });
  const [programs, setPrograms] = React.useState(client?.programs || []);
  const [editingProgram, setEditingProgram] = React.useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [programTab, setProgramTab] = React.useState('acquisition');

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, programs });
  };

  const addProgram = () => {
    setEditingProgram({
      id: Date.now().toString(),
      name: '', definition: '', runDescription: '',
      category: programTab, dataType: programTab === 'deceleration' ? 'frequency' : 'event',
      isActive: true,
      stos: [],
      masteryCriteria: { percentage: 80, consecutiveSessions: 3, metric: 'independent' },
    });
  };

  const saveProgram = (prog) => {
    const exists = programs.find(p => p.id === prog.id);
    if (exists) {
      setPrograms(programs.map(p => p.id === prog.id ? prog : p));
    } else {
      setPrograms([...programs, prog]);
    }
    setEditingProgram(null);
  };

  const deleteProgram = (id) => {
    setPrograms(programs.filter(p => p.id !== id));
  };

  const acqPrograms = programs.filter(p => p.category === 'acquisition');
  const decelPrograms = programs.filter(p => p.category === 'deceleration');
  const filteredPrograms = programTab === 'acquisition' ? acqPrograms : decelPrograms;

  if (editingProgram) {
    return <ProgramEditor program={editingProgram} onSave={saveProgram} onCancel={() => setEditingProgram(null)} />;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={client ? 'Edit Client' : 'New Client'}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <OutlineBtn small onClick={onBack}>← Back</OutlineBtn>
            {client && <OutlineBtn small danger onClick={() => setShowDeleteConfirm(true)}>Delete</OutlineBtn>}
          </div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, maxWidth: 700 }}>
        {/* Client info */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Client Information</div>
          <FormField label="Client Name" required>
            <TextInput value={form.name} onChange={v => updateForm('name', v)} placeholder="Full name" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Date of Birth">
              <TextInput type="date" value={form.dateOfBirth} onChange={v => updateForm('dateOfBirth', v)} />
            </FormField>
            <FormField label="Phone">
              <TextInput value={form.phone} onChange={v => updateForm('phone', v)} placeholder="407-555-1234" />
            </FormField>
          </div>
          <FormField label="Address">
            <TextInput value={form.address} onChange={v => updateForm('address', v)} placeholder="Home address" />
          </FormField>
          <FormField label="Service Location">
            <Select value={form.location} onChange={v => updateForm('location', v)}
              placeholder="Select..."
              options={[
                { value: 'Home', label: 'Home' },
                { value: 'Clinic', label: 'Clinic' },
                { value: 'Community', label: 'Community' },
              ]}
            />
          </FormField>
        </div>

        {/* Programs section */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Programs & Targets
            </div>
            <PrimaryBtn small onClick={addProgram}>+ Add Program</PrimaryBtn>
          </div>

          {/* Acq / Decel tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            <button onClick={() => setProgramTab('acquisition')} style={{
              flex: 1, padding: '8px 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: programTab === 'acquisition' ? '#0d9488' : '#fff',
              color: programTab === 'acquisition' ? '#fff' : '#64748b',
            }}>Acquisition ({acqPrograms.length})</button>
            <button onClick={() => setProgramTab('deceleration')} style={{
              flex: 1, padding: '8px 0', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: programTab === 'deceleration' ? '#dc2626' : '#fff',
              color: programTab === 'deceleration' ? '#fff' : '#64748b',
            }}>Deceleration ({decelPrograms.length})</button>
          </div>

          {filteredPrograms.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              No {programTab} programs yet
            </div>
          )}

          {filteredPrograms.map(prog => (
            <div key={prog.id} style={{
              padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0',
              marginBottom: 8, background: prog.isActive ? '#fff' : '#f8fafc',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {prog.name}
                    {!prog.isActive && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6, fontWeight: 500 }}>INACTIVE</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {prog.dataType} · {prog.stos?.length || 0} STO{prog.stos?.length !== 1 ? 's' : ''}
                    {prog.masteryCriteria && ` · ${prog.masteryCriteria.percentage}% × ${prog.masteryCriteria.consecutiveSessions} sessions`}
                  </div>
                  {prog.definition && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>{prog.definition}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                  <button onClick={() => setEditingProgram({...prog})} style={{
                    padding: '4px 10px', borderRadius: 5, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Edit</button>
                  <button onClick={() => deleteProgram(prog.id)} style={{
                    padding: '4px 10px', borderRadius: 5, border: '1px solid #fecaca',
                    background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>×</button>
                </div>
              </div>
              {/* STO summary */}
              {prog.stos && prog.stos.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {prog.stos.map((sto, i) => (
                    <div key={i} style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: sto.status === 'mastered' ? '#dcfce7' : '#f0fdfa',
                      color: sto.status === 'mastered' ? '#16a34a' : '#0d9488',
                      border: `1px solid ${sto.status === 'mastered' ? '#bbf7d0' : '#ccfbf1'}`,
                    }}>
                      STO {i + 1}: {sto.target}% {sto.status === 'mastered' ? '★' : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save button */}
        <PrimaryBtn onClick={handleSave} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
          {client ? 'Save Changes' : 'Create Client'}
        </PrimaryBtn>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete?.(); }}
        title="Delete Client" danger
        message={`Delete ${form.name}? All session data will be permanently removed.`}
        confirmText="Delete Client"
      />
    </div>
  );
}

// ── Program Editor (full screen — name, definition, run description, data type, STOs, mastery) ──

function ProgramEditor({ program, onSave, onCancel }) {
  const [form, setForm] = React.useState({ ...program });
  const [newStoTarget, setNewStoTarget] = React.useState('');
  const [newStoDesc, setNewStoDesc] = React.useState('');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateMastery = (key, val) => setForm(f => ({
    ...f, masteryCriteria: { ...f.masteryCriteria, [key]: val }
  }));

  const addSTO = () => {
    if (!newStoTarget) return;
    const sto = {
      id: Date.now().toString(),
      target: parseInt(newStoTarget),
      description: newStoDesc || `Achieve ${newStoTarget}% accuracy`,
      status: 'active',
    };
    update('stos', [...(form.stos || []), sto]);
    setNewStoTarget('');
    setNewStoDesc('');
  };

  const removeSTO = (id) => {
    update('stos', form.stos.filter(s => s.id !== id));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title={program.name ? 'Edit Program' : 'New Program'}
        actions={<OutlineBtn small onClick={onCancel}>← Back</OutlineBtn>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 16, maxWidth: 600 }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Program Details
          </div>
          <FormField label="Program Name" required>
            <TextInput value={form.name} onChange={v => update('name', v)}
              placeholder={form.category === 'deceleration' ? 'e.g., Physical Aggression' : 'e.g., Follow 1-Step Directions'} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Category">
              <Select value={form.category} onChange={v => {
                update('category', v);
                if (v === 'deceleration') update('dataType', 'frequency');
              }} options={[
                { value: 'acquisition', label: 'Acquisition' },
                { value: 'deceleration', label: 'Deceleration' },
              ]} />
            </FormField>
            <FormField label="Data Type">
              <Select value={form.dataType} onChange={v => update('dataType', v)} options={
                form.category === 'acquisition'
                  ? [
                    { value: 'event', label: 'Event (trials ✓/✗)' },
                    { value: 'frequency', label: 'Frequency (count)' },
                    { value: 'duration', label: 'Duration (timer)' },
                    { value: 'interval', label: 'Interval' },
                  ]
                  : [
                    { value: 'frequency', label: 'Frequency (count)' },
                    { value: 'duration', label: 'Duration (timer)' },
                  ]
              } />
            </FormField>
          </div>
          <FormField label="Operational Definition">
            <TextArea value={form.definition} onChange={v => update('definition', v)}
              placeholder="Describe what counts as this behavior..." rows={3} />
          </FormField>
          <FormField label="How to Run This Program">
            <TextArea value={form.runDescription || ''} onChange={v => update('runDescription', v)}
              placeholder="Step-by-step instructions for the RBT on how to run trials, set up materials, deliver prompts, etc." rows={5} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.isActive !== false}
                onChange={e => update('isActive', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#0d9488' }} />
              Active
            </label>
          </div>
        </div>

        {/* Mastery Criteria */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Mastery Criteria
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Target %">
              <TextInput type="number" value={form.masteryCriteria?.percentage || 80}
                onChange={v => updateMastery('percentage', parseInt(v) || 0)} />
            </FormField>
            <FormField label="Consecutive Sessions">
              <TextInput type="number" value={form.masteryCriteria?.consecutiveSessions || 3}
                onChange={v => updateMastery('consecutiveSessions', parseInt(v) || 0)} />
            </FormField>
            <FormField label="Metric">
              <Select value={form.masteryCriteria?.metric || 'independent'}
                onChange={v => updateMastery('metric', v)}
                options={[
                  { value: 'independent', label: 'Independent' },
                  { value: 'correct', label: 'Correct' },
                ]} />
            </FormField>
          </div>
        </div>

        {/* STOs */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Short-Term Objectives (STOs)
          </div>
          {(form.stos || []).map((sto, i) => (
            <div key={sto.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 6,
              background: sto.status === 'mastered' ? '#f0fdf4' : '#fff',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sto.status === 'mastered' ? '#16a34a' : '#e2e8f0',
                color: sto.status === 'mastered' ? '#fff' : '#64748b',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{sto.target}% accuracy</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{sto.description}</div>
              </div>
              {sto.status === 'mastered' && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>★ MASTERED</span>}
              <button onClick={() => removeSTO(sto.id)} style={{
                width: 24, height: 24, borderRadius: 12, border: '1px solid #fecaca',
                background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          ))}
          {/* Add STO form */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
            <FormField label="Target %" style={{ marginBottom: 0, flex: '0 0 80px' }}>
              <TextInput type="number" value={newStoTarget} onChange={setNewStoTarget} placeholder="e.g. 50" />
            </FormField>
            <FormField label="Description (optional)" style={{ marginBottom: 0, flex: 1 }}>
              <TextInput value={newStoDesc} onChange={setNewStoDesc} placeholder="STO description..." />
            </FormField>
            <PrimaryBtn small onClick={addSTO} style={{ marginBottom: 0 }}>+ Add</PrimaryBtn>
          </div>
        </div>

        {/* Save */}
        <PrimaryBtn onClick={() => onSave(form)} style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
          Save Program
        </PrimaryBtn>
      </div>
    </div>
  );
}

Object.assign(window, { ClientsListPage, ClientAdminPage, ProgramEditor });

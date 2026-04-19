// Navigation shell — bottom tabs on phone, sidebar on tablet (Option A)

function AppShell({ activeTab, onTabChange, children }) {
  const tabs = [
    { key: 'clients', label: 'Clients', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { key: 'session', label: 'Session', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2' },
    { key: 'data', label: 'Data', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { key: 'reports', label: 'Reports', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {/* Bottom nav */}
      <nav style={{
        display: 'flex', borderTop: '1px solid #e2e8f0',
        background: '#fff', flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => onTabChange(t.key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '8px 0 6px', border: 'none', background: 'none',
            color: activeTab === t.key ? '#0d9488' : '#94a3b8',
            cursor: 'pointer', fontSize: 10, fontWeight: 600,
            transition: 'color 0.15s',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Page header

function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      padding: '16px 16px 12px', display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', background: '#fff', borderBottom: '1px solid #e2e8f0',
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

// Primary button

function PrimaryBtn({ children, onClick, style, small, danger }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '7px 14px' : '10px 18px',
      borderRadius: 8, border: 'none',
      background: danger ? '#ef4444' : '#0d9488',
      color: '#fff', fontSize: small ? 13 : 14, fontWeight: 600,
      cursor: 'pointer', minHeight: small ? 34 : 40,
      display: 'flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  );
}

function OutlineBtn({ children, onClick, style, small, danger }) {
  return (
    <button onClick={onClick} style={{
      padding: small ? '7px 14px' : '10px 18px',
      borderRadius: 8,
      border: `1.5px solid ${danger ? '#fecaca' : '#e2e8f0'}`,
      background: danger ? '#fef2f2' : '#fff',
      color: danger ? '#dc2626' : '#475569',
      fontSize: small ? 13 : 14, fontWeight: 600,
      cursor: 'pointer', minHeight: small ? 34 : 40,
      display: 'flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  );
}

// Search input

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        style={{
          width: '100%', padding: '10px 12px 10px 38px', borderRadius: 8,
          border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff',
          color: '#1e293b', outline: 'none',
        }}
      />
    </div>
  );
}

// Form field wrapper

function FormField({ label, required, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type }) {
  return (
    <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
        background: '#fff', outline: 'none', boxSizing: 'border-box',
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows || 3}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
        background: '#fff', outline: 'none', resize: 'vertical',
        fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: '1.5px solid #e2e8f0', fontSize: 14, color: value ? '#1e293b' : '#94a3b8',
        background: '#fff', outline: 'none', boxSizing: 'border-box',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Empty state

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, marginBottom: 16 }}>{subtitle}</div>}
      {action}
    </div>
  );
}

// Confirm dialog

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText, danger }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: 24, maxWidth: 360, width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <OutlineBtn small onClick={onClose}>Cancel</OutlineBtn>
          <PrimaryBtn small danger={danger} onClick={onConfirm}>{confirmText || 'Confirm'}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AppShell, PageHeader, PrimaryBtn, OutlineBtn, SearchInput,
  FormField, TextInput, TextArea, Select, EmptyState, ConfirmDialog,
});

# Mac Local Storage Options for ABA Data Collection App

## Current State

Your app currently uses **IndexedDB via Dexie.js** for local storage. This is a solid choice for a PWA, but there are several options available on Mac depending on how you run the app.

---

## Option 1: IndexedDB (Current Implementation)

### Where Data is Stored on Mac

When running in **Safari** or **Chrome**, IndexedDB data is stored at:

| Browser | Location |
|---------|----------|
| **Safari** | `~/Library/Safari/Databases/IndexedDB/` |
| **Chrome** | `~/Library/Application Support/Google/Chrome/Default/IndexedDB/` |
| **Firefox** | `~/Library/Application Support/Firefox/Profiles/<profile>/storage/default/` |
| **PWA (Chrome)** | `~/Library/Application Support/Google/Chrome/Default/IndexedDB/<origin>` |

### What It Looks Like

```
~/Library/Application Support/Google/Chrome/Default/IndexedDB/
└── http_localhost_3000.indexeddb.leveldb/
    ├── 000003.log
    ├── CURRENT
    ├── LOCK
    ├── LOG
    └── MANIFEST-000001
```

The actual data is stored in a LevelDB format (binary), not human-readable.

### Pros
- ✅ Already implemented in your app
- ✅ Works offline (PWA)
- ✅ Good performance for structured data
- ✅ No additional dependencies needed
- ✅ Cross-browser compatible

### Cons
- ❌ Browser-managed (can be cleared by user)
- ❌ Storage limits vary by browser (~50MB-unlimited depending on browser)
- ❌ Data tied to browser profile

---

## Option 2: File System Access API

### What It Does
Allows the web app to read/write files directly to the Mac's file system with user permission.

### Where Data Would Be Stored
**User-chosen location**, typically:
```
~/Documents/ABA Data Collection/
├── clients.json
├── sessions/
│   ├── session-2024-01-15-client1.json
│   └── session-2024-01-16-client2.json
└── exports/
    └── report-2024-01.pdf
```

### Implementation Example

```typescript
// src/utils/fileStorage.ts

interface FileStorageOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

// Save session data to a file
export async function saveSessionToFile(session: Session): Promise<void> {
  const options: FileStorageOptions = {
    suggestedName: `session-${session.clientName}-${new Date().toISOString().split('T')[0]}.json`,
    types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
  };

  try {
    // Get a handle to save the file
    const handle = await (window as any).showSaveFilePicker(options);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(session, null, 2));
    await writable.close();
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Error saving file:', err);
    }
  }
}

// Open and read session data from a file
export async function loadSessionFromFile(): Promise<Session | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
    });
    const file = await handle.getFile();
    const contents = await file.text();
    return JSON.parse(contents) as Session;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Error loading file:', err);
    }
    return null;
  }
}

// Save to a persistent directory (with permission)
export async function getDataDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const dirHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite'
    });
    return dirHandle;
  } catch (err) {
    console.error('Error getting directory:', err);
    return null;
  }
}
```

### Pros
- ✅ User controls data location
- ✅ Human-readable files (JSON)
- ✅ Easy to backup/sync with iCloud, Dropbox, etc.
- ✅ Data persists even if browser cache is cleared

### Cons
- ❌ Requires user interaction to pick directory
- ❌ Safari has limited support (not fully implemented)
- ❌ Chrome-only for full functionality
- ❌ More complex permission handling

---

## Option 3: Origin Private File System (OPFS)

### What It Does
A sandboxed file system specific to your app's origin, managed by the browser but with file-like semantics.

### Where Data is Stored on Mac

```
Chrome: ~/Library/Application Support/Google/Chrome/Default/File System/
Safari: ~/Library/Safari/FileStorage/
```

### Implementation Example

```typescript
// src/utils/opfsStorage.ts

export async function saveToOPFS(filename: string, data: object): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data));
  await writable.close();
}

export async function loadFromOPFS(filename: string): Promise<object | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const contents = await file.text();
    return JSON.parse(contents);
  } catch {
    return null;
  }
}

export async function listOPFSFiles(): Promise<string[]> {
  const root = await navigator.storage.getDirectory();
  const files: string[] = [];
  for await (const entry of (root as any).values()) {
    files.push(entry.name);
  }
  return files;
}
```

### Pros
- ✅ No user permission prompts
- ✅ File-based semantics
- ✅ Better for large binary data
- ✅ Works in Safari

### Cons
- ❌ Still browser-managed (can be cleared)
- ❌ Not human-readable location
- ❌ Newer API, still evolving

---

## Option 4: Electron Wrapper (Native Mac App)

### What It Does
Wraps your React app in a native Mac application with full file system access.

### Where Data Would Be Stored

```
~/Library/Application Support/ABA Data Collection/
├── data/
│   ├── clients.db (SQLite)
│   └── config.json
├── sessions/
│   └── *.json
└── logs/
    └── app.log
```

### Implementation Example

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveSession: (data: object) => ipcRenderer.invoke('save-session', data),
  loadSessions: () => ipcRenderer.invoke('load-sessions'),
  exportData: (format: string) => ipcRenderer.invoke('export-data', format),
  getDataPath: () => ipcRenderer.invoke('get-data-path')
});

// Usage in React
declare global {
  interface Window {
    electronAPI?: {
      saveSession: (data: object) => Promise<void>;
      loadSessions: () => Promise<Session[]>;
      exportData: (format: string) => Promise<string>;
      getDataPath: () => Promise<string>;
    };
  }
}

// src/utils/storage.ts
export async function saveSession(session: Session): Promise<void> {
  if (window.electronAPI) {
    // Running in Electron
    await window.electronAPI.saveSession(session);
  } else {
    // Running in browser - use IndexedDB
    await db.sessions.put(session);
  }
}
```

### Pros
- ✅ Full file system access
- ✅ True native Mac app experience
- ✅ Can use SQLite for better database features
- ✅ Auto-update capabilities
- ✅ Menu bar integration

### Cons
- ❌ Larger app size (~100MB+)
- ❌ Separate build/distribution process
- ❌ More maintenance overhead
- ❌ Loses PWA simplicity

---

## Option 5: Tauri (Lightweight Native)

### What It Does
Similar to Electron but uses the system's WebView (much smaller footprint).

### Where Data Would Be Stored

```
~/Library/Application Support/com.abadatacollection.app/
├── data.json
└── sessions/
```

### Implementation Example

```rust
// src-tauri/src/main.rs
use tauri::Manager;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn get_data_path(app: tauri::AppHandle) -> String {
    let path = app.path_resolver()
        .app_data_dir()
        .unwrap_or(PathBuf::from("."));
    path.to_string_lossy().to_string()
}

#[tauri::command]
fn save_session(app: tauri::AppHandle, session: String) -> Result<(), String> {
    let data_dir = app.path_resolver()
        .app_data_dir()
        .ok_or("Failed to get data dir")?;

    fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let file_path = data_dir.join("sessions.json");
    fs::write(file_path, session).map_err(|e| e.to_string())?;

    Ok(())
}
```

### Pros
- ✅ Very small bundle size (~5-10MB vs 100MB+ for Electron)
- ✅ Uses native WebView (better performance)
- ✅ Full file system access
- ✅ Rust backend (fast, secure)

### Cons
- ❌ Rust knowledge needed for backend
- ❌ Less mature ecosystem than Electron
- ❌ macOS-specific WebView quirks

---

## Option 6: Hybrid Approach (Recommended)

### Strategy
Keep IndexedDB as primary storage but add File System Access API for import/export.

### Implementation

```typescript
// src/utils/hybridStorage.ts

import { db, Session, Client } from '../db/database';

// Primary storage: IndexedDB (via Dexie)
// Already implemented in your app

// Secondary: File System for backup/export
export async function exportAllData(): Promise<void> {
  const clients = await db.clients.toArray();
  const sessions = await db.sessions.toArray();

  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    clients,
    sessions
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });

  // Try File System Access API first (Chrome)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `aba-data-backup-${new Date().toISOString().split('T')[0]}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback: Download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aba-data-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(): Promise<{ clients: number; sessions: number }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate and import
        if (data.clients && Array.isArray(data.clients)) {
          for (const client of data.clients) {
            await db.clients.put(client);
          }
        }

        if (data.sessions && Array.isArray(data.sessions)) {
          for (const session of data.sessions) {
            await db.sessions.put(session);
          }
        }

        resolve({
          clients: data.clients?.length || 0,
          sessions: data.sessions?.length || 0
        });
      } catch (err) {
        reject(err);
      }
    };

    input.click();
  });
}

// Auto-backup to OPFS (if available)
export async function autoBackupToOPFS(): Promise<void> {
  if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
    return; // OPFS not available
  }

  const clients = await db.clients.toArray();
  const sessions = await db.sessions.toArray();

  const backup = {
    timestamp: new Date().toISOString(),
    clients,
    sessions
  };

  const root = await navigator.storage.getDirectory();
  const backupDir = await root.getDirectoryHandle('backups', { create: true });
  const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
  const fileHandle = await backupDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(backup));
  await writable.close();
}
```

### Pros
- ✅ Works with current implementation
- ✅ Adds user-friendly backup/restore
- ✅ Progressive enhancement
- ✅ Works offline

### Cons
- ❌ Two storage systems to maintain
- ❌ File System Access still has browser limitations

---

## Storage Location Summary

| Method | Mac Location | User Accessible | Persists After Cache Clear |
|--------|-------------|-----------------|---------------------------|
| IndexedDB (Safari) | `~/Library/Safari/Databases/IndexedDB/` | No | No |
| IndexedDB (Chrome) | `~/Library/Application Support/Google/Chrome/Default/IndexedDB/` | No | No |
| File System Access | User-chosen (e.g., `~/Documents/`) | Yes | Yes |
| OPFS | Browser-managed sandbox | No | No |
| Electron | `~/Library/Application Support/<app>/` | Yes | Yes |
| Tauri | `~/Library/Application Support/<bundle-id>/` | Yes | Yes |

---

## Recommendation

For your ABA Data Collection App, I recommend the **Hybrid Approach** (Option 6):

1. **Keep IndexedDB/Dexie** as your primary storage (already working well)
2. **Add export/import functionality** using File System Access API
3. **Add auto-backup to OPFS** as a secondary safety net
4. **Consider Tauri** in the future if you need true native features

This approach:
- Preserves your existing work
- Adds data portability (users can backup to iCloud, Dropbox, etc.)
- Maintains PWA simplicity
- Provides a migration path to native if needed

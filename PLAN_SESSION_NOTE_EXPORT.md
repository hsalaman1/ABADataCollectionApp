# Implementation Plan: Parent Session Note Export Feature

## Overview
Add the ability to export professional session notes for parents in PDF and Word (.docx) formats. The document will follow the ABA session note template with company branding, session data, service documentation, and signature sections.

## Company Information
- **Company Name**: ABA Spot
- **Address**: 816 Pennsylvania Ave, Saint Cloud, FL, 34769
- **Email**: ABASpotFL@gmail.com

---

## Phase 1: Update Data Model

### File: `src/db/database.ts`

Add new fields to the `Session` interface:

```typescript
// New type for service codes
export type ServiceType = '97155' | '97153' | '97156';

export interface Session {
  // ... existing fields ...

  // New fields for parent session note
  sessionFocus?: string;              // Renamed from "Chief Complaint"
  location?: string;                  // Session location
  totalUnits?: number;                // Billing units
  serviceType?: ServiceType;          // CPT code selection
  parentParticipation?: boolean;      // Did parent participate?
  parentParticipationNotes?: string;  // If no, why not?

  // Service-specific documentation fields
  protocolModification?: string;      // 97155: Description of Modification & Client Responses
  protocolDescription?: string;       // 97153: Activities, Protocol Description & Client Responses
  familyTrainingDescription?: string; // 97156: Family Training Description
  generalNotes?: string;              // General Notes, Environmental Changes, Recommendations
}
```

### Database Migration
- Increment database version from 2 to 3
- Add migration to handle existing sessions (set new fields to undefined)

---

## Phase 2: Update Session Recording UI

### File: `src/pages/SessionPage.tsx`

Add new input sections to capture session note data:

1. **Header Section** (after session timer):
   - Session Focus (text input)
   - Location (text input, can auto-fill from client profile)
   - Total Units (number input)

2. **Service Type Selection** (new section):
   - Radio buttons or tabs for:
     - 97155 - Behavior Treatment with Protocol Modification (BCBA/BCaBA)
     - 97153 - Behavior Treatment by Protocol (Direct service/RBT)
     - 97156 - Family Training (BCBA/BCaBA)
   - Show all by default, user selects which applies

3. **Service Documentation Sections** (based on selection):
   - 97155: "Description of Modification & Client Responses" textarea
   - 97153: "Activities, Protocol Description & Client Responses" textarea
   - 97156: "Family Training Description" textarea

4. **Parent Participation Section**:
   - Toggle: "Did Parent(s)/Caregiver(s) participate?"
   - If No: "Why not?" text input

5. **General Notes Section**:
   - "General Notes, Environmental Changes, Recommendations, etc." textarea
   - This is separate from the existing session notes

### State Updates
- Add state variables for all new fields
- Update `saveSession()` function to include new fields
- Auto-save includes new fields

---

## Phase 3: Install Word Document Library

### Package Installation
```bash
npm install docx file-saver
npm install --save-dev @types/file-saver
```

The `docx` library allows creating Word documents programmatically with:
- Headers, footers
- Tables
- Text formatting
- Sections and paragraphs

---

## Phase 4: Create Export Functions

### File: `src/utils/export.ts`

Add two new export functions:

### 4.1 `exportParentSessionNotePDF(session, client)`

Creates a PDF matching the template layout:

**Page 1:**
```
+------------------------------------------+
|              ABA Spot                     |
|   816 Pennsylvania Ave, Saint Cloud, FL   |
|          ABASpotFL@gmail.com              |
+------------------------------------------+
| Name: [client]    | Date: [date]  | Therapist: [name] |
| Start: [time]     | End: [time]   | Total Units: [#]  |
| Session Focus: [text]            | Location: [text]   |
+------------------------------------------+
| Summary of Services (choose only 1):      |
+------------------------------------------+
| [ ] 97155 - Behavior Treatment with Protocol Modification |
|     Description of Modification & Client Responses:       |
|     [text area content]                                   |
+------------------------------------------+
| [ ] 97153 - Behavior Treatment by Protocol               |
|     Activities, Protocol Description & Client Responses:  |
|     [text area content]                                   |
+------------------------------------------+
| Did Parent(s)/Caregiver(s) participate? [Yes/No]         |
| If No, why not? [text]                                   |
+------------------------------------------+
```

**Page 2:**
```
+------------------------------------------+
| [ ] 97156 - Family Training              |
|     Description:                          |
|     [text area content]                   |
+------------------------------------------+
| General Notes, Environmental Changes,     |
| Recommendations, etc.                     |
|     [text area content]                   |
+------------------------------------------+
| Behavior Data Summary Table               |
| Behavior | Type | Value                   |
| ---------|------|------------------------ |
| [data rows]                               |
+------------------------------------------+
| Caregiver Signature: ________________     |
|                                           |
| Provider Signature: _________________     |
+------------------------------------------+
```

### 4.2 `exportParentSessionNoteDocx(session, client)`

Creates a Word document with the same layout as PDF:
- Uses `docx` library
- Includes company header
- Tables for header info
- Service sections with checkboxes
- Behavior data table
- Signature lines at bottom

### Helper Functions
- `createCompanyHeader()` - Returns header with company info
- `createSessionInfoTable()` - Returns table with session metadata
- `createServiceSection()` - Returns formatted service documentation
- `createBehaviorDataTable()` - Returns behavior summary table
- `createSignatureSection()` - Returns signature lines

---

## Phase 5: Update Export UI

### File: `src/pages/SessionDetailPage.tsx`

Update the export modal to include new options:

```tsx
<Modal title="Export Session">
  <div className="export-section">
    <h3>Data Export</h3>
    <button>Export to CSV</button>
    <button>Export to PDF</button>
  </div>

  <div className="export-section">
    <h3>Parent Session Note</h3>
    <button>Export as PDF (for printing)</button>
    <button>Export as Word Document</button>
  </div>

  {session.notes && (
    <div className="export-section">
      <h3>Notes Only</h3>
      <button>Export Notes as Text</button>
    </div>
  )}
</Modal>
```

---

## Phase 6: Update Session Detail View

### File: `src/pages/SessionDetailPage.tsx`

Add display sections for new fields:
- Show service type and documentation
- Show parent participation status
- Show general notes separately from session notes

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/db/database.ts` | Add ServiceType, new Session fields, bump version |
| `src/pages/SessionPage.tsx` | Add UI for new fields, update save logic |
| `src/utils/export.ts` | Add `exportParentSessionNotePDF()`, `exportParentSessionNoteDocx()` |
| `src/pages/SessionDetailPage.tsx` | Update export modal, display new fields |
| `package.json` | Add `docx` and `file-saver` dependencies |

---

## Document Layout Details

### Header (both formats)
- Company name: "ABA Spot" (bold, centered)
- Address: "816 Pennsylvania Ave, Saint Cloud, FL, 34769"
- Email: "ABASpotFL@gmail.com"

### Session Info Table
| Field | Value |
|-------|-------|
| Name | Client name |
| Date | Session date |
| Therapist | (from app user or manual entry) |
| Start Time | Session start |
| End Time | Session end |
| Total Units | User input |
| Session Focus | User input |
| Location | User input or from client profile |

### Service Sections
- Checkbox indicator for selected service
- Section header with CPT code and description
- Text content area

### Behavior Data Table
| Behavior | Type | Category | Value |
|----------|------|----------|-------|
| Auto-populated from session data |

### Signature Section
```
Caregiver Signature: _______________________________

Provider Signature: ________________________________
```

---

## Questions/Decisions

1. **Therapist Name**: Should this come from:
   - A new "therapist" field in settings?
   - Manual entry per session?
   - Default to empty for now?

2. **Auto-fill Location**: Should location auto-fill from client profile if available?

3. **Service Type Default**: Should all service types be shown, or only the selected one in the export?

---

## Implementation Order

1. Update database schema and types
2. Install dependencies (`docx`, `file-saver`)
3. Update SessionPage.tsx with new input fields
4. Create PDF export function
5. Create Word export function
6. Update SessionDetailPage.tsx export modal
7. Test all exports
8. Commit and push

---

## Estimated Complexity
- Database changes: Low
- UI changes: Medium (multiple new form fields)
- Export functions: High (PDF/Word generation with tables)
- Total new lines of code: ~500-700

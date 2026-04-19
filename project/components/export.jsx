// ABA Session Export — Word (.docx) and PDF
// Same visual theme as BehavioralObservationApp (Arial, blue #2B579A, shaded headers, zebra tables)

const FONT = 'Arial';
const BLUE = '2B579A';
const HEADER_BG = 'E8EEF4';
const ZEBRA = 'F5F5F5';
const BORDER_COLOR = 'D0D0D0';
const TEXT_COLOR = '333333';
const MUTED = '666666';
const WHITE = 'FFFFFF';
const BODY_SIZE = 20;
const SMALL_SIZE = 18;
const TITLE_SIZE = 32;

const BLUE_RGB = [43, 87, 154];
const HEADER_RGB = [232, 238, 244];
const ZEBRA_RGB = [245, 245, 245];
const TEXT_RGB = [51, 51, 51];
const MUTED_RGB = [102, 102, 102];
const BORDER_RGB = [208, 208, 208];

function exportFormatMs(ms) {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function exportFormatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function exportPct(correct, total) {
  if (!total) return '—';
  return `${correct}/${total} (${Math.round((correct / total) * 100)}%)`;
}

function exportFormatDate(d) {
  if (!d) return '';
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, mo, da] = parts;
  return `${months[parseInt(mo, 10) - 1]} ${parseInt(da, 10)}, ${y}`;
}

function buildExportData(client, elapsed, programStates, timerRefs, abcRecords, notes, activePrograms) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];

  const programs = activePrograms.map(prog => {
    const st = programStates[prog.id] || {};
    const timer = timerRefs[prog.id];
    const timerTotal = timer ? (timer.totalMs + (timer.isRunning ? timer.currentMs : 0)) : 0;

    if (prog.dataType === 'event') {
      const correct = st.trialsCorrect || 0;
      const total = st.trialsTotal || 0;
      return { ...prog, trialsCorrect: correct, trialsTotal: total, result: exportPct(correct, total) };
    }
    if (prog.dataType === 'frequency') {
      return { ...prog, count: st.count || 0, totalMs: timerTotal, instances: timer ? timer.instances : 0,
        result: String(st.count || 0) };
    }
    if (prog.dataType === 'duration') {
      return { ...prog, totalMs: timerTotal, instances: timer ? timer.instances : 0,
        result: exportFormatMs(timerTotal) };
    }
    return prog;
  });

  return {
    client,
    date,
    dateFormatted: exportFormatDate(date),
    duration: exportFormatElapsed(elapsed),
    programs,
    abcRecords: abcRecords || [],
    notes: notes || {},
  };
}

// ─────────────────────────────────────────────
// WORD (.docx)
// ─────────────────────────────────────────────

async function downloadSessionDocx(client, elapsed, programStates, timerRefs, abcRecords, notes, activePrograms) {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, WidthType, BorderStyle, AlignmentType, ShadingType,
    Header, Footer, PageNumber, TabStopType,
  } = window.docx;

  const data = buildExportData(client, elapsed, programStates, timerRefs, abcRecords, notes, activePrograms);

  const BD = {
    top:    { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    left:   { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    right:  { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  };

  function tr(text, opts = {}) {
    return new TextRun({ text: String(text ?? ''), font: FONT, size: BODY_SIZE, color: TEXT_COLOR, ...opts });
  }

  const sp = () => new Paragraph({ children: [], spacing: { before: 0, after: 80 } });

  function sectionHeader(title) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: BODY_SIZE, color: BLUE })],
            spacing: { before: 0, after: 0 },
          })],
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_BG },
          borders: BD,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
        })],
      })],
    });
  }

  function kvTable(rows) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([label, value]) => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [tr(label, { bold: true, color: MUTED, size: SMALL_SIZE })] })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_BG },
            borders: BD,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [tr(value || 'Not recorded', !value ? { italics: true, color: MUTED } : {})],
            })],
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: BD,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
          }),
        ],
      })),
    });
  }

  function dataTable(headers, rows) {
    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ children: [tr(h, { bold: true, size: SMALL_SIZE })] })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_BG },
        borders: BD,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      })),
    });
    const dataRows = rows.map((row, i) => new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({ children: [tr(String(cell ?? ''))] })],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: i % 2 === 0 ? WHITE : ZEBRA },
        borders: BD,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      })),
    }));
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
  }

  const makeDocxHeader = () => new Header({
    children: [
      new Paragraph({
        children: [tr('CONFIDENTIAL ABA SESSION REPORT', { size: 16, color: MUTED, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
      }),
      new Paragraph({
        children: [tr('ABA Data Collection Report', { size: TITLE_SIZE, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
      }),
    ],
  });

  const makeDocxFooter = () => new Footer({
    children: [
      new Paragraph({
        children: [
          tr('This document contains confidential client information protected under HIPAA/FERPA.', { size: 16, color: MUTED }),
          new TextRun({ text: '\t', font: FONT }),
          tr('Page ', { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
          tr(' of ', { size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR } },
        spacing: { before: 80 },
      }),
    ],
  });

  const children = [];

  // Session Info
  children.push(
    sectionHeader('Session Information'),
    kvTable([
      ['Client Name', data.client.name],
      ['Date of Birth', data.client.dateOfBirth || ''],
      ['Date', data.dateFormatted],
      ['Session Duration', data.duration],
      ['Location', data.client.location || ''],
    ]),
    sp()
  );

  // Acquisition Programs
  const acqProgs = data.programs.filter(p => p.category === 'acquisition');
  if (acqProgs.length > 0) {
    children.push(
      sectionHeader('Acquisition Programs'),
      dataTable(
        ['Program', 'Trials (C/T)', 'Result', 'Data Type'],
        acqProgs.map(p => [
          p.name,
          p.dataType === 'event' ? `${p.trialsCorrect}/${p.trialsTotal}` : '—',
          p.result,
          p.dataType === 'event' ? 'Event Recording' : p.dataType === 'duration' ? 'Duration' : 'Frequency',
        ])
      ),
      sp()
    );
  }

  // Deceleration Targets
  const decelProgs = data.programs.filter(p => p.category === 'deceleration');
  if (decelProgs.length > 0) {
    children.push(
      sectionHeader('Deceleration Targets'),
      dataTable(
        ['Behavior', 'Count', 'Total Duration', 'Instances'],
        decelProgs.map(p => [
          p.name,
          String(p.count || 0),
          p.totalMs ? exportFormatMs(p.totalMs) : '—',
          p.instances ? String(p.instances) : '—',
        ])
      ),
      sp()
    );
  }

  // ABC Data
  children.push(sectionHeader('ABC Data'));
  if (data.abcRecords.length > 0) {
    children.push(
      dataTable(
        ['Time', 'Antecedent', 'Behavior', 'Consequence'],
        data.abcRecords.map(r => {
          const time = r.timestamp
            ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            : '';
          return [time, r.antecedent || '', r.behavior || '', r.consequence || ''];
        })
      )
    );
  } else {
    children.push(new Paragraph({ children: [tr('No ABC entries recorded.', { italics: true, color: MUTED })] }));
  }
  children.push(sp());

  // Session Notes (SOAP)
  const noteRows = [
    ['Quick Note', data.notes.quick],
    ['S — Subjective', data.notes.subjective],
    ['O — Objective', data.notes.objective],
    ['A — Assessment', data.notes.assessment],
    ['P — Plan', data.notes.plan],
  ].filter(([, v]) => v && v.trim());

  if (noteRows.length > 0) {
    children.push(sectionHeader('Session Notes'), kvTable(noteRows), sp());
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE, color: TEXT_COLOR } } } },
    sections: [{
      headers: { default: makeDocxHeader() },
      footers: { default: makeDocxFooter() },
      properties: { page: { margin: { top: 1440, bottom: 1080, left: 1080, right: 1080 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const initials = (data.client.name || 'CLIENT').split(' ').map(w => w[0].toUpperCase()).join('');
  const dateStr = data.date.replace(/-/g, '.');
  window.saveAs(blob, `ABA Session Report ${initials} ${dateStr}.docx`);
}

// ─────────────────────────────────────────────
// PDF (jsPDF + autotable)
// ─────────────────────────────────────────────

function downloadSessionPdf(client, elapsed, programStates, timerRefs, abcRecords, notes, activePrograms) {
  const data = buildExportData(client, elapsed, programStates, timerRefs, abcRecords, notes, activePrograms);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 54;
  const contentW = pageW - margin * 2;
  let y = 60;

  // Page header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_RGB);
  doc.text('CONFIDENTIAL ABA SESSION REPORT', pageW / 2, 28, { align: 'center' });
  doc.setFontSize(18);
  doc.setTextColor(...TEXT_RGB);
  doc.text('ABA Data Collection Report', pageW / 2, 46, { align: 'center' });
  doc.setDrawColor(...BORDER_RGB);
  doc.line(margin, 52, pageW - margin, 52);

  function pdfSectionHeader(title) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [[title.toUpperCase()]],
      headStyles: { fillColor: HEADER_RGB, textColor: BLUE_RGB, fontStyle: 'bold', fontSize: 9, cellPadding: 5 },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT_RGB },
    });
    y = doc.lastAutoTable.finalY;
  }

  function pdfKvTable(rows) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      body: rows,
      columnStyles: {
        0: { fillColor: HEADER_RGB, fontStyle: 'bold', textColor: MUTED_RGB, cellWidth: contentW * 0.3 },
        1: { cellWidth: contentW * 0.7 },
      },
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT_RGB, cellPadding: 5 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  function pdfDataTable(headers, rows) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [headers],
      body: rows,
      headStyles: { fillColor: HEADER_RGB, textColor: BLUE_RGB, fontStyle: 'bold', fontSize: 9, cellPadding: 5 },
      bodyStyles: { fontSize: 9, textColor: TEXT_RGB, cellPadding: 5 },
      alternateRowStyles: { fillColor: ZEBRA_RGB },
      theme: 'grid',
      styles: { font: 'helvetica' },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Session Info
  pdfSectionHeader('Session Information');
  pdfKvTable([
    ['Client Name', data.client.name],
    ['Date of Birth', data.client.dateOfBirth || ''],
    ['Date', data.dateFormatted],
    ['Session Duration', data.duration],
    ['Location', data.client.location || ''],
  ]);

  // Acquisition Programs
  const acqProgs = data.programs.filter(p => p.category === 'acquisition');
  if (acqProgs.length > 0) {
    pdfSectionHeader('Acquisition Programs');
    pdfDataTable(
      ['Program', 'Trials (C/T)', 'Result', 'Data Type'],
      acqProgs.map(p => [
        p.name,
        p.dataType === 'event' ? `${p.trialsCorrect}/${p.trialsTotal}` : '—',
        p.result,
        p.dataType === 'event' ? 'Event Recording' : p.dataType === 'duration' ? 'Duration' : 'Frequency',
      ])
    );
  }

  // Deceleration Targets
  const decelProgs = data.programs.filter(p => p.category === 'deceleration');
  if (decelProgs.length > 0) {
    pdfSectionHeader('Deceleration Targets');
    pdfDataTable(
      ['Behavior', 'Count', 'Total Duration', 'Instances'],
      decelProgs.map(p => [
        p.name,
        String(p.count || 0),
        p.totalMs ? exportFormatMs(p.totalMs) : '—',
        p.instances ? String(p.instances) : '—',
      ])
    );
  }

  // ABC Data
  pdfSectionHeader('ABC Data');
  if (data.abcRecords.length > 0) {
    pdfDataTable(
      ['Time', 'Antecedent', 'Behavior', 'Consequence'],
      data.abcRecords.map(r => {
        const time = r.timestamp
          ? new Date(r.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : '';
        return [time, r.antecedent || '', r.behavior || '', r.consequence || ''];
      })
    );
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_RGB);
    doc.text('No ABC entries recorded.', margin, y + 4);
    y += 18;
  }

  // Session Notes
  const noteRows = [
    ['Quick Note', data.notes.quick],
    ['S — Subjective', data.notes.subjective],
    ['O — Objective', data.notes.objective],
    ['A — Assessment', data.notes.assessment],
    ['P — Plan', data.notes.plan],
  ].filter(([, v]) => v && v.trim());

  if (noteRows.length > 0) {
    pdfSectionHeader('Session Notes');
    pdfKvTable(noteRows);
  }

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BORDER_RGB);
    doc.line(margin, pageH - 36, pageW - margin, pageH - 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text('Confidential client information protected under HIPAA/FERPA.', margin, pageH - 22);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 22, { align: 'right' });
  }

  const initials = (data.client.name || 'CLIENT').split(' ').map(w => w[0].toUpperCase()).join('');
  const dateStr = data.date.replace(/-/g, '.');
  doc.save(`ABA Session Report ${initials} ${dateStr}.pdf`);
}

Object.assign(window, { downloadSessionDocx, downloadSessionPdf });

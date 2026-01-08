import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import type { Session, Client, BehaviorData } from '../db/database'
import { formatDate, formatDuration, formatDateTime } from './time'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF
  }
}

function getBehaviorValue(data: BehaviorData): string {
  switch (data.dataType) {
    case 'frequency':
      return String(data.count ?? 0)
    case 'duration':
      return formatDuration(data.totalDurationMs ?? 0)
    case 'interval':
      if (!data.intervals || data.intervals.length === 0) return '0%'
      const occurrences = data.intervals.filter(Boolean).length
      const percentage = Math.round((occurrences / data.intervals.length) * 100)
      return `${percentage}% (${occurrences}/${data.intervals.length})`
    case 'event':
      if (!data.trials || data.trials.length === 0) return '0/0 (0%)'
      const correct = data.trials.filter(Boolean).length
      const total = data.trials.length
      const pct = Math.round((correct / total) * 100)
      return `${correct}/${total} (${pct}%)`
    case 'deceleration':
      const count = data.decelCount ?? 0
      const duration = formatDuration(data.decelDurationMs ?? 0)
      return `${count} occurrences / ${duration}`
    default:
      return '-'
  }
}

function formatTimeOnly(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function exportSessionToCSV(session: Session, client: Client): void {
  const rows: string[][] = [
    ['Session Report'],
    ['Client', client.name],
    ['Date', formatDateTime(session.startTime)],
    ['Duration', formatDuration(session.durationMs ?? 0)],
    [''],
    ['Behavior', 'Type', 'Category', 'Value'],
  ]

  session.behaviorData.forEach(data => {
    rows.push([
      data.behaviorName,
      data.dataType,
      data.category || 'acquisition',
      getBehaviorValue(data)
    ])
  })

  // Add ABC data section if any deceleration behaviors have ABC records
  const decelWithABC = session.behaviorData.filter(
    d => d.dataType === 'deceleration' && d.abcRecords && d.abcRecords.length > 0
  )

  if (decelWithABC.length > 0) {
    rows.push([''])
    rows.push(['ABC DATA'])
    rows.push(['Behavior', 'Time', 'Antecedent', 'Antecedent Note', 'Consequence', 'Consequence Note'])

    decelWithABC.forEach(data => {
      data.abcRecords?.forEach(record => {
        rows.push([
          data.behaviorName,
          formatTimeOnly(record.timestamp),
          record.antecedent,
          record.antecedentNote || '',
          record.consequence,
          record.consequenceNote || ''
        ])
      })
    })
  }

  if (session.notes) {
    rows.push([''])
    rows.push(['Notes'])
    rows.push([session.notes])
  }

  const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  downloadFile(csvContent, `session_${client.name}_${formatDate(session.startTime)}.csv`, 'text/csv')
}

export function exportClientDataToCSV(sessions: Session[], client: Client): void {
  if (sessions.length === 0) return

  const behaviors = client.targetBehaviors
  const headers = ['Date', 'Duration', ...behaviors.map(b => `${b.name} (${b.dataType})`), 'Notes']

  const rows: string[][] = [headers]

  sessions.forEach(session => {
    const row = [
      formatDateTime(session.startTime),
      formatDuration(session.durationMs ?? 0),
    ]

    behaviors.forEach(behavior => {
      const data = session.behaviorData.find(d => d.behaviorId === behavior.id)
      row.push(data ? getBehaviorValue(data) : '-')
    })

    row.push(session.notes || '')
    rows.push(row)
  })

  const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  downloadFile(csvContent, `${client.name}_all_sessions.csv`, 'text/csv')
}

export function exportSessionToPDF(session: Session, client: Client): void {
  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.text('Session Report', 14, 22)

  doc.setFontSize(12)
  doc.text(`Client: ${client.name}`, 14, 35)
  doc.text(`Date: ${formatDateTime(session.startTime)}`, 14, 42)
  doc.text(`Duration: ${formatDuration(session.durationMs ?? 0)}`, 14, 49)

  const tableData = session.behaviorData.map(data => [
    data.behaviorName,
    data.dataType.charAt(0).toUpperCase() + data.dataType.slice(1),
    data.category || 'acquisition',
    getBehaviorValue(data)
  ])

  doc.autoTable({
    startY: 58,
    head: [['Behavior', 'Type', 'Category', 'Value']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [25, 118, 210] }
  })

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Add ABC data section if any deceleration behaviors have ABC records
  const decelWithABC = session.behaviorData.filter(
    d => d.dataType === 'deceleration' && d.abcRecords && d.abcRecords.length > 0
  )

  if (decelWithABC.length > 0) {
    doc.setFontSize(14)
    doc.text('ABC Data', 14, currentY + 15)

    const abcTableData: string[][] = []
    decelWithABC.forEach(data => {
      data.abcRecords?.forEach(record => {
        abcTableData.push([
          data.behaviorName,
          formatTimeOnly(record.timestamp),
          record.antecedent + (record.antecedentNote ? ` (${record.antecedentNote})` : ''),
          record.consequence + (record.consequenceNote ? ` (${record.consequenceNote})` : '')
        ])
      })
    })

    doc.autoTable({
      startY: currentY + 20,
      head: [['Behavior', 'Time', 'Antecedent', 'Consequence']],
      body: abcTableData,
      theme: 'striped',
      headStyles: { fillColor: [211, 47, 47] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 60 },
        3: { cellWidth: 60 }
      }
    })

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  }

  if (session.notes) {
    doc.setFontSize(14)
    doc.text('Notes:', 14, currentY + 15)
    doc.setFontSize(11)
    const splitNotes = doc.splitTextToSize(session.notes, 180)
    doc.text(splitNotes, 14, currentY + 24)
  }

  doc.save(`session_${client.name}_${formatDate(session.startTime)}.pdf`)
}

export function exportNotesToText(session: Session, client: Client): void {
  const content = `Session Notes
Client: ${client.name}
Date: ${formatDateTime(session.startTime)}
Duration: ${formatDuration(session.durationMs ?? 0)}

Notes:
${session.notes || '(No notes recorded)'}`

  downloadFile(content, `notes_${client.name}_${formatDate(session.startTime)}.txt`, 'text/plain')
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Company information for parent session notes
const COMPANY_INFO = {
  name: 'ABA Spot',
  address: '816 Pennsylvania Ave, Saint Cloud, FL, 34769',
  email: 'ABASpotFL@gmail.com'
}

function formatTimeOnly12h(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function exportParentSessionNotePDF(session: Session, client: Client): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = 15

  // Company Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(COMPANY_INFO.name, pageWidth / 2, currentY, { align: 'center' })
  currentY += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(COMPANY_INFO.address, pageWidth / 2, currentY, { align: 'center' })
  currentY += 5
  doc.text(COMPANY_INFO.email, pageWidth / 2, currentY, { align: 'center' })
  currentY += 10

  // Draw line under header
  doc.setLineWidth(0.5)
  doc.line(14, currentY, pageWidth - 14, currentY)
  currentY += 8

  // Session Info Table
  doc.autoTable({
    startY: currentY,
    head: [],
    body: [
      ['Name:', client.name, 'Date:', formatDate(session.startTime), 'Therapist:', ''],
      ['Start Time:', formatTimeOnly12h(session.startTime), 'End Time:', session.endTime ? formatTimeOnly12h(session.endTime) : '', 'Total Units:', session.totalUnits?.toString() || ''],
      ['Session Focus:', session.sessionFocus || '', 'Location:', session.sessionLocation || '', '', '']
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { fontStyle: 'bold', cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { fontStyle: 'bold', cellWidth: 25 },
      5: { cellWidth: 30 }
    }
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // Summary of Services section
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary of Services:', 14, currentY)
  currentY += 6

  // Service Type 97155
  doc.setFontSize(10)
  const is97155 = session.serviceType === '97155'
  doc.setFont('helvetica', 'bold')
  doc.text(`[${is97155 ? 'X' : ' '}] 97155 - Behavior Treatment with Protocol Modification (BCBA/BCaBA)`, 14, currentY)
  currentY += 5

  if (is97155 && session.protocolModification) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Description of Modification & Client Responses:', 18, currentY)
    currentY += 4
    doc.setFont('helvetica', 'normal')
    const splitText = doc.splitTextToSize(session.protocolModification, pageWidth - 36)
    doc.text(splitText, 18, currentY)
    currentY += splitText.length * 4 + 4
  } else {
    currentY += 2
  }

  // Service Type 97153
  doc.setFontSize(10)
  const is97153 = session.serviceType === '97153'
  doc.setFont('helvetica', 'bold')
  doc.text(`[${is97153 ? 'X' : ' '}] 97153 - Behavior Treatment by Protocol (Direct service)`, 14, currentY)
  currentY += 5

  if (is97153 && session.protocolDescription) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Activities, Protocol Description & Client Responses:', 18, currentY)
    currentY += 4
    doc.setFont('helvetica', 'normal')
    const splitText = doc.splitTextToSize(session.protocolDescription, pageWidth - 36)
    doc.text(splitText, 18, currentY)
    currentY += splitText.length * 4 + 4
  } else {
    currentY += 2
  }

  // Service Type 97156
  doc.setFontSize(10)
  const is97156 = session.serviceType === '97156'
  doc.setFont('helvetica', 'bold')
  doc.text(`[${is97156 ? 'X' : ' '}] 97156 - Family Training (BCBA/BCaBA)`, 14, currentY)
  currentY += 5

  if (is97156 && session.familyTrainingDescription) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('Description:', 18, currentY)
    currentY += 4
    doc.setFont('helvetica', 'normal')
    const splitText = doc.splitTextToSize(session.familyTrainingDescription, pageWidth - 36)
    doc.text(splitText, 18, currentY)
    currentY += splitText.length * 4 + 4
  } else {
    currentY += 2
  }

  // Parent Participation
  currentY += 4
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  const participation = session.parentParticipation === true ? 'Yes' : session.parentParticipation === false ? 'No' : '__'
  doc.text(`Did Parent(s)/Caregiver(s) participate?  ${participation}`, 14, currentY)

  if (session.parentParticipation === false && session.parentParticipationNotes) {
    currentY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`If No, why not? ${session.parentParticipationNotes}`, 18, currentY)
  }
  currentY += 8

  // Check if we need a new page
  if (currentY > 200) {
    doc.addPage()
    currentY = 20
  }

  // Behavior Data Table
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Behavior Data Summary:', 14, currentY)
  currentY += 4

  const behaviorTableData = session.behaviorData.map(data => [
    data.behaviorName,
    data.dataType.charAt(0).toUpperCase() + data.dataType.slice(1),
    data.category || 'acquisition',
    getBehaviorValue(data)
  ])

  doc.autoTable({
    startY: currentY,
    head: [['Behavior', 'Type', 'Category', 'Value']],
    body: behaviorTableData,
    theme: 'striped',
    headStyles: { fillColor: [25, 118, 210], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 }
  })

  currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // Check if we need a new page
  if (currentY > 220) {
    doc.addPage()
    currentY = 20
  }

  // General Notes Section
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('General Notes, Environmental Changes, Recommendations:', 14, currentY)
  currentY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (session.generalNotes) {
    const splitNotes = doc.splitTextToSize(session.generalNotes, pageWidth - 28)
    doc.text(splitNotes, 14, currentY)
    currentY += splitNotes.length * 4 + 4
  } else {
    doc.text('(No notes recorded)', 14, currentY)
    currentY += 8
  }

  // Session Notes (original notes field)
  if (session.notes) {
    currentY += 4
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Additional Session Notes:', 14, currentY)
    currentY += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const splitNotes = doc.splitTextToSize(session.notes, pageWidth - 28)
    doc.text(splitNotes, 14, currentY)
    currentY += splitNotes.length * 4 + 4
  }

  // Check if we need a new page for signatures
  if (currentY > 240) {
    doc.addPage()
    currentY = 20
  }

  // Signature Section
  currentY += 10
  doc.setLineWidth(0.3)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Caregiver Signature:', 14, currentY)
  doc.line(55, currentY, 140, currentY)
  currentY += 15

  doc.text('Provider Signature:', 14, currentY)
  doc.line(55, currentY, 140, currentY)

  // Save the PDF
  doc.save(`parent_session_note_${client.name}_${formatDate(session.startTime)}.pdf`)
}

export async function exportParentSessionNoteDocx(session: Session, client: Client): Promise<void> {
  const children: (Paragraph | Table)[] = []

  // Company Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: COMPANY_INFO.name, bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: COMPANY_INFO.address, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }),
    new Paragraph({
      children: [new TextRun({ text: COMPANY_INFO.email, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  )

  // Session Info Table
  const sessionInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name:', bold: true, size: 20 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: client.name, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true, size: 20 })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatDate(session.startTime), size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Therapist:', bold: true, size: 20 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE } })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Start Time:', bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatTimeOnly12h(session.startTime), size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'End Time:', bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: session.endTime ? formatTimeOnly12h(session.endTime) : '', size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Units:', bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: session.totalUnits?.toString() || '', size: 20 })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Session Focus:', bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: session.sessionFocus || '', size: 20 })] })], columnSpan: 2 }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Location:', bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: session.sessionLocation || '', size: 20 })] })], columnSpan: 2 })
        ]
      })
    ]
  })
  children.push(sessionInfoTable)

  // Summary of Services Header
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Summary of Services:', bold: true, size: 24 })],
      spacing: { before: 300, after: 150 }
    })
  )

  // Service Type 97155
  const is97155 = session.serviceType === '97155'
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `[${is97155 ? 'X' : '  '}] 97155 - Behavior Treatment with Protocol Modification (BCBA/BCaBA)`, bold: true, size: 20 })],
      spacing: { after: 100 }
    })
  )
  if (is97155 && session.protocolModification) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Description of Modification & Client Responses:', italics: true, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: session.protocolModification, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 150 }
      })
    )
  }

  // Service Type 97153
  const is97153 = session.serviceType === '97153'
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `[${is97153 ? 'X' : '  '}] 97153 - Behavior Treatment by Protocol (Direct service)`, bold: true, size: 20 })],
      spacing: { after: 100 }
    })
  )
  if (is97153 && session.protocolDescription) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Activities, Protocol Description & Client Responses:', italics: true, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: session.protocolDescription, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 150 }
      })
    )
  }

  // Service Type 97156
  const is97156 = session.serviceType === '97156'
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `[${is97156 ? 'X' : '  '}] 97156 - Family Training (BCBA/BCaBA)`, bold: true, size: 20 })],
      spacing: { after: 100 }
    })
  )
  if (is97156 && session.familyTrainingDescription) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Description:', italics: true, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: session.familyTrainingDescription, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 150 }
      })
    )
  }

  // Parent Participation
  const participation = session.parentParticipation === true ? 'Yes' : session.parentParticipation === false ? 'No' : '____'
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Did Parent(s)/Caregiver(s) participate?  ${participation}`, bold: true, size: 20 })],
      spacing: { before: 200, after: 100 }
    })
  )
  if (session.parentParticipation === false && session.parentParticipationNotes) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `If No, why not? ${session.parentParticipationNotes}`, size: 18 })],
        indent: { left: 360 },
        spacing: { after: 150 }
      })
    )
  }

  // Behavior Data Table
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Behavior Data Summary:', bold: true, size: 24 })],
      spacing: { before: 300, after: 150 }
    })
  )

  const behaviorTableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Behavior', bold: true, size: 18 })] })], shading: { fill: '1976d2' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Type', bold: true, size: 18 })] })], shading: { fill: '1976d2' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true, size: 18 })] })], shading: { fill: '1976d2' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true, size: 18 })] })], shading: { fill: '1976d2' } })
      ]
    }),
    ...session.behaviorData.map(data => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.behaviorName, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.dataType.charAt(0).toUpperCase() + data.dataType.slice(1), size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.category || 'acquisition', size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: getBehaviorValue(data), size: 18 })] })] })
      ]
    }))
  ]

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: behaviorTableRows
  }))

  // General Notes Section
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'General Notes, Environmental Changes, Recommendations:', bold: true, size: 24 })],
      spacing: { before: 300, after: 150 }
    }),
    new Paragraph({
      children: [new TextRun({ text: session.generalNotes || '(No notes recorded)', size: 18 })],
      spacing: { after: 150 }
    })
  )

  // Additional Session Notes
  if (session.notes) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Additional Session Notes:', bold: true, size: 24 })],
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [new TextRun({ text: session.notes, size: 18 })],
        spacing: { after: 150 }
      })
    )
  }

  // Signature Section
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Caregiver Signature: _______________________________', size: 20 })],
      spacing: { before: 400, after: 300 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Provider Signature: _______________________________', size: 20 })],
      spacing: { after: 200 }
    })
  )

  // Create the document
  const doc = new Document({
    sections: [{
      children: children
    }]
  })

  // Generate and save the document
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `parent_session_note_${client.name}_${formatDate(session.startTime)}.docx`)
}

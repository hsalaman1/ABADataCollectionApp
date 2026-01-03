import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
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

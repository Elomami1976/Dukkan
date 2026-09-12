export function download(text: string, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export function csv(title: string, headings: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let text = String(v)
    if (typeof v === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
  }
  download('\uFEFF' + [headings, ...rows].map(row => row.map(cell).join(',')).join('\r\n'), `${title}.csv`, 'text/csv;charset=utf-8')
}
export function printTable(title: string, headings: string[], rows: (string | number)[][]) {
  const frame = document.createElement('iframe')
  frame.setAttribute('title', title); frame.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;left:0;border:0'
  document.body.append(frame)
  const doc = frame.contentDocument!, win = frame.contentWindow!
  doc.documentElement.lang = 'ar'; doc.documentElement.dir = 'rtl'; doc.title = title
  const style = doc.createElement('style'); style.textContent = 'body{font:14px Tahoma,Arial;padding:20px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%;table-layout:auto}td,th{padding:8px;border:1px solid #bbb;text-align:right;overflow-wrap:anywhere}tr{break-inside:avoid}@page{size:auto;margin:12mm}'
  doc.head.append(style)
  const h1 = doc.createElement('h1'); h1.textContent = title; doc.body.append(h1)
  const table = doc.createElement('table'), head = doc.createElement('thead'), body = doc.createElement('tbody')
  const addRow = (values: (string | number)[], header = false) => { const tr = doc.createElement('tr'); values.forEach(v => { const td = doc.createElement(header ? 'th' : 'td'); td.textContent = String(v); tr.append(td) }); (header ? head : body).append(tr) }
  addRow(headings, true); rows.forEach(row => addRow(row)); table.append(head, body); doc.body.append(table)
  win.addEventListener('afterprint', () => frame.remove(), { once: true })
  setTimeout(() => { win.focus(); win.print() }, 100)
}

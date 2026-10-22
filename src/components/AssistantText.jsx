// Shows an assistant reply as plain paragraphs and bullet lines, stripping
// any markdown the model slips in.
export default function AssistantText({ text }) {
  const lines = String(text || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').split('\n')
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-800">
      {lines.map((line, i) => {
        const item = line.match(/^\s*([•*-]|\d+[.)])\s+(.*)$/)
        if (item) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="shrink-0 text-brand-500">{/\d/.test(item[1]) ? item[1].replace(')', '.') : '•'}</span>
              <span>{item[2]}</span>
            </p>
          )
        }
        return line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-1" />
      })}
    </div>
  )
}

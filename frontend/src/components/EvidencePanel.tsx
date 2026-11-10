import type { ReactNode } from 'react'

export default function EvidencePanel({ title = '来源与适用范围', children, notes }: { title?: string; children?: ReactNode; notes?: string[] }) {
  return <details className="evidence-panel"><summary>{title}</summary><div>{children}{notes && <ul>{notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}</div></details>
}

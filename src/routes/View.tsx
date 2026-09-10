import { useParams } from 'react-router-dom'

export default function View() {
  const { code } = useParams<{ code: string }>()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Viewer</h1>
      <p className="mt-2 text-sm break-all opacity-70">Diagram code: {code}</p>
    </main>
  )
}

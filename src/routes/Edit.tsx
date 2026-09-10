import { useParams } from 'react-router-dom'

export default function Edit() {
  const { code } = useParams<{ code?: string }>()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Editor</h1>
      <p className="mt-2 text-sm break-all opacity-70">
        {code ? `Diagram code: ${code}` : 'Start from scratch or paste a diagram.'}
      </p>
    </main>
  )
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Trash2, ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { interviewsApi } from '../api/interviews'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'

export default function InterviewsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => interviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      setDeleteTarget(null)
    },
  })

  const copyLink = (interview: { id: string; public_token?: string }) => {
    if (!interview.public_token) return
    const url = `${window.location.origin}/interview/${interview.public_token}`
    navigator.clipboard.writeText(url)
    setCopiedId(interview.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-base-800">Entrevistas</h1>
        <p className="text-sm text-base-400 mt-0.5">
          {interviews?.length ?? 0} entrevista{interviews?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : !interviews?.length ? (
        <div className="card">
          <EmptyState
            icon={MessageSquare}
            title="Sin entrevistas"
            description="Genera una entrevista desde el perfil de un candidato"
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Candidato</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Posición</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-50">
              {interviews.map((iv) => (
                <tr key={iv.id} className="hover:bg-base-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-base-800">{iv.candidate_name || '—'}</p>
                      <p className="text-xs text-base-400">{iv.candidate_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-base-500">
                    {iv.position_title || <span className="text-base-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={iv.type} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={iv.status} />
                  </td>
                  <td className="px-4 py-3">
                    {iv.score != null ? (
                      <span className="font-semibold text-teal-600">{iv.score}</span>
                    ) : (
                      <span className="text-base-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-base-400">
                    {new Date(iv.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {iv.status === 'pending' && iv.public_token && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyLink(iv) }}
                          className="p-1.5 hover:bg-base-100 rounded-lg text-base-400 hover:text-teal-600 transition-colors"
                          title="Copiar enlace"
                        >
                          {copiedId === iv.id ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} />}
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/interviews/' + iv.id)}
                        className="p-1.5 hover:bg-base-100 rounded-lg text-base-400 hover:text-teal-600 transition-colors"
                        title="Ver detalle"
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(iv.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-base-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar entrevista"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-base-600">¿Eliminar esta entrevista? Esta acción no se puede deshacer.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="btn-danger flex-1 justify-center"
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

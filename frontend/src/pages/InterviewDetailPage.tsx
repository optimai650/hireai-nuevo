import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, CheckCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { interviewsApi } from '../api/interviews'
import Badge from '../components/ui/Badge'
import ScoreBar from '../components/ui/ScoreBar'
import Spinner from '../components/ui/Spinner'

export default function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data: interview, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: () => interviewsApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const copyLink = () => {
    if (!interview?.public_token) return
    const url = `${window.location.origin}/interview/${interview.public_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!interview) {
    return (
      <div className="text-center py-16">
        <p className="text-base-500">Entrevista no encontrada</p>
        <button onClick={() => navigate('/interviews')} className="btn-primary mt-4">Volver</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/interviews')} className="btn-secondary px-2.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-base-800">
            Entrevista — {interview.candidate_name}
          </h1>
          <p className="text-sm text-base-400 mt-0.5">
            {interview.position_title || 'Sin posición'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={interview.type} />
          <Badge status={interview.status} />
        </div>
      </div>

      {/* Info + Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-base-400 mb-1">Score</p>
          <p className="text-3xl font-bold text-teal-600">
            {interview.score != null ? interview.score : '—'}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-base-400 mb-1">Preguntas</p>
          <p className="text-3xl font-bold text-base-700">
            {interview.questions?.length ?? 0}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-base-400 mb-1">Fecha</p>
          <p className="text-sm font-medium text-base-700">
            {new Date(interview.created_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
          {interview.completed_at && (
            <p className="text-xs text-base-400 mt-0.5">
              Completada: {new Date(interview.completed_at).toLocaleDateString('es-MX')}
            </p>
          )}
        </div>
      </div>

      {/* Public link */}
      {interview.status === 'pending' && interview.public_token && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-base-700 mb-3">Enlace para el candidato</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-base-50 rounded-lg px-3 py-2 text-sm text-base-500 truncate font-mono">
              {window.location.origin}/interview/{interview.public_token}
            </div>
            <button onClick={copyLink} className="btn-secondary text-sm">
              {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={`/interview/${interview.public_token}`}
              target="_blank"
              rel="noopener"
              className="btn-secondary text-sm"
            >
              <ExternalLink size={16} />
            </a>
          </div>
          {interview.expires_at && (
            <p className="text-xs text-base-400 mt-2">
              Expira: {new Date(interview.expires_at).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
        </div>
      )}

      {/* AI Evaluation */}
      {interview.ai_evaluation && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Evaluación AI</p>
          <p className="text-sm text-base-600 leading-relaxed whitespace-pre-wrap">
            {interview.ai_evaluation}
          </p>
        </div>
      )}

      {/* Questions + Responses */}
      {interview.questions && interview.questions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-base-500 uppercase tracking-wide">
            Preguntas y respuestas
          </p>
          {interview.questions.map((q, i) => (
            <div key={q.id} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-base-800">{q.question}</p>
                  <Badge status={q.type} className="mt-1.5" />
                </div>
              </div>

              {q.response ? (
                <div className="ml-9 space-y-2">
                  <div className="bg-base-50 rounded-lg p-3">
                    <p className="text-xs text-base-400 mb-1">Respuesta</p>
                    <p className="text-sm text-base-600 leading-relaxed">
                      {q.response.response_text || <span className="italic text-base-300">Sin respuesta</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <ScoreBar score={q.response.response_score} label="Score respuesta" size="sm" />
                    </div>
                  </div>
                  {q.response.ai_feedback && (
                    <p className="text-xs text-base-500 leading-relaxed italic">
                      {q.response.ai_feedback}
                    </p>
                  )}
                </div>
              ) : (
                <p className="ml-9 text-xs text-base-300 italic">Sin respuesta aún</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

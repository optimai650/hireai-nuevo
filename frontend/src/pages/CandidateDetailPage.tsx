import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Zap,
  ExternalLink,
  Copy,
} from 'lucide-react'
import { candidatesApi, type CandidateStatus } from '../api/candidates'
import { interviewsApi } from '../api/interviews'
import Badge from '../components/ui/Badge'
import ScoreBar from '../components/ui/ScoreBar'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import axios from 'axios'
import api from '../api/axios'

const STATUSES: CandidateStatus[] = [
  'new', 'reviewing', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'offer_extended', 'hired', 'rejected',
]

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', reviewing: 'En revisión', shortlisted: 'Preseleccionado',
  interview_scheduled: 'Entrevista agendada', interview_completed: 'Entrevista completada',
  offer_extended: 'Oferta enviada', hired: 'Contratado', rejected: 'Rechazado',
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [genType, setGenType] = useState<'general' | 'technical' | 'behavioral' | 'cultural'>('general')
  const [numQ, setNumQ] = useState(8)
  const [genError, setGenError] = useState('')
  const [cvError, setCvError] = useState('')
  const [copiedToken, setCopiedToken] = useState('')
  const [isLoadingCv, setIsLoadingCv] = useState(false)
  const cvTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRevokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const analyzingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      if (urlRevokeTimeoutRef.current) clearTimeout(urlRevokeTimeoutRef.current)
      if (analyzingRef.current) clearInterval(analyzingRef.current)
    }
  }, [])

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (candidate?.is_analyzing === 1) {
      analyzingRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['candidate', id] })
      }, 3000)
    } else {
      if (analyzingRef.current) {
        clearInterval(analyzingRef.current)
        analyzingRef.current = null
      }
    }
    return () => { if (analyzingRef.current) clearInterval(analyzingRef.current) }
  }, [candidate?.is_analyzing, queryClient, id])

  const updateMutation = useMutation({
    mutationFn: (data: { status?: CandidateStatus; notes?: string }) =>
      candidatesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => candidatesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      navigate('/candidates')
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => interviewsApi.generate({ candidateId: id!, type: genType, numQuestions: numQ }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] })
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      setShowGenerate(false)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setGenError(err.response?.data?.error || 'Error al generar entrevista')
      }
    },
  })

  const handleStatusChange = (status: CandidateStatus) => {
    updateMutation.mutate({ status })
  }

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes: notes ?? '' })
    setEditingNotes(false)
  }

  const handleViewCv = async () => {
    if (isLoadingCv) return
    setIsLoadingCv(true)
    const newWindow = window.open('', '_blank', 'noopener,noreferrer')
    try {
      const response = await api.get(`/candidates/${id}/cv`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      if (newWindow) newWindow.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
      if (urlRevokeTimeoutRef.current) clearTimeout(urlRevokeTimeoutRef.current)
      urlRevokeTimeoutRef.current = setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      newWindow?.close()
      setCvError('No se pudo descargar el CV. Intenta de nuevo.')
      if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current)
      cvTimeoutRef.current = setTimeout(() => setCvError(''), 4000)
    } finally {
      setIsLoadingCv(false)
    }
  }

  const copyInterviewLink = async (token: string, interviewId: string) => {
    const url = `${window.location.origin}/interview/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(interviewId)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => setCopiedToken(''), 2000)
    } catch {
      setCvError('No se pudo copiar el enlace al portapapeles.')
      if (cvTimeoutRef.current) clearTimeout(cvTimeoutRef.current)
      cvTimeoutRef.current = setTimeout(() => setCvError(''), 4000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <p className="text-base-500">Candidato no encontrado</p>
        <button onClick={() => navigate('/candidates')} className="btn-primary mt-4">
          Volver
        </button>
      </div>
    )
  }

  const skills = candidate.extracted_skills
    ? candidate.extracted_skills.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const strengths = candidate.ai_strengths
    ? candidate.ai_strengths.split('\n').filter(Boolean)
    : []

  const concerns = candidate.ai_concerns
    ? candidate.ai_concerns.split('\n').filter(Boolean)
    : []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Analyzing banner */}
      {candidate.is_analyzing === 1 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <Spinner size="sm" /> Analizando CV... Los scores aparecerán en unos segundos.
        </div>
      )}

      {/* CV Error */}
      {cvError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {cvError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/candidates')} className="btn-secondary px-2.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-base-800">{candidate.name}</h1>
          <p className="text-sm text-base-400 mt-0.5">
            {candidate.position_title || 'Sin posición asignada'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleViewCv}
            disabled={isLoadingCv}
            className="btn-secondary text-sm"
          >
            {isLoadingCv ? <><Spinner size="sm" /> Cargando...</> : <><FileText size={16} /> Ver CV</>}
          </button>
          <button
            onClick={() => { setShowGenerate(true); setGenError('') }}
            className="btn-primary text-sm"
          >
            <Zap size={16} /> Generar entrevista
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="btn-secondary text-sm text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-1">
          {/* Info card */}
          <div className="card p-5 space-y-3">
            {candidate.email && (
              <div className="flex items-center gap-2.5 text-sm text-base-600">
                <Mail size={15} className="text-base-400 shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            {candidate.phone && (
              <div className="flex items-center gap-2.5 text-sm text-base-600">
                <Phone size={15} className="text-base-400 shrink-0" />
                {candidate.phone}
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center gap-2.5 text-sm text-base-600">
                <MapPin size={15} className="text-base-400 shrink-0" />
                {candidate.location}
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm text-base-600">
              <Calendar size={15} className="text-base-400 shrink-0" />
              {new Date(candidate.created_at).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
            {candidate.years_experience != null && (
              <div className="text-sm text-base-600">
                <span className="font-medium">{candidate.years_experience}</span> años de experiencia
              </div>
            )}
          </div>

          {/* Status */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Estado</p>
            <div className="space-y-1">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    candidate.status === s
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'hover:bg-base-50 text-base-600'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="card p-5 space-y-3">
            <p className="text-xs font-semibold text-base-500 uppercase tracking-wide">Scores AI</p>
            <ScoreBar score={candidate.overall_score} label="Overall" />
            <ScoreBar score={candidate.experience_score} label="Experiencia" />
            <ScoreBar score={candidate.skills_score} label="Skills" />
            <ScoreBar score={candidate.education_score} label="Educación" />
            <ScoreBar score={candidate.cultural_fit_score} label="Fit cultural" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-2">
          {/* AI Summary */}
          {candidate.ai_summary && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Resumen AI</p>
              <p className="text-sm text-base-600 leading-relaxed">{candidate.ai_summary}</p>
            </div>
          )}

          {/* Strengths & Concerns */}
          {(strengths.length > 0 || concerns.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div className="card p-5">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <CheckCircle size={13} /> Fortalezas
                  </p>
                  <ul className="space-y-1.5">
                    {strengths.map((s, i) => (
                      <li key={i} className="text-sm text-base-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span> {s.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {concerns.length > 0 && (
                <div className="card p-5">
                  <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Áreas de atención
                  </p>
                  <ul className="space-y-1.5">
                    {concerns.map((c, i) => (
                      <li key={i} className="text-sm text-base-600 flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">•</span> {c.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Skills detectadas</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-base-500 uppercase tracking-wide">Notas</p>
              <button
                onClick={() => {
                  if (editingNotes) {
                    handleSaveNotes()
                  } else {
                    setNotes(candidate.notes ?? '')
                    setEditingNotes(true)
                  }
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                <Edit3 size={12} />
                {editingNotes ? 'Guardar' : 'Editar'}
              </button>
            </div>
            {editingNotes ? (
              <textarea
                value={notes ?? ''}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="input-field text-sm resize-none"
                placeholder="Añade notas sobre este candidato..."
                autoFocus
              />
            ) : (
              <p className="text-sm text-base-500 whitespace-pre-wrap">
                {candidate.notes || <span className="italic text-base-300">Sin notas</span>}
              </p>
            )}
          </div>

          {/* Interviews */}
          {candidate.interviews && candidate.interviews.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Entrevistas</p>
              <div className="space-y-2">
                {candidate.interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="flex items-center justify-between p-3 bg-base-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge status={iv.status} />
                        <Badge status={iv.type} />
                        {iv.score != null && (
                          <span className="text-xs font-semibold text-teal-600">Score: {iv.score}</span>
                        )}
                      </div>
                      <p className="text-xs text-base-400 mt-1">
                        {new Date(iv.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.status === 'pending' && iv.token != null && (
                        <button
                          onClick={() => copyInterviewLink(iv.token!, iv.id)}
                          className="p-1.5 hover:bg-base-200 rounded text-base-500"
                          title="Copiar enlace"
                        >
                          {copiedToken === iv.id ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} />}
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/interviews/' + iv.id)}
                        className="p-1.5 hover:bg-base-200 rounded text-base-500"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Interview Modal */}
      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generar entrevista AI">
        <div className="space-y-4">
          {genError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {genError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Tipo de entrevista</label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value as typeof genType)}
              className="input-field"
            >
              <option value="general">General</option>
              <option value="technical">Técnica</option>
              <option value="behavioral">Conductual</option>
              <option value="cultural">Fit cultural</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Número de preguntas</label>
            <input
              type="number"
              min={1}
              max={15}
              value={numQ}
              onChange={(e) => setNumQ(Number(e.target.value))}
              className="input-field"
            />
            <p className="text-xs text-base-400 mt-1">Entre 1 y 15 preguntas</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowGenerate(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {generateMutation.isPending ? <><Spinner size="sm" /> Generando...</> : <><Zap size={16} /> Generar</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Eliminar candidato" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-base-600">
            ¿Estás seguro de eliminar a <strong>{candidate.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDelete(false)} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
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

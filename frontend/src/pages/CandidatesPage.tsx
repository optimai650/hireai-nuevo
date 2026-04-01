import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { candidatesApi, type CandidateFilters, type CandidateStatus } from '../api/candidates'
import { positionsApi } from '../api/positions'
import Badge from '../components/ui/Badge'
import ScoreBar from '../components/ui/ScoreBar'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import axios from 'axios'

const STATUSES: CandidateStatus[] = [
  'new', 'reviewing', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'offer_extended', 'hired', 'rejected',
]

function UploadModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [positionId, setPositionId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.list().then(r => r.data),
    enabled: isOpen,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Selecciona un archivo PDF')
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('cv', file)
      if (positionId) fd.append('positionId', positionId)
      if (notes) fd.append('notes', notes)
      await candidatesApi.create(fd)
      onSuccess()
      onClose()
      setFile(null)
      setPositionId('')
      setNotes('')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Error al subir el CV')
      } else {
        setError('Error inesperado')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subir CV de candidato">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-base-700 mb-1.5">CV (PDF)*</label>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? 'border-teal-400 bg-teal-50' : 'border-base-200 hover:border-teal-300'
            }`}
            onClick={() => document.getElementById('cv-input')?.click()}
          >
            <input
              id="cv-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Upload size={20} className={file ? 'text-teal-500' : 'text-base-300'} style={{ margin: '0 auto 8px' }} />
            {file ? (
              <div>
                <p className="text-sm font-medium text-teal-700">{file.name}</p>
                <p className="text-xs text-teal-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-base-500">Click para seleccionar PDF</p>
                <p className="text-xs text-base-400 mt-1">Máximo 10 MB</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-base-700 mb-1.5">
            Posición <span className="text-base-400 font-normal">(opcional)</span>
          </label>
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="input-field"
          >
            <option value="">Sin posición específica</option>
            {positions?.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-base-700 mb-1.5">
            Notas <span className="text-base-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="Notas sobre el candidato..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button type="submit" disabled={uploading || !file} className="btn-primary flex-1 justify-center">
            {uploading ? <><Spinner size="sm" /> Analizando CV...</> : <><Upload size={16} /> Subir y analizar</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function CandidatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [filters, setFilters] = useState<CandidateFilters>({ page: 1, pageSize: 20 })
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', filters],
    queryFn: () => candidatesApi.list(filters).then(r => r.data),
  })

  const hasAnalyzing = data?.data.some(c => c.is_analyzing === 1)

  useEffect(() => {
    if (!hasAnalyzing) return
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    }, 3000)
    return () => clearInterval(interval)
  }, [hasAnalyzing, queryClient])

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.list().then(r => r.data),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters(f => ({ ...f, page: 1, search: search || undefined }))
  }

  const handleFilter = (key: keyof CandidateFilters, value: string) => {
    setFilters(f => ({ ...f, page: 1, [key]: value || undefined }))
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-800">Candidatos</h1>
          <p className="text-sm text-base-400 mt-0.5">
            {data?.pagination.total ?? 0} candidato{data?.pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={candidatesApi.exportCsvUrl(filters)}
            download="candidates.csv"
            className="btn-secondary text-sm"
          >
            <Download size={16} />
            Exportar CSV
          </a>
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
            <Plus size={16} />
            Subir CV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4">
        <div className="flex gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="input-field pl-9 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setFilters(f => ({ ...f, search: undefined, page: 1 })) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-secondary text-sm">Buscar</button>
          </form>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-sm ${showFilters ? 'bg-teal-50 text-teal-700 border-teal-200' : ''}`}
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-base-100 flex gap-3 flex-wrap">
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilter('status', e.target.value)}
              className="input-field text-sm max-w-48"
            >
              <option value="">Todos los estados</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <select
              value={filters.positionId || ''}
              onChange={(e) => handleFilter('positionId', e.target.value)}
              className="input-field text-sm max-w-48"
            >
              <option value="">Todas las posiciones</option>
              {positions?.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            <select
              value={filters.sortBy || ''}
              onChange={(e) => handleFilter('sortBy', e.target.value)}
              className="input-field text-sm max-w-48"
            >
              <option value="created_at">Fecha (más recientes)</option>
              <option value="overall_score">Score</option>
              <option value="name">Nombre</option>
            </select>

            <button
              onClick={() => { setFilters({ page: 1, pageSize: 20 }); setSearch('') }}
              className="text-sm text-base-500 hover:text-base-700 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="lg" />
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            icon={Users}
            title="Sin candidatos"
            description="Sube el primer CV para empezar"
            action={
              <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
                <Upload size={16} /> Subir CV
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Candidato</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Posición</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide w-36">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-base-500 uppercase tracking-wide">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-50">
                  {data.data.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate('/candidates/' + c.id)}
                      className="hover:bg-base-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-base-800">{c.name}</p>
                          <p className="text-xs text-base-400">{c.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-base-500">
                        {c.position_title || <span className="text-base-300">Sin posición</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.is_analyzing === 1 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Spinner size="sm" /> Analizando...
                          </span>
                        ) : (
                          <Badge status={c.status} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ScoreBar score={c.overall_score} showValue={false} size="sm" />
                          <span className="text-xs font-semibold text-base-700 w-6">{Math.round(c.overall_score)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-base-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-base-100">
                <p className="text-sm text-base-400">
                  Mostrando {((data.pagination.page - 1) * data.pagination.pageSize) + 1}–{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} de {data.pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
                    disabled={data.pagination.page <= 1}
                    className="btn-secondary text-sm px-2 py-1.5"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    className="btn-secondary text-sm px-2 py-1.5"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['candidates'] })}
      />
    </div>
  )
}

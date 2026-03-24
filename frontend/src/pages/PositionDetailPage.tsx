import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Users,
  Trash2,
  Edit3,
  Save,
  X,
  Star,
} from 'lucide-react'
import { positionsApi, type PositionType, type PositionStatus } from '../api/positions'
import Badge from '../components/ui/Badge'
import ScoreBar from '../components/ui/ScoreBar'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import axios from 'axios'

export default function PositionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<{
    title: string
    department: string
    location: string
    type: PositionType
    status: PositionStatus
    description: string
    requirements: string
  } | null>(null)
  const [editError, setEditError] = useState('')

  const { data: position, isLoading } = useQuery({
    queryKey: ['position', id],
    queryFn: () => positionsApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof positionsApi.update>[1]) =>
      positionsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position', id] })
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      setEditing(false)
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setEditError(err.response?.data?.error || 'Error al actualizar')
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => positionsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      navigate('/positions')
    },
  })

  const startEdit = () => {
    if (!position) return
    setEditData({
      title: position.title,
      department: position.department || '',
      location: position.location || '',
      type: position.type,
      status: position.status,
      description: position.description || '',
      requirements: position.requirements || '',
    })
    setEditing(true)
    setEditError('')
  }

  const saveEdit = () => {
    if (!editData) return
    updateMutation.mutate({
      title: editData.title,
      department: editData.department || undefined,
      location: editData.location || undefined,
      type: editData.type,
      status: editData.status,
      description: editData.description || undefined,
      requirements: editData.requirements || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!position) {
    return (
      <div className="text-center py-16">
        <p className="text-base-500">Posición no encontrada</p>
        <button onClick={() => navigate('/positions')} className="btn-primary mt-4">Volver</button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/positions')} className="btn-secondary px-2.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-base-800">{position.title}</h1>
          <p className="text-sm text-base-400 mt-0.5">{position.department || 'Sin departamento'}</p>
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
                <X size={16} /> Cancelar
              </button>
              <button onClick={saveEdit} disabled={updateMutation.isPending} className="btn-primary text-sm">
                {updateMutation.isPending ? <Spinner size="sm" /> : <><Save size={16} /> Guardar</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="btn-secondary text-sm">
                <Edit3 size={16} /> Editar
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="btn-secondary text-sm text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-500">Estado</span>
              {editing && editData ? (
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as PositionStatus })}
                  className="input-field text-sm max-w-32"
                >
                  <option value="open">Abierta</option>
                  <option value="paused">Pausada</option>
                  <option value="closed">Cerrada</option>
                </select>
              ) : (
                <Badge status={position.status} />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-base-500">Tipo</span>
              {editing && editData ? (
                <select
                  value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value as PositionType })}
                  className="input-field text-sm max-w-32"
                >
                  <option value="full-time">Tiempo completo</option>
                  <option value="part-time">Medio tiempo</option>
                  <option value="contract">Contrato</option>
                  <option value="internship">Prácticas</option>
                </select>
              ) : (
                <Badge status={position.type} />
              )}
            </div>

            {(position.location || editing) && (
              <div className="flex items-center gap-2 text-sm text-base-600">
                <MapPin size={14} className="text-base-400 shrink-0" />
                {editing && editData ? (
                  <input
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Ubicación"
                  />
                ) : (
                  position.location || '—'
                )}
              </div>
            )}

            {(position.salary_min || position.salary_max) && (
              <div className="flex items-center gap-2 text-sm text-base-600">
                <DollarSign size={14} className="text-base-400 shrink-0" />
                {position.salary_min?.toLocaleString()} – {position.salary_max?.toLocaleString()}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-base-600">
              <Users size={14} className="text-base-400 shrink-0" />
              {position.candidate_count} candidato{position.candidate_count !== 1 ? 's' : ''}
            </div>

            {position.avg_score != null && (
              <div className="flex items-center gap-2 text-sm text-base-600">
                <Star size={14} className="text-base-400 shrink-0" />
                Score promedio: {Math.round(position.avg_score)}
              </div>
            )}
          </div>

          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {editError}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4 lg:col-span-2">
          {/* Title in edit mode */}
          {editing && editData && (
            <div className="card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-700 mb-1.5">Título</label>
                <input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-700 mb-1.5">Departamento</label>
                <input
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="input-field"
                  placeholder="Tecnología"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Descripción</p>
            {editing && editData ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={4}
                className="input-field resize-none text-sm"
                placeholder="Descripción del puesto..."
              />
            ) : (
              <p className="text-sm text-base-600 whitespace-pre-wrap leading-relaxed">
                {position.description || <span className="text-base-300 italic">Sin descripción</span>}
              </p>
            )}
          </div>

          {/* Requirements */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-3">Requisitos</p>
            {editing && editData ? (
              <textarea
                value={editData.requirements}
                onChange={(e) => setEditData({ ...editData, requirements: e.target.value })}
                rows={5}
                className="input-field resize-none text-sm"
                placeholder="Requisitos del puesto..."
              />
            ) : (
              <p className="text-sm text-base-600 whitespace-pre-wrap leading-relaxed">
                {position.requirements || <span className="text-base-300 italic">Sin requisitos definidos</span>}
              </p>
            )}
          </div>

          {/* Candidates */}
          {position.candidates && position.candidates.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-base-100">
                <p className="text-xs font-semibold text-base-500 uppercase tracking-wide">Candidatos</p>
              </div>
              <div className="divide-y divide-base-50">
                {position.candidates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate('/candidates/' + c.id)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-base-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-base-800">{c.name}</p>
                      <p className="text-xs text-base-400">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={c.status} />
                      <div className="flex items-center gap-1.5 w-24">
                        <ScoreBar score={c.overall_score} showValue={false} size="sm" />
                        <span className="text-xs font-semibold text-base-600 w-5">{Math.round(c.overall_score)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Eliminar posición" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-base-600">
            ¿Eliminar la posición <strong>{position.title}</strong>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowDelete(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
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

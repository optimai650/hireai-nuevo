import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Briefcase, Users, Star } from 'lucide-react'
import { positionsApi, type CreatePositionData, type PositionType, type PositionStatus } from '../api/positions'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'

const schema = z.object({
  title: z.string().min(1, 'Título requerido'),
  department: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  location: z.string().optional(),
  type: z.string().default('full-time'),
  status: z.string().default('open'),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function CreatePositionModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'full-time', status: 'open' },
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const payload: CreatePositionData = {
        title: data.title,
        department: data.department || undefined,
        description: data.description || undefined,
        requirements: data.requirements || undefined,
        location: data.location || undefined,
        type: (data.type as PositionType) || 'full-time',
        status: (data.status as PositionStatus) || 'open',
        salary_min: data.salary_min ? parseInt(data.salary_min) : undefined,
        salary_max: data.salary_max ? parseInt(data.salary_max) : undefined,
      }
      await positionsApi.create(payload)
      reset()
      onSuccess()
      onClose()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.error || 'Error al crear la posición')
      } else {
        setApiError('Error inesperado')
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva posición" size="lg">
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {apiError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-base-700 mb-1.5">Título*</label>
            <input {...register('title')} className="input-field" placeholder="Ej: Senior Frontend Developer" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Departamento</label>
            <input {...register('department')} className="input-field" placeholder="Tecnología" />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Ubicación</label>
            <input {...register('location')} className="input-field" placeholder="Ciudad de México / Remoto" />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Tipo</label>
            <select {...register('type')} className="input-field">
              <option value="full-time">Tiempo completo</option>
              <option value="part-time">Medio tiempo</option>
              <option value="contract">Contrato</option>
              <option value="internship">Prácticas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Estado</label>
            <select {...register('status')} className="input-field">
              <option value="open">Abierta</option>
              <option value="paused">Pausada</option>
              <option value="closed">Cerrada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Salario mínimo</label>
            <input {...register('salary_min')} type="number" className="input-field" placeholder="0" />
          </div>

          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Salario máximo</label>
            <input {...register('salary_max')} type="number" className="input-field" placeholder="0" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-base-700 mb-1.5">Descripción</label>
            <textarea {...register('description')} rows={3} className="input-field resize-none" placeholder="Descripción del puesto..." />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-base-700 mb-1.5">Requisitos</label>
            <textarea {...register('requirements')} rows={4} className="input-field resize-none" placeholder="Requisitos del puesto (el AI usará esto para evaluar candidatos)..." />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
            {isSubmitting ? <Spinner size="sm" /> : 'Crear posición'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function PositionsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => positionsApi.list().then(r => r.data),
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-800">Posiciones</h1>
          <p className="text-sm text-base-400 mt-0.5">{positions?.length ?? 0} posición{positions?.length !== 1 ? 'es' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Nueva posición
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : !positions?.length ? (
        <div className="card">
          <EmptyState
            icon={Briefcase}
            title="Sin posiciones"
            description="Crea una posición para organizar tus candidatos"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
                <Plus size={16} /> Nueva posición
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate('/positions/' + p.id)}
              className="card p-5 cursor-pointer hover:shadow-md transition-all duration-150 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Briefcase size={17} className="text-teal-600" />
                </div>
                <Badge status={p.status} />
              </div>

              <h3 className="font-semibold text-base-800 mb-1 line-clamp-2">{p.title}</h3>
              {p.department && (
                <p className="text-xs text-base-400 mb-3">{p.department}</p>
              )}

              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-base-50">
                <div className="flex items-center gap-1.5 text-xs text-base-500">
                  <Users size={13} />
                  <span>{p.candidate_count} candidato{p.candidate_count !== 1 ? 's' : ''}</span>
                </div>
                {p.avg_score != null && (
                  <div className="flex items-center gap-1.5 text-xs text-base-500">
                    <Star size={13} />
                    <span>{Math.round(p.avg_score)} avg</span>
                  </div>
                )}
                <Badge status={p.type} className="ml-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      <CreatePositionModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['positions'] })}
      />
    </div>
  )
}

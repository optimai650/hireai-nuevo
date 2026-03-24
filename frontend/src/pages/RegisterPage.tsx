import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/ui/Spinner'
import axios from 'axios'

const schema = z.object({
  companyName: z.string().min(2, 'Mínimo 2 caracteres'),
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  domain: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPwd, setShowPwd] = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    try {
      const res = await authApi.register(data)
      setAuth(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setApiError(err.response?.data?.error || 'Error al registrarse')
      } else {
        setApiError('Error inesperado')
      }
    }
  }

  return (
    <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-base-800">HireAI</span>
          </div>
          <h1 className="text-xl font-semibold text-base-800">Crear cuenta</h1>
          <p className="text-sm text-base-400 mt-1">Registra tu empresa en HireAI</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {apiError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Nombre de la empresa</label>
              <input {...register('companyName')} className="input-field" placeholder="Acme Corp" />
              {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Tu nombre</label>
              <input {...register('name')} className="input-field" placeholder="Juan García" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Email corporativo</label>
              <input {...register('email')} type="email" className="input-field" placeholder="juan@empresa.com" autoComplete="email" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Mín. 8 chars, 1 mayúscula, 1 número"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">
                Dominio <span className="text-base-400 font-normal">(opcional)</span>
              </label>
              <input {...register('domain')} className="input-field" placeholder="empresa.com" />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
              {isSubmitting ? <Spinner size="sm" /> : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-base-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Building2, Lock, CheckCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Spinner from '../components/ui/Spinner'
import axios from 'axios'

// Profile form
const profileSchema = z.object({ name: z.string().min(2, 'Mínimo 2 caracteres') })
type ProfileForm = z.infer<typeof profileSchema>

// Company form
const companySchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  domain: z.string().optional(),
})
type CompanyForm = z.infer<typeof companySchema>

// Password form
const pwdSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir una mayúscula')
    .regex(/[0-9]/, 'Debe incluir un número'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
type PwdForm = z.infer<typeof pwdSchema>

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-base-800 flex items-center gap-2 mb-5">
        <Icon size={18} className="text-teal-600" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [companySuccess, setCompanySuccess] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [pwdError, setPwdError] = useState('')

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => authApi.getCompany().then(r => r.data),
  })

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '' },
  })

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => authApi.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
      setProfileError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) setProfileError(err.response?.data?.error || 'Error')
    },
  })

  // Company form
  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    values: { name: company?.name || '', domain: company?.domain || '' },
  })

  const updateCompany = useMutation({
    mutationFn: (data: CompanyForm) => authApi.updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] })
      setCompanySuccess(true)
      setTimeout(() => setCompanySuccess(false), 3000)
      setCompanyError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) setCompanyError(err.response?.data?.error || 'Error')
    },
  })

  // Password form
  const pwdForm = useForm<PwdForm>({ resolver: zodResolver(pwdSchema) })

  const changePassword = useMutation({
    mutationFn: (data: PwdForm) =>
      authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      pwdForm.reset()
      setPwdSuccess(true)
      setTimeout(() => setPwdSuccess(false), 3000)
      setPwdError('')
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) setPwdError(err.response?.data?.error || 'Error')
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-base-800">Configuración</h1>
        <p className="text-sm text-base-400 mt-0.5">Administra tu cuenta y empresa</p>
      </div>

      {/* Profile */}
      <Section title="Perfil" icon={User}>
        {profileError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{profileError}</div>
        )}
        {profileSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle size={16} /> Perfil actualizado
          </div>
        )}
        <form onSubmit={profileForm.handleSubmit(d => updateProfile.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Nombre</label>
            <input {...profileForm.register('name')} className="input-field" />
            {profileForm.formState.errors.name && (
              <p className="text-xs text-red-500 mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Email</label>
            <input value={user?.email || ''} disabled className="input-field opacity-50" />
            <p className="text-xs text-base-400 mt-1">El email no se puede cambiar</p>
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="btn-primary text-sm"
          >
            {updateProfile.isPending ? <Spinner size="sm" /> : 'Guardar perfil'}
          </button>
        </form>
      </Section>

      {/* Company */}
      {user?.role === 'admin' && (
        <Section title="Empresa" icon={Building2}>
          {companyError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{companyError}</div>
          )}
          {companySuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle size={16} /> Empresa actualizada
            </div>
          )}
          <form onSubmit={companyForm.handleSubmit(d => updateCompany.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Nombre de la empresa</label>
              <input {...companyForm.register('name')} className="input-field" />
              {companyForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{companyForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Dominio</label>
              <input {...companyForm.register('domain')} className="input-field" placeholder="empresa.com" />
            </div>
            <button
              type="submit"
              disabled={updateCompany.isPending}
              className="btn-primary text-sm"
            >
              {updateCompany.isPending ? <Spinner size="sm" /> : 'Guardar empresa'}
            </button>
          </form>
        </Section>
      )}

      {/* Password */}
      <Section title="Cambiar contraseña" icon={Lock}>
        {pwdError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{pwdError}</div>
        )}
        {pwdSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle size={16} /> Contraseña actualizada
          </div>
        )}
        <form onSubmit={pwdForm.handleSubmit(d => changePassword.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Contraseña actual</label>
            <input {...pwdForm.register('currentPassword')} type="password" className="input-field" autoComplete="current-password" />
            {pwdForm.formState.errors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{pwdForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Nueva contraseña</label>
            <input {...pwdForm.register('newPassword')} type="password" className="input-field" autoComplete="new-password" />
            {pwdForm.formState.errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{pwdForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-base-700 mb-1.5">Confirmar contraseña</label>
            <input {...pwdForm.register('confirmPassword')} type="password" className="input-field" autoComplete="new-password" />
            {pwdForm.formState.errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{pwdForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="btn-primary text-sm"
          >
            {changePassword.isPending ? <Spinner size="sm" /> : 'Cambiar contraseña'}
          </button>
        </form>
      </Section>
    </div>
  )
}

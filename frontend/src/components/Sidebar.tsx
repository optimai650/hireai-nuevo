import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  MessageSquare,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/candidates', icon: Users, label: 'Candidatos' },
  { to: '/positions', icon: Briefcase, label: 'Posiciones' },
  { to: '/interviews', icon: MessageSquare, label: 'Entrevistas' },
]

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="w-60 h-screen bg-white border-r border-base-100 flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-base-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-base-800 text-lg tracking-tight">HireAI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-base-600 hover:bg-base-50 hover:text-base-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-base-100 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-teal-50 text-teal-700'
                : 'text-base-600 hover:bg-base-50 hover:text-base-800'
            }`
          }
        >
          <Settings size={18} />
          Configuración
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>

        {/* User pill */}
        <div className="mt-3 px-3 py-2 bg-base-50 rounded-lg">
          <p className="text-xs font-semibold text-base-700 truncate">{user?.name}</p>
          <p className="text-xs text-base-400 truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  )
}

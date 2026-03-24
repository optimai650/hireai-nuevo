import { useQuery } from '@tanstack/react-query'
import {
  Users,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Star,
  CheckCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { analyticsApi } from '../api/analytics'
import Spinner from '../components/ui/Spinner'
import { useAuthStore } from '../store/authStore'

const STATUS_COLORS: Record<string, string> = {
  new: '#60a5fa',
  reviewing: '#fbbf24',
  shortlisted: '#14b8a6',
  interview_scheduled: '#a78bfa',
  interview_completed: '#818cf8',
  offer_extended: '#fb923c',
  hired: '#34d399',
  rejected: '#f87171',
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  iconColor?: string
  sub?: string
}

function StatCard({ title, value, icon: Icon, iconColor = 'text-teal-600', sub }: StatCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-base-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-base-800">{value}</p>
          {sub && <p className="text-xs text-base-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  })

  const { data: byStatus } = useQuery({
    queryKey: ['analytics', 'byStatus'],
    queryFn: () => analyticsApi.candidatesByStatus().then(r => r.data),
  })

  const { data: overTime } = useQuery({
    queryKey: ['analytics', 'overTime'],
    queryFn: () => analyticsApi.candidatesOverTime().then(r => r.data),
  })

  const { data: topSkills } = useQuery({
    queryKey: ['analytics', 'topSkills'],
    queryFn: () => analyticsApi.topSkills().then(r => r.data),
  })

  const { data: scoreDist } = useQuery({
    queryKey: ['analytics', 'scoreDist'],
    queryFn: () => analyticsApi.scoreDistribution().then(r => r.data),
  })

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-base-800">Dashboard</h1>
        <p className="text-base-400 text-sm mt-1">Hola {user?.name}, aquí está el resumen de hoy.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total candidatos"
          value={overview?.totalCandidates ?? 0}
          icon={Users}
        />
        <StatCard
          title="Posiciones activas"
          value={overview?.activePositions ?? 0}
          sub={`${overview?.totalPositions ?? 0} total`}
          icon={Briefcase}
        />
        <StatCard
          title="Score promedio"
          value={`${overview?.averageScore ?? 0}`}
          sub="Sobre 100"
          icon={Star}
        />
        <StatCard
          title="Entrevistas completadas"
          value={overview?.completedInterviews ?? 0}
          sub={`${overview?.interviewCompletionRate ?? 0}% tasa`}
          icon={CheckCircle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates over time */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-base-700 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal-600" />
            Candidatos (últimos 30 días)
          </h2>
          {overTime && overTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#0d9488" name="Candidatos" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="avg_score" stroke="#a78bfa" name="Score prom." strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-base-300 text-sm">Sin datos aún</div>
          )}
        </div>

        {/* By status */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-base-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-teal-600" />
            Por estado
          </h2>
          {byStatus && byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byStatus.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-base-300 text-sm">Sin datos aún</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-base-700 mb-4 flex items-center gap-2">
            <Star size={16} className="text-teal-600" />
            Distribución de scores
          </h2>
          {scoreDist ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e7e5e4' }} />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Candidatos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-base-300 text-sm">Sin datos</div>
          )}
        </div>

        {/* Top skills */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-base-700 mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-teal-600" />
            Top skills
          </h2>
          {topSkills && topSkills.length > 0 ? (
            <div className="space-y-2">
              {topSkills.slice(0, 8).map((s, i) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs text-base-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs font-medium text-base-700 truncate capitalize">{s.skill}</span>
                      <span className="text-xs text-base-400 ml-2">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-base-100 rounded-full">
                      <div
                        className="h-1.5 bg-teal-500 rounded-full"
                        style={{ width: `${(s.count / topSkills[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-base-300 text-sm">Sin datos</div>
          )}
        </div>
      </div>
    </div>
  )
}

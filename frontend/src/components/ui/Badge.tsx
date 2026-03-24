interface BadgeProps {
  status: string
  className?: string
}

const labels: Record<string, string> = {
  new: 'Nuevo',
  reviewing: 'En revisión',
  shortlisted: 'Preseleccionado',
  interview_scheduled: 'Entrevista agendada',
  interview_completed: 'Entrevista completada',
  offer_extended: 'Oferta enviada',
  hired: 'Contratado',
  rejected: 'Rechazado',
  open: 'Abierta',
  closed: 'Cerrada',
  paused: 'Pausada',
  pending: 'Pendiente',
  completed: 'Completada',
  'full-time': 'Tiempo completo',
  'part-time': 'Medio tiempo',
  contract: 'Contrato',
  internship: 'Prácticas',
  general: 'General',
  technical: 'Técnica',
  behavioral: 'Conductual',
  cultural: 'Cultural',
}

export default function Badge({ status, className = '' }: BadgeProps) {
  const cls = `badge-${status}`
  const label = labels[status] || status
  return <span className={`${cls} ${className}`}>{label}</span>
}

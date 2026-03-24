import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-base-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-base-400" />
      </div>
      <h3 className="text-base font-semibold text-base-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-base-400 max-w-xs mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

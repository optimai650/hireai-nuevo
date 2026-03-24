interface ScoreBarProps {
  score: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

function getColor(score: number) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-teal-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-400'
}

export default function ScoreBar({ score, label, showValue = true, size = 'md' }: ScoreBarProps) {
  const color = getColor(score)
  const height = size === 'sm' ? 'h-1.5' : 'h-2'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-base-500">{label}</span>}
          {showValue && <span className="text-xs font-semibold text-base-700">{Math.round(score)}</span>}
        </div>
      )}
      <div className={`w-full ${height} bg-base-100 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  )
}

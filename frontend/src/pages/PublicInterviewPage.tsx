import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Zap, AlertTriangle, ChevronRight, ChevronLeft, Send } from 'lucide-react'
import { interviewsApi } from '../api/interviews'
import Spinner from '../components/ui/Spinner'
import axios from 'axios'

export default function PublicInterviewPage() {
  const { token } = useParams<{ token: string }>()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ score: number; evaluation: string } | null>(null)
  const [submitError, setSubmitError] = useState('')

  const { data: interview, isLoading, error } = useQuery({
    queryKey: ['public-interview', token],
    queryFn: () => interviewsApi.getPublic(token!).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!interview) throw new Error('No interview')
      return interviewsApi.respond(interview.id, {
        token: token!,
        responses,
      })
    },
    onSuccess: (res) => {
      setSubmitted(true)
      setSubmitResult({
        score: res.data.score,
        evaluation: res.data.evaluation,
      })
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setSubmitError(err.response?.data?.error || 'Error al enviar respuestas')
      } else {
        setSubmitError('Error inesperado')
      }
    },
  })

  const handleResponse = (questionId: string, value: string) => {
    setResponses(r => ({ ...r, [questionId]: value }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !interview) {
    const msg = axios.isAxiosError(error)
      ? error.response?.data?.error || 'Entrevista no encontrada'
      : 'Entrevista no encontrada'

    return (
      <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-base-800 mb-2">Enlace no válido</h1>
          <p className="text-sm text-base-500">{msg}</p>
        </div>
      </div>
    )
  }

  if (submitted && submitResult) {
    return (
      <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-lg w-full text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-base-800 mb-2">¡Entrevista completada!</h1>
          <p className="text-sm text-base-500 mb-6">
            Gracias por completar la entrevista. El equipo de reclutamiento revisará tus respuestas.
          </p>

          <div className="bg-teal-50 rounded-xl p-5 mb-4">
            <p className="text-xs text-teal-600 font-medium mb-1">Tu score</p>
            <p className="text-4xl font-bold text-teal-700">{submitResult.score}</p>
            <p className="text-xs text-teal-500 mt-1">de 100</p>
          </div>

          {submitResult.evaluation && (
            <div className="text-left bg-base-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-base-500 uppercase tracking-wide mb-2">Feedback</p>
              <p className="text-sm text-base-600 leading-relaxed whitespace-pre-wrap">
                {submitResult.evaluation}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const questions = interview.questions || []
  const current = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const isLast = currentQuestion === questions.length - 1
  const currentResponse = current ? responses[current.id] || '' : ''

  return (
    <div className="min-h-screen bg-base-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-base-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-base-800">HireAI</span>
          </div>
          <div className="text-sm text-base-400">
            {interview.candidate_name} · {interview.position_title || 'Entrevista general'}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-base-100">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-base-100 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-base-400 shrink-0">
            {currentQuestion + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {current ? (
          <div className="w-full max-w-2xl">
            <div className="card p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-7 h-7 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {currentQuestion + 1}
                </span>
                <span className="text-xs text-base-400">{current.type}</span>
              </div>

              <p className="text-lg font-semibold text-base-800 leading-relaxed mb-6">
                {current.question}
              </p>

              <textarea
                value={currentResponse}
                onChange={(e) => handleResponse(current.id, e.target.value)}
                rows={6}
                className="input-field resize-none text-sm"
                placeholder="Escribe tu respuesta aquí..."
                maxLength={5000}
              />
              <p className="text-xs text-base-300 text-right mt-1">
                {currentResponse.length}/5000
              </p>

              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {submitError}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-base-100">
                <button
                  onClick={() => setCurrentQuestion(q => Math.max(0, q - 1))}
                  disabled={currentQuestion === 0}
                  className="btn-secondary text-sm"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                {isLast ? (
                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="btn-primary text-sm"
                  >
                    {submitMutation.isPending ? (
                      <><Spinner size="sm" /> Enviando...</>
                    ) : (
                      <><Send size={16} /> Enviar entrevista</>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestion(q => Math.min(questions.length - 1, q + 1))}
                    className="btn-primary text-sm"
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Question navigator */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    i === currentQuestion
                      ? 'bg-teal-600 text-white'
                      : responses[q.id]
                      ? 'bg-teal-50 text-teal-600 border border-teal-200'
                      : 'bg-white text-base-500 border border-base-200 hover:border-teal-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-base-400">Sin preguntas disponibles</p>
          </div>
        )}
      </div>
    </div>
  )
}

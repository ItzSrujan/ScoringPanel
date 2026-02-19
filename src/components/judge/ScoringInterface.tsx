import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { ArrowLeft, Send, Users, CheckCircle, Plus, Minus } from 'lucide-react'
import { Event, Team, Score, User } from '../../types'

interface ScoringInterfaceProps {
  currentUser: User
  events: Event[]
  teams: Team[]
  scores: Score[]
  onSubmitScore: (score: Omit<Score, 'id' | 'submittedAt'>) => Promise<void> | void
}

/* =========================================================
   SCORING CONFIG (LOW STARTS FROM 2)
========================================================= */
const SCORING_LEVELS: Record<
  number,
  {
    label: 'Low' | 'Average' | 'Excellent'
    min: number
    max: number
    color: string
    emoji: string
  }[]
> = {
  15: [
    { label: 'Low', min: 2, max: 5, color: 'red', emoji: '🟥' },
    { label: 'Average', min: 6, max: 10, color: 'amber', emoji: '🟨' },
    { label: 'Excellent', min: 11, max: 15, color: 'green', emoji: '🟩' },
  ],
  20: [
    { label: 'Low', min: 2, max: 7, color: 'red', emoji: '🟥' },
    { label: 'Average', min: 8, max: 14, color: 'amber', emoji: '🟨' },
    { label: 'Excellent', min: 15, max: 20, color: 'green', emoji: '🟩' },
  ],
}

const getSmartScore = (min: number, max: number, label: string) => {
  if (label === 'Excellent') return max
  return Number(((min + max) / 2).toFixed(1))
}

export function ScoringInterface({
  currentUser,
  events,
  teams,
  scores,
  onSubmitScore,
}: ScoringInterfaceProps) {
  const { eventId, teamId } = useParams<{ eventId: string; teamId?: string }>()
  const event = events.find(e => e.id === eventId)

  const judgeType = currentUser.judgeProfile?.type
  const currentRound: 'Round 1' | 'Round 2' = judgeType === 'Internal' ? 'Round 1' : 'Round 2'
  const roundKey = judgeType === 'Internal' ? 'round1' : 'round2'

  // Get teams for this round
  // Round 1 (Internal): Only allocated teams
  // Round 2 (External): use backend allocations
  const availableTeams = judgeType === 'External' && eventId
    ? teams.filter(t => t.eventId === eventId && (t.allocatedJudges?.round2?.length || 0) > 0)
    : teams.filter(t => t.eventId === eventId);

  // Always use currentUser.id for judgeId, for consistency with dashboard and score logic
  const judgeIdentifier = currentUser.id

  const eventTeams = judgeType === 'External'
    ? availableTeams.filter(t => t.allocatedJudges?.round2?.includes(judgeIdentifier))
    : availableTeams.filter(t => t.allocatedJudges?.[roundKey]?.includes(judgeIdentifier))

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(eventTeams[0]?.id || null)
  const selectedTeam = eventTeams.find(t => t.id === selectedTeamId) || null

  const [criterionScores, setCriterionScores] = useState<Record<string, number>>({})
  const [activeRanges, setActiveRanges] = useState<
    Record<string, { min: number; max: number }>
  >({})
  const [bonusScore, setBonusScore] = useState(0)
  // Track the actual submitted state based on the score record, not just local state
  const [submitted, setSubmitted] = useState(false)

  // Find if a finalized score already exists for this team by this judge
  const finalizedScore = scores.find(
    s =>
      s.eventId === eventId &&
      s.teamId === selectedTeam?.id &&
      s.judgeId === judgeIdentifier &&
      (s.round ? s.round === currentRound : currentRound === 'Round 1') &&
      s.isFinalized
  )

  useEffect(() => {
    const existingScore = scores.find(
      s =>
        s.eventId === eventId &&
        s.teamId === selectedTeam?.id &&
        s.judgeId === judgeIdentifier &&
        (s.round ? s.round === currentRound : currentRound === 'Round 1')
    )

    if (existingScore) {
      setCriterionScores(existingScore.scores)
      setBonusScore(existingScore.bonusScore || 0)
      setSubmitted(Boolean(existingScore.isFinalized))
    } else {
      setCriterionScores({})
      setBonusScore(0)
      setSubmitted(false)
    }
  }, [eventId, selectedTeam?.id, scores, judgeIdentifier, currentRound])

  useEffect(() => {
    if (eventTeams.length && !selectedTeamId) {
      setSelectedTeamId(eventTeams[0].id)
    }
    if (selectedTeamId && !eventTeams.find(t => t.id === selectedTeamId)) {
      setSelectedTeamId(eventTeams[0]?.id || null)
    }
  }, [eventTeams, selectedTeamId])

  useEffect(() => {
    // If URL contains a teamId param, use it to select the team
    if (teamId) {
      setSelectedTeamId(teamId)
    }
  }, [teamId])

  if (!event || !selectedTeam) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto mb-4 size-16 text-slate-300" />
        <p>No teams assigned</p>
      </div>
    )
  }

  const baseScore = Object.values(criterionScores).reduce((a, b) => a + b, 0)
  const totalScore = Number((baseScore + bonusScore).toFixed(1))

  const submit = async () => {
    const allScored = event.scoringCriteria.every(c => {
      const value = criterionScores[c.id]
      return typeof value === 'number' && !Number.isNaN(value)
    })

    if (!allScored) {
      alert('Please score all main criteria')
      return
    }

    try {
      await onSubmitScore({
        eventId: event.id,
        teamId: selectedTeam.id,
        judgeId: currentUser.id,
        judgeName: currentUser.name,
        scores: criterionScores,
        bonusScore: Number.isFinite(bonusScore) ? bonusScore : 0,
        totalScore,
        isFinalized: true,
        round: currentRound
      })

      setSubmitted(true)
      // navigate back to dashboard and pass a state flag so the dashboard shows a success banner
      try {
        // use a microtask to ensure state updates before navigation
        setTimeout(() => {
          // use History API navigation via Link alternative
          window.history.pushState({ submitted: true }, '')
          window.location.href = '/judge'
        }, 50)
      } catch (e) {
        // fallback: do nothing
      }
    } catch {
      // handled by submit handler
    }
  }

  /* =========================================================
     SUBMITTED VIEW (always show if finalizedScore exists)
  ========================================================= */
  if (submitted || finalizedScore) {
    // Use the finalized score if available, else fallback to local state
    const displayScore = finalizedScore || {
      scores: criterionScores,
      bonusScore,
      totalScore,
      teamId: selectedTeam.id,
      eventId: event.id,
    }
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-center">
        <CheckCircle className="mx-auto text-green-600" size={64} />
        <h1 className="text-3xl font-bold text-green-700">
          Score Submitted Successfully
        </h1>

        <div className="bg-white border rounded-xl p-6 text-left space-y-4">
          <div>
            <p className="text-sm text-slate-500">Team</p>
            <p className="text-xl font-bold">{selectedTeam.teamName}</p>
          </div>

          <div className="border-t pt-4 space-y-2">
            {event.scoringCriteria.map(c => (
              <div key={c.id} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-semibold">
                  {displayScore.scores[c.id]?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 flex justify-between">
            <span>Bonus</span>
            <span className="font-semibold">{(displayScore.bonusScore ?? 0).toFixed(1)}</span>
          </div>

          <div className="border-t pt-4 flex justify-between text-lg font-bold">
            <span>Total Score</span>
            <span className="text-green-700">{displayScore.totalScore}</span>
          </div>
        </div>

        <Link
          to="/judge"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  /* =========================================================
     SCORING VIEW
  ========================================================= */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to="/judge" className="flex items-center gap-2 text-slate-600">
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-3xl font-bold">{event.name}</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700 font-medium">Team</p>
        <p className="text-xl font-bold text-blue-900">
          {selectedTeam.teamName}
        </p>
        <p className="text-sm text-blue-700">{selectedTeam.domain}</p>
      </div>

      <div className="bg-white p-6 rounded-xl border space-y-10">
        {event.scoringCriteria.map(c => {
          const score = criterionScores[c.id]
          const range = activeRanges[c.id]
          const levels = SCORING_LEVELS[c.maxScore]

          const selectedLevel = range
            ? levels.find(l => l.min === range.min && l.max === range.max)
            : null

          return (
            <div key={c.id} className="space-y-4">
              <p className="font-semibold">{c.name}</p>

              <div className="grid grid-cols-3 gap-3">
                {levels.map(l => (
                  <button
                    key={l.label}
                    onClick={() => {
                      setCriterionScores(prev => ({
                        ...prev,
                        [c.id]: getSmartScore(l.min, l.max, l.label),
                      }))
                      setActiveRanges(prev => ({
                        ...prev,
                        [c.id]: { min: l.min, max: l.max },
                      }))
                    }}
                    className="p-3 rounded-xl border hover:bg-slate-100"
                  >
                    <p className="font-semibold">
                      {l.emoji} {l.label}
                    </p>
                    <p className="text-xs text-slate-600">
                      {l.min} – {l.max}
                    </p>
                  </button>
                ))}
              </div>

              {selectedLevel && score !== undefined && (
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={range!.min}
                    max={range!.max}
                    step={0.1}
                    value={score}
                    onChange={e =>
                      setCriterionScores(prev => ({
                        ...prev,
                        [c.id]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-blue-600"
                  />
                  <div className="font-semibold">
                    {score.toFixed(1)} / {selectedLevel.max}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-green-50 border border-green-300 rounded-xl p-6">
        <p className="font-semibold text-green-800 mb-4">
          Bonus Marks (Optional)
        </p>
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() => setBonusScore(Math.max(0, bonusScore - 0.5))}
            className="p-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
            disabled={bonusScore <= 0}
          >
            <Minus size={20} />
          </button>
          
          <div className="text-center">
            <p className="text-3xl font-bold text-green-700">
              {Number.isFinite(bonusScore) ? bonusScore.toFixed(1) : '0.0'}
            </p>
            <p className="text-xs text-green-600 mt-1">/ 5.0</p>
          </div>
          
          <button
            onClick={() => setBonusScore(Math.min(5, bonusScore + 0.5))}
            className="p-3 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
            disabled={bonusScore >= 5}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <button
        onClick={submit}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <Send size={18} /> Submit Score
      </button>
    </div>
  )
}

import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Calendar, Users, Trophy, CheckCircle, Clock, Award, Target, ChevronRight, Search } from 'lucide-react';
import { Event, Team, Score, User } from '../../types';

interface JudgeDashboardProps {
  currentUser: User;
  events: Event[];
  teams: Team[];
  scores: Score[];
}

export function JudgeDashboard({ currentUser, events, teams, scores }: JudgeDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const judgeProfile = currentUser.judgeProfile;
  const [showSubmittedBanner, setShowSubmittedBanner] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [caseFilter, setCaseFilter] = useState<'all' | 'uppercase' | 'lowercase' | 'mixed'>('all');

  // Filter events assigned to this judge
  const assignedEvents = events.filter(event =>
    judgeProfile?.assignedEventIds.includes(event.id)
  );

  // Set default event if not selected
  const activeEvent = selectedEventId 
    ? events.find(e => e.id === selectedEventId)
    : assignedEvents[0];

  // Determine current round based on judge type
  const judgeType = judgeProfile?.type;
  const currentRound: 'Round 1' | 'Round 2' = judgeType === 'Internal' ? 'Round 1' : 'Round 2';
  const roundKey = currentRound === 'Round 1' ? 'round1' : 'round2';

  // Get teams available for judging based on round
  const availableTeams = activeEvent && judgeType === 'External'
    ? teams.filter(t => t.eventId === activeEvent.id && (t.allocatedJudges?.round2?.length || 0) > 0)
    : teams;

  // Get teams allocated to this judge for the active event
  // Round 2 (External): ALL top 15 teams (no allocation needed)
  const eventTeams = judgeType === 'External' && activeEvent
    ? availableTeams.filter(t => t.allocatedJudges?.round2?.includes(currentUser.id))
    : availableTeams.filter(t => {
        if (!activeEvent) return false;
        if (t.eventId !== activeEvent.id) return false;
        
        // Check if this judge is allocated to this team in their round
        const allocatedJudges = t.allocatedJudges?.[roundKey];
        return allocatedJudges?.includes(currentUser.id);
      });

  // Calculate statistics
  const stats = useMemo(() => {
    const myScores = scores.filter(
      s => s.judgeId === currentUser.id && (s.round ? s.round === currentRound : currentRound === 'Round 1')
    );
    
    // Count total teams allocated to this judge across all assigned events
    let totalTeamsToScore = 0;
    assignedEvents.forEach(event => {
      if (judgeType === 'External') {
        const round2Teams = teams.filter(t => t.eventId === event.id && t.allocatedJudges?.round2?.includes(currentUser.id));
        totalTeamsToScore += round2Teams.length;
      } else {
        // Internal judges score only allocated teams
        const eventAvailableTeams = teams.filter(t => t.eventId === event.id);
        const eventTeamsForJudge = eventAvailableTeams.filter(t => {
          const allocatedJudges = t.allocatedJudges?.[roundKey];
          return allocatedJudges?.includes(currentUser.id);
        });
        totalTeamsToScore += eventTeamsForJudge.length;
      }
    });
    
    const scoredTeams = myScores.filter(s => s.isFinalized).length;
    const pendingTeams = totalTeamsToScore - scoredTeams;

    return {
      totalEvents: assignedEvents.length,
      totalTeamsToScore,
      scoredTeams,
      pendingTeams,
      completionRate: totalTeamsToScore > 0
        ? Math.round((scoredTeams / totalTeamsToScore) * 100)
        : 0
    };
  }, [assignedEvents, teams, scores, currentUser.id, roundKey]);

  const handleTeamClick = (teamId: string) => {
    if (activeEvent) {
      navigate(`/judge/events/${activeEvent.id}/score/${teamId}`);
    }
  };

  useEffect(() => {
    const submittedFlag = (location && (location as any).state && (location as any).state.submitted) || window.history.state?.submitted;
    if (submittedFlag) {
      setShowSubmittedBanner(true);
      const t = setTimeout(() => {
        setShowSubmittedBanner(false);
        // clear history state
        try { window.history.replaceState({}, ''); } catch (e) {}
        try { navigate('/judge', { replace: true }); } catch (e) {}
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [location, navigate]);

  // Filter teams based on search and case criteria
  const filteredTeams = useMemo(() => {
    return eventTeams.filter(team => {
      const teamName = team.teamName;
      
      // Search filter
      const matchesSearch = !searchTerm || teamName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Case filter
      if (caseFilter === 'uppercase') {
        return teamName === teamName.toUpperCase() && /[A-Z]/.test(teamName);
      } else if (caseFilter === 'lowercase') {
        return teamName === teamName.toLowerCase();
      } else if (caseFilter === 'mixed') {
        return teamName !== teamName.toUpperCase() && teamName !== teamName.toLowerCase();
      }
      
      return true;
    });
  }, [eventTeams, searchTerm, caseFilter]);

  // Get score status for a team
  const getTeamScoreStatus = (teamId: string) => {
    const score = scores.find(
      s => s.teamId === teamId && s.judgeId === currentUser.id && (s.round ? s.round === currentRound : currentRound === 'Round 1')
    );
    if (!score) return { status: 'pending', label: 'Not Scored', color: 'slate' };
    if (score.isFinalized) return { status: 'completed', label: 'Completed', color: 'green' };
    return { status: 'draft', label: 'Draft Saved', color: 'amber' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Judge Dashboard</h1>
          <p className="text-slate-600 mt-1">Welcome back, {currentUser.name}</p>
        </div>
        {judgeProfile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Award className="size-5 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-600">Judge Panel</span>
          </div>
        )}
      </div>

      {showSubmittedBanner && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 font-semibold">Score Submitted Successfully</p>
        </div>
      )}

      {/* ...removed Your Login Credentials section... */}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="size-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalEvents}</p>
          <p className="text-sm text-slate-600 mt-1">Assigned Events</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="size-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalTeamsToScore}</p>
          <p className="text-sm text-slate-600 mt-1">Total Teams</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="size-6 text-green-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600">
              {stats.completionRate}%
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.scoredTeams}</p>
          <p className="text-sm text-slate-600 mt-1">Teams Scored</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="size-6 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.pendingTeams}</p>
          <p className="text-sm text-slate-600 mt-1">Pending</p>
        </div>
      </div>

      {/* ...removed Your Expertise section... */}

      {/* Event Selector */}
      {assignedEvents.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Event</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {assignedEvents.map(event => {
              const isActive = activeEvent?.id === event.id;
              
              // Count teams allocated to this judge for this event
              let eventTeamsCount = 0;
              if (judgeType === 'External') {
                const round2Teams = teams.filter(t => t.eventId === event.id && t.allocatedJudges?.round2?.includes(currentUser.id));
                eventTeamsCount = round2Teams.length;
              } else {
                // Internal judges score only allocated teams
                const eventAvailableTeams = teams.filter(t => t.eventId === event.id);
                eventTeamsCount = eventAvailableTeams.filter(t => {
                  if (t.eventId !== event.id) return false;
                  const allocatedJudges = t.allocatedJudges?.[roundKey];
                  return allocatedJudges?.includes(currentUser.id);
                }).length;
              }
              
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`p-4 rounded-xl transition-all text-left border ${
                    isActive
                      ? 'bg-blue-50 border-blue-400 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <h3 className="font-medium text-slate-900 mb-1">{event.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Users className="size-3" />
                    {eventTeamsCount} teams
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams List */}
      {activeEvent ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{activeEvent.name}</h2>
                  <p className="text-sm text-slate-600 mt-1">Click on a team to start scoring</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  {filteredTeams.length}/{eventTeams.length} Teams
                </span>
              </div>
              
              {/* Search Bar (no filters) */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search team names..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="size-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{searchTerm || caseFilter !== 'all' ? 'No Teams Found' : 'No Teams Yet'}</h3>
              <p className="text-slate-600">{searchTerm || caseFilter !== 'all' ? 'Try adjusting your search or filters.' : 'There are no qualified teams for this event.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTeams.map((team, index) => {
                const scoreStatus = getTeamScoreStatus(team.id);
                const teamScore = scores.find(s => s.teamId === team.id && s.judgeId === currentUser.id);

                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team.id)}
                    className="w-full p-6 hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-6">
                      {/* Team Number */}
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-lg">#{index + 1}</span>
                      </div>

                      {/* Team Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                              {team.teamName}
                              <ChevronRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h3>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            scoreStatus.color === 'green'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : scoreStatus.color === 'amber'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {scoreStatus.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Domain Badge */}
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium border border-indigo-200">
                            <Target className="size-3" />
                            {team.domain}
                          </span>



                          {/* Score if exists */}
                          {teamScore && teamScore.isFinalized && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                              <Trophy className="size-3" />
                              Score: {teamScore.totalScore}/{activeEvent.scoringCriteria.reduce((sum, c) => sum + c.maxScore, 0)}
                            </span>
                          )}
                        </div>

                        {/* Problem Statement */}
                        {team.problemStatement && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs text-slate-500 mb-1 font-medium">Problem Statement:</p>
                            <p className="text-sm text-slate-700 line-clamp-2">
                              {team.problemStatement}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Calendar className="size-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Events Assigned</h3>
          <p className="text-slate-600">You don't have any events assigned yet. Please contact the admin.</p>
        </div>
      )}
    </div>
  );
}
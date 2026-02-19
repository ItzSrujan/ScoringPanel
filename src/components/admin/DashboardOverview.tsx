// admin/DashboardOverview.tsx
import { useState } from 'react';
import { Event, Team, Score, Judge } from '../../types';
import { Users, Scale, FileText, Award, Loader2 } from 'lucide-react';

interface DashboardOverviewProps {
  events: Event[];
  teams: Team[];
  scores: Score[];
  judges: Judge[];
}

export function DashboardOverview({ events, teams, scores, judges }: DashboardOverviewProps) {
  // Compute metrics
  const registeredTeams = teams.length;
  const activeJudges = judges.length; // All judges are considered active
  const round1Scores = scores.filter(s => s.round === 'Round 1').length;
  const round2Scores = scores.filter(s => s.round === 'Round 2').length;

  const [loading, setLoading] = useState(false);
  const [round1Calculated, setRound1Calculated] = useState(false);

  const stats = [
    {
      label: 'Registered Teams',
      value: registeredTeams,
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Judges Count',
      value: activeJudges,
      icon: Scale,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      label: 'Round 1 Scores Submitted',
      value: round1Scores,
      icon: FileText,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Round 2 Scores Submitted',
      value: round2Scores,
      icon: Award,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  // ...existing code...
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="text-slate-600">Overview of all events and activities</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4"
            >
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
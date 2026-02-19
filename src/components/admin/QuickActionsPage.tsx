// admin/QuickActionsPage.tsx
import { Link } from 'react-router-dom';
import { CheckCircle, Users, TrendingUp } from 'lucide-react';

export function QuickActionsPage() {
  const actions = [
    {
      to: '/admin/allocation-view',
      icon: Users,
      title: 'View Allocations',
      description: 'See all judge–team assignments',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      to: '/admin/live-updates',
      icon: TrendingUp,
      title: 'Live Updates',
      description: 'Real‑time scoring dashboard',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="w-full px-6 lg:px-10 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quick Actions</h1>
        <p className="text-slate-600">Perform common administrative tasks</p>
      </div>

      {/* Larger cards with increased spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-4 p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all duration-200"
            >
              {/* Larger icon container */}
              <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`size-6 ${action.iconColor}`} />
              </div>
              {/* Adjusted text sizes */}
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-500">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
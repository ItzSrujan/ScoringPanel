import { useState } from 'react';
import { Shield, Gavel, Mail, Lock, ArrowRight, Hash } from 'lucide-react';
import { User } from '../../types';
import { login } from '../../api/scoringApi';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'judge' | null>(null);
  const [adminId, setAdminId] = useState('');
  const [judgeId, setJudgeId] = useState('');
  const [error, setError] = useState('');

  const buildUser = (payload: { id: string; name: string; role: 'admin' | 'judge'; judgeId: string; judgeType?: 'Internal' | 'External' }): User => {
    if (payload.role === 'judge') {
      const match = payload.judgeId.match(/\d+/);
      const numericId = match ? Number(match[0]) : 0;
      const inferredType = numericId >= 11 || payload.judgeId.toLowerCase().includes('ext') ? 'External' : 'Internal';
      const type = payload.judgeType || inferredType;
      return {
        id: payload.judgeId,
        name: payload.name,
        email: '',
        role: 'judge',
        judgeProfile: {
          id: payload.judgeId,
          name: payload.name,
          email: '',
          expertise: ['All Domains'],
          assignedEventIds: ['event-1'],
          type
        }
      };
    }

    // For admin, use payload.id (not judgeId)
    return {
      id: payload.id,
      name: payload.name,
      email: '',
      role: 'admin'
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Authenticate with backend
    if (selectedRole === 'admin') {
      const trimmedAdminId = adminId.trim();
      try {
        const res = await login({ judgeId: trimmedAdminId });
        onLogin(buildUser(res.user));
      } catch (err: any) {
        setError(err?.message || 'Invalid Admin ID. Please try again.');
      }
    } else if (selectedRole === 'judge') {
      const trimmedJudgeId = judgeId.trim();
      try {
        const res = await login({ judgeId: trimmedJudgeId });
        onLogin(buildUser(res.user));
      } catch (err: any) {
        setError(err?.message || 'Invalid Judge ID. Please try again.');
      }
    }
  };

  const handleRoleChange = (role: 'admin' | 'judge' | null) => {
    setSelectedRole(role);
    setAdminId('');
    setJudgeId('');
    setError('');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <Shield className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Pitch Perfect Scoring System</h1>
          <p className="text-lg text-slate-600">National-Level Event Management Platform</p>
        </div>

        {!selectedRole ? (
          /* Role Selection */
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Admin Card */}
            <button
              onClick={() => handleRoleChange('admin')}
              className="group relative bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-400 transition-all duration-300 text-left shadow-sm hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Shield className="size-7 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Panel</h2>
                <p className="text-slate-600 mb-6">
                  Manage events, teams, judges, and view comprehensive analytics
                </p>
                <div className="flex items-center gap-2 text-blue-600 font-medium">
                  Login as Admin
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Judge Card */}
            <button
              onClick={() => handleRoleChange('judge')}
              className="group relative bg-white border-2 border-slate-200 rounded-2xl p-8 hover:border-indigo-400 transition-all duration-300 text-left shadow-sm hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                  <Gavel className="size-7 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Judge Panel</h2>
                <p className="text-slate-600 mb-6">
                  Evaluate teams, submit scores, and provide expert feedback
                </p>
                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                  Login as Judge
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        ) : (
          /* Login Form */
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
              <button
                onClick={() => handleRoleChange(null)}
                className="text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
              >
                ← Back to role selection
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedRole === 'admin' ? 'bg-blue-100' : 'bg-indigo-100'
                }`}>
                  {selectedRole === 'admin' ? (
                    <Shield className="size-6 text-blue-600" />
                  ) : (
                    <Gavel className="size-6 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRole === 'admin' ? 'Admin Login' : 'Judge Login'}
                  </h2>
                  <p className="text-sm text-slate-600">Enter your credentials</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedRole === 'admin' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Admin ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                      <input
                        type="text"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                        placeholder="admin-1"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Enter your assigned Admin ID (e.g., admin-1, admin-2)</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Judge ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                      <input
                        type="text"
                        value={judgeId}
                        onChange={(e) => setJudgeId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors"
                        placeholder="judge-1"
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Enter your assigned Judge ID (e.g., judge-1, judge-2)</p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-medium text-white transition-all shadow-md hover:shadow-lg ${
                    selectedRole === 'admin'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                  }`}
                >
                  Login
                </button>
              </form>

              {/* Credentials Reference */}
              {selectedRole === 'judge' && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Round 2 External Judges:</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Prof. Rajiv Malhotra</p>
                        <p className="text-slate-600">rajiv.malhotra@external.com</p>
                      </div>
                      <code className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-700 font-mono">
                        judge-ext-1
                      </code>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Ms. Kavita Deshmukh</p>
                        <p className="text-slate-600">kavita.deshmukh@external.com</p>
                      </div>
                      <code className="px-2 py-1 bg-white border border-amber-300 rounded text-amber-700 font-mono">
                        judge-ext-2
                      </code>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 italic">
                    External judges evaluate all top 15 teams in Round 2
                  </p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
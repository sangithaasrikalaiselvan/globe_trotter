import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plane, MapPin, Calendar, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="uppercase tracking-wide text-blue-600 font-semibold text-xs mb-2">GlobeTrotter</p>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-3">Design smarter trips, automatically</h1>
            <p className="text-lg text-gray-700 max-w-xl">
              Build multi-stop adventures with live budgets, AI cost estimates, and shareable itineraries—all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1">
                <MapPin className="w-4 h-4" /> Plan every stop
              </div>
              <p className="text-sm text-gray-700">Organize routes, dates, and activities for each city in minutes.</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" /> Smart budgets
              </div>
              <p className="text-sm text-gray-700">Estimate total costs with the built-in ML model and track spending.</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-1">
                <Calendar className="w-4 h-4" /> Visual timelines
              </div>
              <p className="text-sm text-gray-700">See your journey as an easy-to-read timeline across stops.</p>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm mb-1">
                <Plane className="w-4 h-4" /> Share & collaborate
              </div>
              <p className="text-sm text-gray-700">Make trips public or private and share them securely with friends.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-600 text-sm">Sign in to continue your travel adventures.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

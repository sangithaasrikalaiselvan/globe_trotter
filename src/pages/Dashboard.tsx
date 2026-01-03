import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { Plus, MapPin, Calendar, TrendingUp } from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
}

interface City {
  id: string;
  name: string;
  country: string;
  image_url: string | null;
  popularity_score: number;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [popularCities, setPopularCities] = useState<City[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null }>({
    full_name: null,
  });
  const [loading, setLoading] = useState(true);

  // 🔐 Wait for auth
  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user]);

  // 🔐 Redirect if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  const loadDashboardData = async () => {
    setLoading(true);

    const [profileRes, tripsRes, citiesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single(),

      supabase
        .from('trips')
        .select('id, name, start_date, end_date, cover_photo_url')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3),

      supabase
        .from('cities')
        .select('id, name, country, image_url, popularity_score')
        .order('popularity_score', { ascending: false })
        .limit(6),
    ]);

    if (profileRes.error) console.error(profileRes.error);
    if (tripsRes.error) console.error(tripsRes.error);
    if (citiesRes.error) console.error(citiesRes.error);

    setProfile(profileRes.data ?? { full_name: null });
    setTrips(tripsRes.data ?? []);
    setPopularCities(citiesRes.data ?? []);

    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile.full_name || 'Traveler'}
          </h1>
          <p className="text-gray-600">
            Plan your next adventure or continue where you left off
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Link
            to="/trips/new"
            className="bg-blue-600 rounded-2xl p-8 text-white hover:bg-blue-700 transition"
          >
            <Plus className="w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold">Plan New Trip</h3>
            <p className="text-blue-100">Start your journey</p>
          </Link>

          <div className="bg-white rounded-2xl p-8 border">
            <MapPin className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-2xl font-bold">{trips.length}</h3>
            <p className="text-gray-600">Total Trips</p>
          </div>

          <div className="bg-white rounded-2xl p-8 border">
            <TrendingUp className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="text-2xl font-bold">Explore</h3>
            <p className="text-gray-600">Discover destinations</p>
          </div>
        </div>

        {/* Trips */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6">Your Recent Trips</h2>

          {trips.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border">
              <MapPin className="w-14 h-14 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-6">No trips yet</p>
              <Link
                to="/trips/new"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg"
              >
                Create First Trip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg"
                >
                  <div className="h-40 bg-gray-200">
                    {trip.cover_photo_url && (
                      <img
                        src={trip.cover_photo_url}
                        alt={trip.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold">{trip.name}</h3>
                    {trip.start_date && trip.end_date && (
                      <p className="text-sm text-gray-600">
                        {new Date(trip.start_date).toDateString()} –{' '}
                        {new Date(trip.end_date).toDateString()}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Popular Cities */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularCities.map((city) => (
              <div key={city.id} className="relative rounded-xl overflow-hidden">
                <img
                  src={
                    city.image_url ||
                    'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg'
                  }
                  alt={city.name}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-3">
                  <p className="text-white font-bold text-sm">{city.name}</p>
                  <p className="text-white/80 text-xs">{city.country}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
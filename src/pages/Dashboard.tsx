import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { Plus, MapPin, Calendar, TrendingUp, Search } from 'lucide-react';

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
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedGenerated, setSelectedGenerated] = useState<any>(null);
  const [exploreMode, setExploreMode] = useState(false);
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

  // � Filter cities based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setFilteredCities(
        popularCities.filter(
          (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
        )
      );
    } else {
      setFilteredCities(popularCities);
    }
  }, [searchQuery, popularCities]);

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
    setFilteredCities(citiesRes.data ?? []);

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
        {/* Header with Search */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {profile.full_name || 'Traveler'}
              </h1>
              <p className="text-gray-600">
                Plan your next adventure or continue where you left off
              </p>
            </div>
            <Link
              to="/trips/new"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Trip
            </Link>
          </div>
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

          <button
            onClick={() => setExploreMode(true)}
            className="bg-white rounded-2xl p-8 border hover:shadow-md transition block w-full text-left"
          >
            <TrendingUp className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="text-2xl font-bold">Explore</h3>
            <p className="text-gray-600">Discover destinations</p>
          </button>
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

        {/* Explore Section */}
        {exploreMode && (
          <div className="mb-10 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border-2 border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Explore Destinations</h2>
              <button
                onClick={() => {
                  setExploreMode(false);
                  setSearchQuery('');
                }}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ✕ Close
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for destinations (e.g., America, Paris, Tokyo)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
              />
            </div>

            {/* Search Results */}
            {searchQuery && filteredCities.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="mb-4">No exact match for "{searchQuery}", but here are popular alternatives:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                  {getAlternativeCities().map((city, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedGenerated(city)}
                      className="relative rounded-xl overflow-hidden group text-left"
                    >
                      <img
                        src={city.image}
                        alt={city.name}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-3 flex flex-col justify-end">
                        <p className="text-white font-bold text-sm">{city.name}</p>
                        <p className="text-white/80 text-xs">{city.country}</p>
                        <span className="mt-2 inline-flex items-center text-xs text-white font-semibold opacity-90">
                          View details →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : searchQuery && filteredCities.length > 0 ? (
              <div className="space-y-4">
                {filteredCities.map((city) => (
                  <div
                    key={city.id}
                    className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-400 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <img
                        src={
                          city.image_url ||
                          'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg'
                        }
                        alt={city.name}
                        className="w-24 h-24 object-cover rounded-lg group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900">{city.name}</h3>
                        <p className="text-lg text-gray-600">{city.country}</p>
                        <button
                          onClick={() => setSelectedCity(city)}
                          className="mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                        >
                          View details →
                        </button>
                      </div>
                    </div>
                    <Link
                      to={`/trips/new?city=${encodeURIComponent(city.name)}&country=${encodeURIComponent(city.country)}`}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                    >
                      Add to Trip
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-600">
                <p>Start searching to discover amazing destinations!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* City Detail Modal */}
      {selectedCity && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto shadow-2xl">
            <div className="relative">
              <img
                src={
                  selectedCity.image_url ||
                  'https://images.pexels.com/photos/1371360/pexels-photo-1371360.jpeg'
                }
                alt={selectedCity.name}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedCity(null)}
                className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedCity.name}</h2>
                <p className="text-lg text-gray-600 mt-1">{selectedCity.country}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ Highlights & Special Places</h3>
                <ul className="space-y-2 text-gray-700">
                  {getCityHighlights(selectedCity.name).map((place, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>{place}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Approx. Budget (per day)</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    ${getCityBudget(selectedCity.name)}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Best Time to Visit</p>
                  <p className="text-lg font-bold text-blue-700 mt-2">
                    {getBestSeason(selectedCity.name)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Quick Facts</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li><span className="font-medium">Popularity Score:</span> {selectedCity.popularity_score}/10</li>
                  <li><span className="font-medium">Recommended Duration:</span> {getRecommendedDays(selectedCity.name)} days</li>
                  <li><span className="font-medium">Visa Info:</span> {getVisaInfo(selectedCity.name)}</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedCity(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Close
                </button>
                <Link
                  to={`/trips/new?city=${encodeURIComponent(selectedCity.name)}&country=${encodeURIComponent(selectedCity.country)}`}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center"
                >
                  Start Trip Here
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated City Detail Modal */}
      {selectedGenerated && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto shadow-2xl">
            <div className="relative">
              <img
                src={selectedGenerated.image}
                alt={selectedGenerated.name}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedGenerated(null)}
                className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedGenerated.name}</h2>
                <p className="text-lg text-gray-600 mt-1">{selectedGenerated.country}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ Highlights & Special Places</h3>
                <ul className="space-y-2 text-gray-700">
                  {selectedGenerated.highlights?.map((place: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>{place}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Approx. Budget (per day)</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-2">
                    ${selectedGenerated.budget}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Best Time to Visit</p>
                  <p className="text-lg font-bold text-blue-700 mt-2">
                    {selectedGenerated.season}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Quick Facts</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li><span className="font-medium">Recommended Duration:</span> {selectedGenerated.days} days</li>
                  <li><span className="font-medium">Visa Info:</span> {selectedGenerated.visa}</li>
                  <li><span className="font-medium">Language:</span> {selectedGenerated.language}</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedGenerated(null)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Close
                </button>
                <Link
                  to={`/trips/new?city=${encodeURIComponent(selectedGenerated.name)}&country=${encodeURIComponent(selectedGenerated.country)}`}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center"
                >
                  Start Trip Here
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Helper functions for city details
function getCityHighlights(cityName: string): string[] {
  const highlights: { [key: string]: string[] } = {
    Paris: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Champs-Élysées', 'Versailles Palace'],
    Tokyo: ['Senso-ji Temple', 'Shibuya Crossing', 'Tokyo Tower', 'teamLab Borderless', 'Meiji Shrine'],
    Barcelona: ['Sagrada Familia', 'Park Güell', 'Gothic Quarter', 'Las Ramblas', 'Casa Batlló'],
    Rome: ['Colosseum', 'Vatican City', 'Roman Forum', 'Trevi Fountain', 'Pantheon'],
    'New York': ['Statue of Liberty', 'Central Park', 'Times Square', 'Empire State Building', 'Brooklyn Bridge'],
    Bangkok: ['Grand Palace', 'Wat Pho', 'Floating Markets', 'Chao Phraya River', 'Lumphini Park'],
    Dubai: ['Burj Khalifa', 'Palm Jumeirah', 'Gold Souk', 'Desert Safari', 'Dubai Mall'],
    Sydney: ['Opera House', 'Bondi Beach', 'Harbour Bridge', 'Blue Mountains', 'Taronga Zoo'],
  };
  return highlights[cityName] || ['Local markets', 'Street food', 'Museums', 'Historic sites', 'Nature parks'];
}

function getCityBudget(cityName: string): string {
  const budgets: { [key: string]: string } = {
    Paris: '100-150',
    Tokyo: '80-120',
    Barcelona: '70-110',
    Rome: '60-100',
    'New York': '120-180',
    Bangkok: '30-50',
    Dubai: '150-250',
    Sydney: '110-160',
  };
  return budgets[cityName] || '60-100';
}

function getBestSeason(cityName: string): string {
  const seasons: { [key: string]: string } = {
    Paris: 'Apr-Jun, Sep-Oct',
    Tokyo: 'Mar-May, Sep-Nov',
    Barcelona: 'May-Jun, Sep-Oct',
    Rome: 'Apr-May, Sep-Oct',
    'New York': 'May-Sep',
    Bangkok: 'Nov-Feb',
    Dubai: 'Oct-Apr',
    Sydney: 'Sep-Nov, Mar-May',
  };
  return seasons[cityName] || 'Year-round';
}

function getRecommendedDays(cityName: string): number {
  const days: { [key: string]: number } = {
    Paris: 4,
    Tokyo: 5,
    Barcelona: 3,
    Rome: 3,
    'New York': 4,
    Bangkok: 3,
    Dubai: 3,
    Sydney: 4,
  };
  return days[cityName] || 3;
}

function getVisaInfo(cityName: string): string {
  const visaInfo: { [key: string]: string } = {
    Paris: 'Schengen visa (EU: visa-free)',
    Tokyo: '90 days visa-free for most',
    Barcelona: 'Schengen visa (EU: visa-free)',
    Rome: 'Schengen visa (EU: visa-free)',
    'New York': 'ESTA/Visa required',
    Bangkok: 'Visa-free for 30-60 days',
    Dubai: 'Visa-free for 30-90 days',
    Sydney: 'Visa required (eVisitor/ETA)',
  };
  return visaInfo[cityName] || 'Check local requirements';
}

function getAlternativeCities(): Array<{
  name: string;
  country: string;
  image: string;
  highlights: string[];
  budget: string;
  season: string;
  days: number;
  visa: string;
  language: string;
}> {
  return [
    {
      name: 'Istanbul',
      country: 'Turkey',
      image: 'https://images.unsplash.com/photo-1524578271613-d2a78f4a9cf1?w=800&h=500&fit=crop',
      highlights: ['Blue Mosque', 'Hagia Sophia', 'Grand Bazaar', 'Topkapi Palace', 'Bosphorus Cruise'],
      budget: '40-70',
      season: 'Apr-May, Sep-Oct',
      days: 4,
      visa: 'Visa-free for 90 days',
      language: 'Turkish',
    },
    {
      name: 'Amsterdam',
      country: 'Netherlands',
      image: 'https://images.unsplash.com/photo-1518684029980-cf91eb9ce4d6?w=800&h=500&fit=crop',
      highlights: ['Anne Frank House', 'Canal Cruises', 'Van Gogh Museum', 'Bike Culture', 'Red Light District'],
      budget: '90-140',
      season: 'May-Jun, Sep-Oct',
      days: 3,
      visa: 'Schengen visa (EU: visa-free)',
      language: 'Dutch, English',
    },
    {
      name: 'Bali',
      country: 'Indonesia',
      image: 'https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=800&h=500&fit=crop',
      highlights: ['Tanah Lot Temple', 'Ubud Rice Terraces', 'Seminyak Beach', 'Mount Batur Hike', 'Traditional Villages'],
      budget: '25-45',
      season: 'Apr-Oct',
      days: 5,
      visa: 'Visa on arrival',
      language: 'Balinese, Indonesian, English',
    },
    {
      name: 'Mexico City',
      country: 'Mexico',
      image: 'https://images.unsplash.com/photo-1538077304500-2b8f7e20bf98?w=800&h=500&fit=crop',
      highlights: ['Templo Mayor', 'Frida Kahlo Museum', 'Xochimilco Canals', 'National Museum of Anthropology', 'Historic Center'],
      budget: '50-80',
      season: 'Oct-Apr',
      days: 4,
      visa: 'Visa-free for 180 days',
      language: 'Spanish, English widely spoken',
    },
    {
      name: 'Marrakech',
      country: 'Morocco',
      image: 'https://images.unsplash.com/photo-1518137098776-c0ec2fbf2c2f?w=800&h=500&fit=crop',
      highlights: ['Medina Old Town', 'Jemaa el-Fnaa Square', 'Atlas Mountains', 'Bahia Palace', 'Majorelle Garden'],
      budget: '35-60',
      season: 'Oct-Apr',
      days: 3,
      visa: 'Visa-free for 90 days',
      language: 'Arabic, Berber, French',
    },
    {
      name: 'Prague',
      country: 'Czech Republic',
      image: 'https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=800&h=500&fit=crop',
      highlights: ['Charles Bridge', 'Prague Castle', 'Old Town Square', 'St. Vitus Cathedral', 'Jewish Quarter'],
      budget: '45-75',
      season: 'May-Jun, Sep-Oct',
      days: 3,
      visa: 'Schengen visa (EU: visa-free)',
      language: 'Czech, English',
    },
    {
      name: 'Venice',
      country: 'Italy',
      image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=500&fit=crop',
      highlights: ['St. Mark\'s Basilica', 'Grand Canal', 'Gondola Rides', 'Doge\'s Palace', 'Rialto Bridge'],
      budget: '80-130',
      season: 'May, Sep-Oct',
      days: 2,
      visa: 'Schengen visa (EU: visa-free)',
      language: 'Italian, English',
    },
    {
      name: 'Barcelona',
      country: 'Spain',
      image: 'https://images.unsplash.com/photo-1579934317867-94eca07bdf23?w=800&h=500&fit=crop',
      highlights: ['Sagrada Familia', 'Park Güell', 'Gothic Quarter', 'Las Ramblas', 'Casa Batlló'],
      budget: '70-110',
      season: 'May-Jun, Sep-Oct',
      days: 3,
      visa: 'Schengen visa (EU: visa-free)',
      language: 'Catalan, Spanish, English',
    },
    {
      name: 'Kyoto',
      country: 'Japan',
      image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&h=500&fit=crop',
      highlights: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Grove', 'Kinkaku-ji Temple', 'Philosopher\'s Path', 'Traditional Tea Ceremony'],
      budget: '70-100',
      season: 'Mar-May, Oct-Nov',
      days: 3,
      visa: '90 days visa-free',
      language: 'Japanese, English limited',
    },
    {
      name: 'Lisbon',
      country: 'Portugal',
      image: 'https://images.unsplash.com/photo-1611267254246-68ad3fb78dc2?w=800&h=500&fit=crop',
      highlights: ['Belém Tower', 'Jeronimos Monastery', 'Tram 28', 'Viewpoints (Miradouros)', 'Pastéis de Nata'],
      budget: '50-80',
      season: 'May-Jun, Sep-Oct',
      days: 3,
      visa: 'Schengen visa (EU: visa-free)',
      language: 'Portuguese, English',
    },
  ];
}
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { ArrowLeft, Search, MapPin, Plus, DollarSign } from 'lucide-react';

interface City {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  cost_index?: number;
  description?: string | null;
  image_url?: string | null;
}

export default function AddStop() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  // 🔎 Search Filtering
  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFilteredCities(
        cities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q)
        )
      );
    } else {
      setFilteredCities(cities);
    }
  }, [searchQuery, cities]);

  // 🏙 Load Cities
  const loadCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('*')
      .order('name', { ascending: true });

    if (data) {
      setCities(data);
      setFilteredCities(data);
    }
    setLoading(false);
  };

  // ➕ Add Stop
  const handleAddStop = async () => {
    if (!selectedCity || !arrivalDate || !departureDate) {
      alert('Please select a city and enter dates');
      return;
    }

    setSubmitting(true);

    // get next order_index
    const { data: existingStops } = await supabase
      .from('trip_stops')
      .select('order_index')
      .eq('trip_id', id!)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder =
      existingStops && existingStops.length > 0
        ? existingStops[0].order_index + 1
        : 0;

    const { error } = await supabase.from('trip_stops').insert({
      trip_id: id!,
      city_id: selectedCity,
      arrival_date: arrivalDate,
      departure_date: departureDate,
      order_index: nextOrder,
    });

    if (!error) {
      navigate(`/trips/${id}`);
    } else {
      alert('Error adding stop. Please try again.');
      setSubmitting(false);
    }
  };

  // LOADING UI
  if (loading) {
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(`/trips/${id}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to trip
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT SIDE — Cities List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Add a Stop</h1>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Cities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCities.map((city) => (
                <div
                  key={city.id}
                  onClick={() => setSelectedCity(city.id)}
                  className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all ${
                    selectedCity === city.id
                      ? 'ring-2 ring-blue-600 shadow-lg'
                      : 'hover:shadow-md border border-gray-200'
                  }`}
                >
                  <div className="h-40 bg-gray-200 relative">
                    {city.image_url && (
                      <img
                        src={city.image_url}
                        alt={city.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {selectedCity === city.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{city.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{city.country}</p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {city.region || '—'}
                      </div>

                      <div className="flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {'$'.repeat(city.cost_index || 1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE — Stop Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Stop Details</h2>

              {selectedCity ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Selected city</p>
                    <p className="font-semibold text-gray-900">
                      {cities.find((c) => c.id === selectedCity)?.name}
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Arrival Date
                      </label>
                      <input
                        type="date"
                        value={arrivalDate}
                        onChange={(e) => setArrivalDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddStop}
                    disabled={submitting || !arrivalDate || !departureDate}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Stop'}
                  </button>
                </>
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Select a city to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Share2,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_public: boolean;
}

interface TripStop {
  id: string;
  city: {
    id: string;
    name: string;
    country: string;
    image_url: string | null;
  };
  arrival_date: string | null;
  departure_date: string | null;
  order_index: number;
  activities: StopActivity[];
}

interface StopActivity {
  id: string;
  activity: {
    id: string;
    name: string;
    category: string;
    estimated_cost: number;
    estimated_duration_hours: number;
  };
  scheduled_date: string | null;
  actual_cost: number | null;
}

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'budget' | 'timeline'>('itinerary');
  const [showAddStop, setShowAddStop] = useState(false);

  const [estimating, setEstimating] = useState(false);
  const [estimatedTotalCost, setEstimatedTotalCost] = useState<number | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimatorForm, setEstimatorForm] = useState({
    trip_days: 1,
    source_country: '',
    destination_country: '',
    travel_type: 'mid' as 'budget' | 'mid' | 'luxury',
    season: 'summer' as 'spring' | 'summer' | 'autumn' | 'winter',
  });

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`globet:budgetEstimate:${id}`);
      if (!raw) return;
      const value = Number(raw);
      if (Number.isFinite(value)) {
        setEstimatedTotalCost(value);
      }
    } catch {
      // ignore storage errors
    }
  }, [id]);

  const loadTrip = async () => {
    const { data: tripData } = await supabase.from('trips').select('*').eq('id', id!).maybeSingle();

    if (tripData) {
      setTrip(tripData);

      const { data: stopsData } = await supabase
        .from('trip_stops')
        .select(
          `
          id,
          arrival_date,
          departure_date,
          order_index,
          city:cities(id, name, country, image_url)
        `
        )
        .eq('trip_id', id!)
        .order('order_index', { ascending: true });

      if (stopsData) {
        const stopsWithActivities = await Promise.all(
          stopsData.map(async (stop: any) => {
            const { data: activitiesData } = await supabase
              .from('stop_activities')
              .select(
                `
                id,
                scheduled_date,
                actual_cost,
                activity:activities(id, name, category, estimated_cost, estimated_duration_hours)
              `
              )
              .eq('stop_id', stop.id);

            return {
              ...stop,
              activities: activitiesData || [],
            };
          })
        );

        setStops(stopsWithActivities);
      }

      await loadLatestEstimate();
    }

    setLoading(false);
  };

  const loadLatestEstimate = async () => {
    const { data } = await supabase
      .from('trip_budget_estimates')
      .select('estimated_total_cost, trip_days, source_country, destination_country, travel_type, season')
      .eq('trip_id', id!)
      .order('created_at', { ascending: false })
      .limit(1);

    const latest = data?.[0];
    if (latest) {
      setEstimatedTotalCost(latest.estimated_total_cost ?? null);
      setEstimatorForm((prev) => ({
        ...prev,
        trip_days: latest.trip_days || prev.trip_days,
        source_country: latest.source_country || prev.source_country,
        destination_country: latest.destination_country || prev.destination_country,
        travel_type: (latest.travel_type as any) || prev.travel_type,
        season: (latest.season as any) || prev.season,
      }));
    }
  };

  useEffect(() => {
    if (!trip) return;

    const start = trip.start_date ? new Date(trip.start_date) : null;
    const end = trip.end_date ? new Date(trip.end_date) : null;
    const days = start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1) : 1;

    const destination = stops[0]?.city.country ?? '';

    setEstimatorForm((prev) => ({
      ...prev,
      trip_days: prev.trip_days || days,
      destination_country: prev.destination_country || destination,
    }));
  }, [trip, stops]);

  const togglePublic = async () => {
    if (trip) {
      await supabase.from('trips').update({ is_public: !trip.is_public }).eq('id', trip.id);
      setTrip({ ...trip, is_public: !trip.is_public });
    }
  };

  const calculateTotalBudget = () => {
    let total = 0;
    stops.forEach((stop) => {
      stop.activities.forEach((activity) => {
        total += activity.actual_cost || activity.activity.estimated_cost;
      });
    });
    return total;
  };

  const stopCost = (stop: TripStop) =>
    stop.activities.reduce((sum, a) => sum + (a.actual_cost || a.activity.estimated_cost), 0);

  const stopStayDays = (stop: TripStop) => {
    if (!stop.arrival_date || !stop.departure_date) return null;
    const arrival = new Date(stop.arrival_date).getTime();
    const departure = new Date(stop.departure_date).getTime();
    return Math.max(1, Math.ceil((departure - arrival) / 86400000) + 1);
  };

  const stopTravelGap = (current: TripStop, prev?: TripStop | undefined) => {
    if (!prev || !current.arrival_date || !prev.departure_date) return null;
    const arrival = new Date(current.arrival_date).getTime();
    const prevDepart = new Date(prev.departure_date).getTime();
    const gap = Math.ceil((arrival - prevDepart) / 86400000);
    return gap > 0 ? gap : 0;
  };

  const estimateBudget = async () => {
    setEstimating(true);
    setEstimateError(null);

    try {
      const apiBaseUrl = (import.meta as any).env?.VITE_BUDGET_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estimatorForm),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.detail || json?.error || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      const value = Number(json?.estimated_total_cost);
      if (!Number.isFinite(value)) {
        throw new Error('Invalid prediction response');
      }

      setEstimatedTotalCost(value);
      if (id) {
        try {
          localStorage.setItem(`globet:budgetEstimate:${id}`, String(value));
        } catch {
          // ignore storage errors
        }

        // Persist estimate for this trip
        await supabase.from('trip_budget_estimates').insert({
          trip_id: id,
          estimated_total_cost: value,
          trip_days: estimatorForm.trip_days,
          source_country: estimatorForm.source_country,
          destination_country: estimatorForm.destination_country,
          travel_type: estimatorForm.travel_type,
          season: estimatorForm.season,
        });
      }
    } catch (e: any) {
      setEstimateError(e?.message || 'Failed to estimate budget');
    } finally {
      setEstimating(false);
    }
  };

  const deleteStop = async (stopId: string) => {
    if (confirm('Remove this stop from your trip?')) {
      await supabase.from('trip_stops').delete().eq('id', stopId);
      setStops(stops.filter((s) => s.id !== stopId));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip not found</h2>
            <Link to="/trips" className="text-blue-600 hover:text-blue-700">
              Back to trips
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/trips')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to trips
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.name}</h1>
              {trip.description && <p className="text-gray-600 mb-4">{trip.description}</p>}
              <div className="flex items-center space-x-6 text-sm">
                {trip.start_date && trip.end_date && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(trip.start_date).toLocaleDateString()} -{' '}
                    {new Date(trip.end_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  ${(estimatedTotalCost ?? calculateTotalBudget()).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePublic}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  trip.is_public
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {trip.is_public ? 'Public' : 'Private'}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'itinerary'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Itinerary
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'budget'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Budget
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'timeline'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {activeTab === 'itinerary' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Your Journey</h2>
              <Link
                to={`/trips/${id}/add-stop`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stop
              </Link>
            </div>

            {stops.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No stops added yet</h3>
                <p className="text-gray-600 mb-6">Start building your itinerary by adding destinations</p>
                <Link
                  to={`/trips/${id}/add-stop`}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add First Stop
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {stops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="flex">
                      <div className="w-48 h-48 bg-gray-200 flex-shrink-0">
                        {stop.city.image_url && (
                          <img
                            src={stop.city.image_url}
                            alt={stop.city.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {index + 1}
                              </span>
                              <h3 className="text-2xl font-bold text-gray-900">{stop.city.name}</h3>
                            </div>
                            <p className="text-gray-600">{stop.city.country}</p>
                            {stop.arrival_date && stop.departure_date && (
                              <div className="flex items-center text-sm text-gray-600 mt-2">
                                <Calendar className="w-4 h-4 mr-2" />
                                {new Date(stop.arrival_date).toLocaleDateString()} -{' '}
                                {new Date(stop.departure_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/trips/${id}/stops/${stop.id}/add-activity`}
                              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                              Add Activity
                            </Link>
                            <button
                              onClick={() => deleteStop(stop.id)}
                              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {stop.activities.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="font-semibold text-gray-900 text-sm mb-3">Activities</h4>
                            {stop.activities.map((activity) => (
                              <div
                                key={activity.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{activity.activity.name}</p>
                                    <p className="text-xs text-gray-600">
                                      {activity.activity.category} • {activity.activity.estimated_duration_hours}h
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    ${(activity.actual_cost || activity.activity.estimated_cost).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Budget Overview</h2>
            <div className="mb-8">
              <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                <p className="text-gray-600 mb-2">
                  {estimatedTotalCost !== null ? 'Estimated Total Cost (ML)' : 'Total Estimated Cost'}
                </p>
                <p className="text-5xl font-bold text-blue-600">
                  ${(estimatedTotalCost ?? calculateTotalBudget()).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimate total trip cost (ML)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trip days</label>
                  <input
                    type="number"
                    min={1}
                    value={estimatorForm.trip_days}
                    onChange={(e) =>
                      setEstimatorForm((p) => ({ ...p, trip_days: Math.max(1, Number(e.target.value || 1)) }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel type</label>
                  <select
                    value={estimatorForm.travel_type}
                    onChange={(e) =>
                      setEstimatorForm((p) => ({ ...p, travel_type: e.target.value as any }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="budget">Budget</option>
                    <option value="mid">Mid</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source country</label>
                  <input
                    type="text"
                    value={estimatorForm.source_country}
                    onChange={(e) => setEstimatorForm((p) => ({ ...p, source_country: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="India"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination country</label>
                  <input
                    type="text"
                    value={estimatorForm.destination_country}
                    onChange={(e) => setEstimatorForm((p) => ({ ...p, destination_country: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Korea"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Season</label>
                  <select
                    value={estimatorForm.season}
                    onChange={(e) => setEstimatorForm((p) => ({ ...p, season: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="autumn">Autumn</option>
                    <option value="winter">Winter</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={estimateBudget}
                    disabled={estimating}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {estimating ? 'Estimating...' : 'Estimate'}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {estimateError && <p className="text-sm text-red-600">{estimateError}</p>}
                {estimatedTotalCost !== null && !estimateError && (
                  <p className="text-sm text-gray-700">
                    Estimated total cost: <span className="font-semibold">${estimatedTotalCost.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {stops.map((stop) => {
                const stopTotal = stop.activities.reduce(
                  (sum, a) => sum + (a.actual_cost || a.activity.estimated_cost),
                  0
                );
                return (
                  <div key={stop.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{stop.city.name}</p>
                      <p className="text-sm text-gray-600">{stop.activities.length} activities</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">${stopTotal.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Timeline View</h2>
            {stops.length === 0 ? (
              <div className="text-center text-gray-600">No stops to show yet.</div>
            ) : (
              <div className="space-y-6">
                {stops.map((stop, index) => {
                  const cost = stopCost(stop);
                  const stayDays = stopStayDays(stop);
                  const gapDays = stopTravelGap(stop, stops[index - 1]);

                  return (
                    <div key={stop.id} className="flex">
                      <div className="flex flex-col items-center mr-6">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        {index < stops.length - 1 && <div className="w-0.5 h-full bg-blue-200 mt-2"></div>}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{stop.city.name}</h3>
                            <p className="text-sm text-gray-600">{stop.city.country}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-3 md:mt-0 text-sm text-gray-700">
                            <span className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                              <Calendar className="w-4 h-4" />
                              {stop.arrival_date && stop.departure_date
                                ? `${new Date(stop.arrival_date).toLocaleDateString()} → ${new Date(stop.departure_date).toLocaleDateString()}`
                                : 'Dates TBC'}
                            </span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                              <DollarSign className="w-4 h-4" />
                              ${cost.toFixed(2)}
                            </span>
                            {stayDays && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                                <Clock className="w-4 h-4" />
                                Stay {stayDays} {stayDays === 1 ? 'day' : 'days'}
                              </span>
                            )}
                            {gapDays !== null && gapDays > 0 && (
                              <span className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-700 rounded-full">
                                <MapPin className="w-4 h-4" />
                                Travel gap {gapDays} {gapDays === 1 ? 'day' : 'days'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 relative">
                          <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 rounded-full"></div>
                          <div className="relative flex items-center space-x-4">
                            <div className="w-3 h-3 bg-blue-600 rounded-full shadow"></div>
                            <div className="flex-1 h-3 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded-full"></div>
                            <div className="w-3 h-3 bg-blue-600 rounded-full shadow"></div>
                          </div>
                        </div>

                        {stop.activities.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {stop.activities.map((activity) => (
                              <div key={activity.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="font-medium text-gray-900">{activity.activity.name}</p>
                                <p className="text-xs text-gray-600">
                                  {activity.activity.category} • {activity.activity.estimated_duration_hours}h
                                </p>
                                <p className="text-xs text-gray-700 mt-1">
                                  Cost: ${(activity.actual_cost || activity.activity.estimated_cost).toFixed(2)}
                                </p>
                                {activity.scheduled_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(activity.scheduled_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
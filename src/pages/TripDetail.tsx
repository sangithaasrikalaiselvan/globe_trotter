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

  useEffect(() => {
    if (id) {
      loadTrip();
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
    }

    setLoading(false);
  };

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
                  ${calculateTotalBudget().toFixed(2)}
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
                <p className="text-gray-600 mb-2">Total Estimated Cost</p>
                <p className="text-5xl font-bold text-blue-600">${calculateTotalBudget().toFixed(2)}</p>
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
            <div className="space-y-6">
              {stops.map((stop, index) => (
                <div key={stop.id} className="flex">
                  <div className="flex flex-col items-center mr-6">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    {index < stops.length - 1 && <div className="w-0.5 h-full bg-blue-200 mt-2"></div>}
                  </div>
                  <div className="flex-1 pb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{stop.city.name}</h3>
                    {stop.arrival_date && stop.departure_date && (
                      <p className="text-sm text-gray-600 mb-4">
                        {new Date(stop.arrival_date).toLocaleDateString()} -{' '}
                        {new Date(stop.departure_date).toLocaleDateString()}
                      </p>
                    )}
                    {stop.activities.map((activity) => (
                      <div key={activity.id} className="mb-2 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{activity.activity.name}</p>
                        {activity.scheduled_date && (
                          <p className="text-xs text-gray-600">
                            {new Date(activity.scheduled_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
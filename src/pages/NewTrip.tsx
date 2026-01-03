import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { Save, ArrowLeft } from 'lucide-react';

export default function NewTrip() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    cover_photo_url: '',
  });

  // 🔐 Stop if auth not ready
  if (authLoading) {
    return <div className="p-8">Loading...</div>;
  }

  // 🔐 Stop if user not logged in (extra safety)
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id, // ✅ REQUIRED
        name: formData.name,
        description: formData.description || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        cover_photo_url: formData.cover_photo_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Trip insert error:', error);
      alert(error.message);
      setLoading(false);
      return;
    }

    // ✅ Navigate to newly created trip
    navigate(`/trips/${data.id}`);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-2">Create New Trip</h1>
          <p className="text-gray-600 mb-8">Start planning your next adventure</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Trip Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="px-4 py-3 border rounded-lg"
              />

              <input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="px-4 py-3 border rounded-lg"
              />
            </div>

            <input
              type="url"
              placeholder="Cover Photo URL"
              value={formData.cover_photo_url}
              onChange={(e) =>
                setFormData({ ...formData, cover_photo_url: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Creating...' : 'Create Trip'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
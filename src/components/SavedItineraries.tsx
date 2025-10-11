import { useState, useEffect } from 'react';
import { Calendar, MapPin, DollarSign, Trash2, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SavedItinerary {
  id: string;
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget: number;
  interests: string;
  itinerary_data: any;
  created_at: string;
}

interface SavedItinerariesProps {
  onLoadItinerary: (itinerary: SavedItinerary) => void;
}

export function SavedItineraries({ onLoadItinerary }: SavedItinerariesProps) {
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchItineraries();
    }
  }, [user]);

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItineraries(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!confirm('Are you sure you want to delete this itinerary?')) return;

    try {
      const { error } = await supabase.from('itineraries').delete().eq('id', id);
      if (error) throw error;
      setItineraries(itineraries.filter((i) => i.id !== id));
    } catch (err) {
      alert('Failed to delete itinerary');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#F77F00]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (itineraries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">No saved itineraries yet</p>
        <p className="text-sm text-gray-400">Create your first road trip to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold text-[#003049] mb-6">Your Saved Trips</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {itineraries.map((itinerary) => (
          <div
            key={itinerary.id}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200"
          >
            <h4 className="text-xl font-bold text-[#003049] mb-3">{itinerary.title}</h4>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-[#D62828]" />
                <span>{itinerary.departure} → {itinerary.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-[#F77F00]" />
                <span>{itinerary.days} days</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4 text-[#FCBF49]" />
                <span>₹{itinerary.budget.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Created {new Date(itinerary.created_at).toLocaleDateString()}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => onLoadItinerary(itinerary)}
                className="flex-1 bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => deleteItinerary(itinerary.id)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all duration-200 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

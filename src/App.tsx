import { Map, Route, Compass, MapPin, Calendar, DollarSign, Sparkles, Loader2, Download, Upload, RefreshCw, LogIn, LogOut, Save, BookmarkCheck, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { AuthModal } from './components/AuthModal';
import { SavedItineraries } from './components/SavedItineraries';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';

interface TripFormData {
  departure: string;
  destination: string;
  days: string;
  budget: string;
  people: string;
  interests: string;
  transportMode: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  drivingDistance?: string;
  drivingTime?: string;
  activities: string[];
  accommodation: string;
  estimatedCost: number;
}

interface BudgetBreakdown {
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
}

interface Itinerary {
  days: ItineraryDay[];
  totalEstimatedCost: number;
  budgetBreakdown?: BudgetBreakdown;
  budgetTips?: string[];
  note?: string;
}

interface HistoryEntry {
  timestamp: Date;
  type: 'original' | 'edit';
  request: string;
  itinerary: Itinerary;
}

function App() {
  const { user, signOut } = useAuth();
  const [formData, setFormData] = useState<TripFormData>({
    departure: '',
    destination: '',
    days: '',
    budget: '',
    people: '',
    interests: '',
    transportMode: 'car',
  });

  const [submittedData, setSubmittedData] = useState<TripFormData | null>(null);
  const [itineraryResponse, setItineraryResponse] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<HistoryEntry[]>([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [hasSavedItinerary, setHasSavedItinerary] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lastItinerary');
    setHasSavedItinerary(!!saved);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  const saveToLocalStorage = (tripData: TripFormData, itinerary: Itinerary) => {
    try {
      const dataToSave = {
        tripData,
        itinerary,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('lastItinerary', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('lastItinerary');
      if (saved) {
        const { tripData, itinerary } = JSON.parse(saved);
        setFormData(tripData);
        setSubmittedData(tripData);
        setItineraryResponse(itinerary);
        setConversationHistory([{
          timestamp: new Date(),
          type: 'original',
          request: `Create a road trip from ${tripData.departure} to ${tripData.destination} for ${tripData.days} days with a budget of ₹${tripData.budget}. Interests: ${tripData.interests}`,
          itinerary,
        }]);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setError('Failed to load saved itinerary');
    }
  };

  const exportAsText = () => {
    if (!itineraryResponse || !submittedData) return;

    let text = `🗺️  ROAD TRIP ITINERARY\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `📍 From: ${submittedData.departure}\n`;
    text += `📍 To: ${submittedData.destination}\n`;
    text += `📅 Duration: ${submittedData.days} days\n`;
    text += `💰 Budget: ₹${submittedData.budget}\n`;
    text += `🎯 Interests: ${submittedData.interests}\n\n`;
    text += `${'='.repeat(50)}\n\n`;

    itineraryResponse.days.forEach((day) => {
      text += `DAY ${day.day}: ${day.title}\n`;
      text += `${'-'.repeat(50)}\n`;
      text += `\n📋 Activities:\n`;
      day.activities.forEach((activity, index) => {
        text += `   ${index + 1}. ${activity}\n`;
      });
      text += `\n🏨 Accommodation: ${day.accommodation}\n`;
      text += `💵 Estimated Cost: ₹${day.estimatedCost}\n\n`;
    });

    text += `${'='.repeat(50)}\n`;
    text += `💰 TOTAL ESTIMATED COST: ₹${itineraryResponse.totalEstimatedCost}\n`;
    text += `${'='.repeat(50)}\n`;

    if (itineraryResponse.note) {
      text += `\nℹ️  Note: ${itineraryResponse.note}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form Data Submitted:', formData);
    setSubmittedData(formData);
    setIsLoading(true);
    setError(null);
    setItineraryResponse(null);
    setConversationHistory([]);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to generate itinerary');
      }

      if (data.status === 'success' && data.itinerary) {
        setItineraryResponse(data.itinerary);

        const originalRequest = `Create a road trip from ${formData.departure} to ${formData.destination} for ${formData.days} days with a budget of ₹${formData.budget}. Interests: ${formData.interests}`;

        setConversationHistory([{
          timestamp: new Date(),
          type: 'original',
          request: originalRequest,
          itinerary: data.itinerary,
        }]);

        saveToLocalStorage(formData, data.itinerary);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error calling API:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (editRequest: string) => {
    if (!submittedData || !itineraryResponse) return;

    setIsRefining(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...submittedData,
          editRequest,
          currentItinerary: itineraryResponse,
          conversationHistory: conversationHistory.map(entry => ({
            type: entry.type,
            request: entry.request,
            timestamp: entry.timestamp.toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Refinement API Response:', data);

      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to refine itinerary');
      }

      if (data.status === 'success' && data.itinerary) {
        setItineraryResponse(data.itinerary);

        setConversationHistory(prev => [...prev, {
          timestamp: new Date(),
          type: 'edit',
          request: editRequest,
          itinerary: data.itinerary,
        }]);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error refining itinerary:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while refining');
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateItinerary = (updatedItinerary: Itinerary) => {
    setItineraryResponse(updatedItinerary);
    if (submittedData) {
      saveToLocalStorage(submittedData, updatedItinerary);
    }
  };

  const saveToDatabase = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!submittedData || !itineraryResponse) return;

    try {
      const title = `${submittedData.departure} to ${submittedData.destination}`;

      if (currentItineraryId) {
        const { error } = await supabase
          .from('itineraries')
          .update({
            title,
            departure: submittedData.departure,
            destination: submittedData.destination,
            days: Number(submittedData.days),
            budget: Number(submittedData.budget),
            interests: submittedData.interests,
            itinerary_data: itineraryResponse,
          })
          .eq('id', currentItineraryId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('itineraries')
          .insert({
            user_id: user.id,
            title,
            departure: submittedData.departure,
            destination: submittedData.destination,
            days: Number(submittedData.days),
            budget: Number(submittedData.budget),
            interests: submittedData.interests,
            itinerary_data: itineraryResponse,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setCurrentItineraryId(data.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save itinerary');
    }
  };

  const loadSavedItinerary = (saved: { id: string; departure: string; destination: string; days: number; budget: number; people?: number; interests: string; itinerary_data: Itinerary }) => {
    setFormData({
      departure: saved.departure,
      destination: saved.destination,
      days: saved.days.toString(),
      budget: saved.budget.toString(),
      people: saved.people?.toString() || '2',
      interests: saved.interests,
      transportMode: 'car',
    });
    setSubmittedData({
      departure: saved.departure,
      destination: saved.destination,
      days: saved.days.toString(),
      budget: saved.budget.toString(),
      people: saved.people?.toString() || '2',
      interests: saved.interests,
      transportMode: 'car',
    });
    setItineraryResponse(saved.itinerary_data);
    setCurrentItineraryId(saved.id);
    setConversationHistory([{
      timestamp: new Date(),
      type: 'original',
      request: `Create a road trip from ${saved.departure} to ${saved.destination} for ${saved.days} days with a budget of ₹${saved.budget}. Interests: ${saved.interests}`,
      itinerary: saved.itinerary_data,
    }]);
    setShowSavedTrips(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/uheJHB.jpg)' }}>
        <div className="absolute inset-0 bg-white/60"></div>
      </div>

      <div className="absolute top-10 right-10 opacity-10 text-[#D62828] font-bold text-9xl rotate-12 select-none pointer-events-none hidden lg:block">
        ROUTE<br/>66
      </div>

      <div className="absolute bottom-20 left-10 opacity-10 transform -rotate-6 select-none pointer-events-none hidden lg:block">
        <svg width="120" height="140" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="100" height="120" rx="8" fill="#D62828" fillOpacity="0.3"/>
          <rect x="10" y="10" width="100" height="30" rx="8" fill="#003049" fillOpacity="0.4"/>
          <text x="60" y="28" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="#FCBF49" textAnchor="middle">SCENIC</text>
          <text x="60" y="55" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="#003049" textAnchor="middle">ROUTE</text>
          <text x="60" y="85" fontFamily="Arial" fontSize="32" fontWeight="bold" fill="#F77F00" textAnchor="middle">PCH</text>
          <text x="60" y="108" fontFamily="Arial" fontSize="10" fill="#003049" textAnchor="middle">PACIFIC COAST</text>
          <text x="60" y="122" fontFamily="Arial" fontSize="10" fill="#003049" textAnchor="middle">HIGHWAY</text>
        </svg>
      </div>

      <div className="relative z-10">
      {showCopySuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-r from-[#F77F00] to-[#FCBF49] text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-[#D62828]/30">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Success!</p>
              <p className="text-sm text-white/90">Itinerary copied to clipboard</p>
            </div>
          </div>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-green-400/30">
            <BookmarkCheck className="w-6 h-6" />
            <div>
              <p className="font-semibold">Saved Successfully!</p>
              <p className="text-sm text-white/90">Your itinerary has been saved</p>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/90 backdrop-blur-md border-b-2 border-[#F77F00]/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <svg className="w-10 h-10" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <circle cx="200" cy="200" r="180" fill="#FCBF49" opacity="0.3"/>
                <circle cx="200" cy="180" r="100" fill="#D62828" opacity="0.15"/>
                <circle cx="200" cy="180" r="85" fill="white" stroke="#D62828" strokeWidth="4"/>

                <path d="M 200 95 L 210 115 L 200 110 L 190 115 Z" fill="#D62828"/>
                <circle cx="200" cy="95" r="6" fill="#D62828"/>

                <path d="M 200 265 L 210 245 L 200 250 L 190 245 Z" fill="#F77F00"/>
                <path d="M 285 180 L 265 190 L 270 180 L 265 170 Z" fill="#FCBF49"/>
                <path d="M 115 180 L 135 190 L 130 180 L 135 170 Z" fill="#FCBF49"/>

                <circle cx="200" cy="180" r="15" fill="white" stroke="#D62828" strokeWidth="3"/>
                <circle cx="200" cy="180" r="8" fill="#D62828"/>

                <path d="M 150 140 Q 180 160, 200 150 T 250 160"
                      fill="none"
                      stroke="#F77F00"
                      strokeWidth="8"
                      strokeLinecap="round"
                      opacity="0.5"/>

                <g transform="translate(150, 135)">
                  <path d="M 0 0 Q 0 -8, -4 -12 Q -8 -16, -8 -20 Q -8 -26, -4 -30 Q 0 -34, 4 -30 Q 8 -26, 8 -20 Q 8 -16, 4 -12 Q 0 -8, 0 0 Z"
                        fill="#D62828"/>
                  <circle cx="0" cy="-20" r="3" fill="white"/>
                </g>

                <g transform="translate(250, 155)">
                  <path d="M 0 0 Q 0 -8, -4 -12 Q -8 -16, -8 -20 Q -8 -26, -4 -30 Q 0 -34, 4 -30 Q 8 -26, 8 -20 Q 8 -16, 4 -12 Q 0 -8, 0 0 Z"
                        fill="#F77F00"/>
                  <circle cx="0" cy="-20" r="3" fill="white"/>
                </g>

                <circle cx="200" cy="95" r="3" fill="#D62828" opacity="0.4"/>
                <circle cx="285" cy="180" r="3" fill="#F77F00" opacity="0.4"/>
                <circle cx="200" cy="265" r="3" fill="#F77F00" opacity="0.4"/>
                <circle cx="115" cy="180" r="3" fill="#FCBF49" opacity="0.4"/>

                <circle cx="235" cy="145" r="3" fill="#FCBF49" opacity="0.5"/>
                <circle cx="165" cy="145" r="3" fill="#FCBF49" opacity="0.5"/>
                <circle cx="235" cy="215" r="3" fill="#FCBF49" opacity="0.5"/>
                <circle cx="165" cy="215" r="3" fill="#FCBF49" opacity="0.5"/>
              </svg>
              <h1 className="text-2xl font-bold text-[#003049]">Roady</h1>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => setShowSavedTrips(!showSavedTrips)}
                    className="flex items-center gap-2 px-4 py-2 text-[#003049] hover:bg-[#F77F00]/10 rounded-lg transition-colors font-medium"
                  >
                    <BookmarkCheck className="w-5 h-5" />
                    <span className="hidden sm:inline">My Trips</span>
                  </button>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white rounded-lg transition-all shadow-md font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D62828] rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#D62828] to-[#F77F00] rounded-full p-8 shadow-xl">
                <Compass className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#003049] mb-6 leading-tight px-4">
            Every Mile,<br />
            <span className="bg-gradient-to-r from-[#D62828] to-[#F77F00] bg-clip-text text-transparent">
              Perfectly Planned
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-[#003049]/70 mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Roady-powered road trip itineraries tailored to your interests, budget, and timeline
          </p>

          {!itineraryResponse && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4 mb-8">
              <button
                onClick={() => {
                  const formElement = document.getElementById('trip-form');
                  formElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white font-bold px-8 py-4 rounded-lg shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-105 text-lg"
              >
                Start Planning
              </button>
              <button
                onClick={() => {
                  const howItWorksElement = document.getElementById('how-it-works');
                  howItWorksElement?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white/90 hover:bg-white text-[#003049] font-bold px-8 py-4 rounded-lg shadow-lg border-2 border-[#F77F00]/30 transition-all duration-200 hover:shadow-xl hover:scale-105 text-lg"
              >
                See How It Works
              </button>
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto mb-24">
          {showSavedTrips && user && (
            <div className="mb-8">
              <SavedItineraries onLoadItinerary={loadSavedItinerary} />
            </div>
          )}

          {!isLoading && !itineraryResponse && !showSavedTrips && (
            <div id="trip-form" className="bg-[#FCBF49]/10 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-[#F77F00]/30 p-8 sm:p-12 animate-scale-in">
              <h3 className="text-3xl font-bold text-[#003049] mb-2 text-center">Plan Your Journey</h3>
              <p className="text-[#003049]/70 text-center mb-8">Fill in the details below to create your custom road trip</p>

              <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="departure" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                    <MapPin className="w-4 h-4 text-[#D62828]" />
                    Departure
                  </label>
                  <input
                    type="text"
                    id="departure"
                    value={formData.departure}
                    onChange={handleInputChange}
                    placeholder="e.g., Mumbai, Maharashtra"
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="destination" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                    <MapPin className="w-4 h-4 text-[#D62828]" />
                    Destination
                  </label>
                  <input
                    type="text"
                    id="destination"
                    value={formData.destination}
                    onChange={handleInputChange}
                    placeholder="e.g., Goa"
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="days" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                    <Calendar className="w-4 h-4 text-[#F77F00]" />
                    Number of Days
                  </label>
                  <input
                    type="number"
                    id="days"
                    value={formData.days}
                    onChange={handleInputChange}
                    min="1"
                    max="30"
                    placeholder="e.g., 7"
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="people" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                    <Users className="w-4 h-4 text-[#F77F00]" />
                    Number of People
                  </label>
                  <input
                    type="number"
                    id="people"
                    value={formData.people}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    placeholder="e.g., 2"
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="budget" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                    <DollarSign className="w-4 h-4 text-[#F77F00]" />
                    Total Budget (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#003049] font-semibold">₹</span>
                    <input
                      type="number"
                      id="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="e.g., 50000"
                      className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="transportMode" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                  <Route className="w-4 h-4 text-[#F77F00]" />
                  Mode of Transport
                </label>
                <select
                  id="transportMode"
                  value={formData.transportMode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none bg-white"
                >
                  <option value="car">Car (Own Vehicle)</option>
                  <option value="rental_car">Rental Car</option>
                  <option value="bike">Bike/Motorcycle</option>
                  <option value="bus">Bus</option>
                  <option value="train">Train</option>
                  <option value="flight">Flight</option>
                  <option value="mixed">Mixed Transport</option>
                </select>
                <p className="text-sm text-[#003049]/60 mt-2">Choose your primary mode of transport for accurate cost estimates</p>
              </div>

              <div>
                <label htmlFor="interests" className="flex items-center gap-2 text-sm font-semibold text-[#003049] mb-2">
                  <Sparkles className="w-4 h-4 text-[#FCBF49]" />
                  Points of Interest
                </label>
                <textarea
                  id="interests"
                  value={formData.interests}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="e.g., beaches, temples, hill stations, local cuisine, heritage sites"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none resize-none bg-white"
                />
                <p className="text-sm text-[#003049]/60 mt-2">Separate multiple interests with commas</p>
              </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Route className="w-5 h-5" />
                  Generate Road Trip Plan
                </button>

                {hasSavedItinerary && !itineraryResponse && (
                  <button
                    type="button"
                    onClick={loadFromLocalStorage}
                    className="w-full mt-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-lg shadow-lg border-2 border-gray-300 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Load Last Itinerary
                  </button>
                )}
              </form>

              {error && (
                <div className="mt-8 p-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      !
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-red-900 mb-1">Error Generating Itinerary</h4>
                      <p className="text-red-700">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 rounded-full p-6 shadow-xl">
                    <Loader2 className="w-16 h-16 text-white animate-spin" />
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-bold text-gray-900">Crafting Your Perfect Journey</h3>
                  <p className="text-gray-600 max-w-md">
                    Roady is analyzing your preferences and creating a personalized itinerary just for you...
                  </p>
                </div>

                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-full rounded-full animate-pulse"></div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {itineraryResponse && !isLoading && (
            <div className="space-y-6 animate-slide-in-up">
              <div className="flex justify-center gap-3 flex-wrap">
                {user && (
                  <button
                    onClick={saveToDatabase}
                    className="tooltip bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-5 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                    data-tooltip="Save to your account"
                  >
                    <Save className="w-5 h-5" />
                    <span className="hidden sm:inline">{currentItineraryId ? 'Update' : 'Save'} Trip</span>
                    <span className="sm:hidden">{currentItineraryId ? 'Update' : 'Save'}</span>
                  </button>
                )}
                <button
                  onClick={exportAsText}
                  className="tooltip bg-gradient-to-r from-[#F77F00] to-[#FCBF49] hover:from-[#F77F00]/90 hover:to-[#FCBF49]/90 text-white font-semibold px-5 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  data-tooltip="Copy itinerary to clipboard"
                >
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Copy Itinerary</span>
                  <span className="sm:hidden">Copy</span>
                </button>
                <button
                  onClick={() => {
                    setItineraryResponse(null);
                    setSubmittedData(null);
                    setError(null);
                    setConversationHistory([]);
                    setCurrentItineraryId(null);
                    setFormData({
                      departure: '',
                      destination: '',
                      days: '',
                      budget: '',
                      people: '',
                      interests: '',
                      transportMode: 'car',
                    });
                  }}
                  className="tooltip bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white font-semibold px-5 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  data-tooltip="Start fresh with a new trip"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="hidden sm:inline">Start New Trip</span>
                  <span className="sm:hidden">New Trip</span>
                </button>
                <button
                  onClick={() => {
                    setItineraryResponse(null);
                    setSubmittedData(null);
                    setError(null);
                    setConversationHistory([]);
                  }}
                  className="tooltip bg-white/90 backdrop-blur-sm hover:bg-white text-[#003049] font-semibold px-5 py-3 rounded-lg shadow-lg border-2 border-[#F77F00]/30 transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center gap-2"
                  data-tooltip="Edit trip details"
                >
                  <Compass className="w-5 h-5" />
                  <span className="hidden sm:inline">Modify Trip</span>
                  <span className="sm:hidden">Modify</span>
                </button>
              </div>
            </div>
          )}

          {itineraryResponse && submittedData && (
            <ItineraryDisplay
              itinerary={itineraryResponse}
              onRefine={handleRefine}
              isRefining={isRefining}
              conversationHistory={conversationHistory}
              onUpdateItinerary={handleUpdateItinerary}
              departure={submittedData.departure}
              destination={submittedData.destination}
              userBudget={Number(submittedData.budget)}
            />
          )}
        </div>

        <div id="how-it-works" className="mt-24 scroll-mt-20">
          <h3 className="text-3xl font-bold text-[#003049] text-center mb-4">How It Works</h3>
          <p className="text-[#003049]/70 text-center mb-12 max-w-2xl mx-auto">
            Creating your perfect road trip is simple and fast
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 max-w-5xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border-2 border-[#F77F00]/20 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#D62828] to-[#F77F00] rounded-full mb-6 mx-auto">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-[#003049] text-center mb-3">1. Enter Your Details</h4>
              <p className="text-[#003049]/70 text-center">
                Tell us where you're going, how long you have, your budget, and what interests you
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border-2 border-[#F77F00]/20 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#D62828] to-[#F77F00] rounded-full mb-6 mx-auto">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-[#003049] text-center mb-3">2. Roady Creates Your Plan</h4>
              <p className="text-[#003049]/70 text-center">
                Roady analyzes thousands of routes and attractions to build your perfect itinerary
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border-2 border-[#F77F00]/20 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#D62828] to-[#F77F00] rounded-full mb-6 mx-auto">
                <Route className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-[#003049] text-center mb-3">3. Hit the Road</h4>
              <p className="text-[#003049]/70 text-center">
                Get a detailed day-by-day plan with activities, accommodation, and budget breakdown
              </p>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-[#003049] text-center mb-4 mt-32">Road Trip Inspiration</h3>
          <p className="text-[#003049]/70 text-center mb-12 max-w-2xl mx-auto">
            Get inspired by these stunning road trip moments and destinations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="/4705028.jpg"
                alt="Classic convertible on scenic highway"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">The Open Road</h4>
                  <p className="text-white/90 text-sm">Experience the freedom of the highway</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg"
                alt="Mountain highway winding through scenic landscape"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Mountain Passes</h4>
                  <p className="text-white/90 text-sm">Conquer scenic mountain routes</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/1666021/pexels-photo-1666021.jpeg"
                alt="Coastal highway with ocean views"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Coastal Drives</h4>
                  <p className="text-white/90 text-sm">Cruise along breathtaking coastlines</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/38537/woodland-road-falling-leaf-natural-38537.jpeg"
                alt="Forest road through autumn trees"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Forest Trails</h4>
                  <p className="text-white/90 text-sm">Journey through nature's canopy</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg"
                alt="Desert road stretching into horizon"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Desert Adventures</h4>
                  <p className="text-white/90 text-sm">Explore vast desert landscapes</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/1208777/pexels-photo-1208777.jpeg"
                alt="Sunset highway drive"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Golden Hour</h4>
                  <p className="text-white/90 text-sm">Chase stunning sunset views</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/1082316/pexels-photo-1082316.jpeg"
                alt="Bridge crossing scenic vista"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Epic Bridges</h4>
                  <p className="text-white/90 text-sm">Cross iconic architectural marvels</p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <img
                src="https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg"
                alt="Winter road through snowy landscape"
                className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-white font-bold text-xl mb-2">Winter Wonderland</h4>
                  <p className="text-white/90 text-sm">Navigate snowy scenic routes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200">
            <div className="bg-blue-100 rounded-lg w-14 h-14 flex items-center justify-center mb-4">
              <Route className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Route Planning</h3>
            <p className="text-gray-600 leading-relaxed">
              Roady-powered route optimization to help you discover the best stops and scenic routes along your journey.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200">
            <div className="bg-blue-100 rounded-lg w-14 h-14 flex items-center justify-center mb-4">
              <Map className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Destination Insights</h3>
            <p className="text-gray-600 leading-relaxed">
              Get personalized recommendations for attractions, restaurants, and hidden gems at every stop.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200">
            <div className="bg-blue-100 rounded-lg w-14 h-14 flex items-center justify-center mb-4">
              <Compass className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Flexible Itineraries</h3>
            <p className="text-gray-600 leading-relaxed">
              Easily adjust your plans on the go with real-time updates and alternative route suggestions.
            </p>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

export default App;

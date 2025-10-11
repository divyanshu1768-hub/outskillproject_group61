import { MapPin, DollarSign, Hotel, Calendar, Sparkles, Loader2, History, ChevronDown, ChevronUp, Edit2, Save, X, Map, Navigation, Clock, Lightbulb, Camera, Coffee, Utensils, Music, Mountain, Waves, TreePine, Castle, ShoppingBag, Landmark, Car, Activity, Download } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { TripMap } from './TripMap';
import { BudgetBreakdownComponent } from './BudgetBreakdown';
import { downloadAsJSON, downloadAsText, downloadAsHTML } from '../utils/downloadItinerary';

function getActivityIcon(activity: string) {
  const activityLower = activity.toLowerCase();

  if (activityLower.includes('photo') || activityLower.includes('view') || activityLower.includes('scenic')) {
    return Camera;
  }
  if (activityLower.includes('coffee') || activityLower.includes('break') || activityLower.includes('rest')) {
    return Coffee;
  }
  if (activityLower.includes('lunch') || activityLower.includes('dinner') || activityLower.includes('breakfast') || activityLower.includes('meal') || activityLower.includes('eat')) {
    return Utensils;
  }
  if (activityLower.includes('music') || activityLower.includes('concert') || activityLower.includes('show')) {
    return Music;
  }
  if (activityLower.includes('mountain') || activityLower.includes('hike') || activityLower.includes('climb')) {
    return Mountain;
  }
  if (activityLower.includes('beach') || activityLower.includes('ocean') || activityLower.includes('sea') || activityLower.includes('swim')) {
    return Waves;
  }
  if (activityLower.includes('forest') || activityLower.includes('park') || activityLower.includes('nature') || activityLower.includes('trail')) {
    return TreePine;
  }
  if (activityLower.includes('castle') || activityLower.includes('palace') || activityLower.includes('fort')) {
    return Castle;
  }
  if (activityLower.includes('shop') || activityLower.includes('market') || activityLower.includes('mall')) {
    return ShoppingBag;
  }
  if (activityLower.includes('museum') || activityLower.includes('monument') || activityLower.includes('memorial') || activityLower.includes('landmark')) {
    return Landmark;
  }
  if (activityLower.includes('drive') || activityLower.includes('depart') || activityLower.includes('arrive') || activityLower.includes('check in')) {
    return Car;
  }
  if (activityLower.includes('visit') || activityLower.includes('explore') || activityLower.includes('tour')) {
    return MapPin;
  }

  return Activity;
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

interface ItineraryDisplayProps {
  itinerary: Itinerary;
  onRefine: (editRequest: string) => void;
  isRefining: boolean;
  conversationHistory?: HistoryEntry[];
  onUpdateItinerary: (updatedItinerary: Itinerary) => void;
  departure: string;
  destination: string;
  userBudget: number;
}

export function ItineraryDisplay({ itinerary, onRefine, isRefining, conversationHistory = [], onUpdateItinerary, departure, destination, userBudget }: ItineraryDisplayProps) {
  const [editRequest, setEditRequest] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [editedDay, setEditedDay] = useState<ItineraryDay | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  const extractStops = (): string[] => {
    const stops: string[] = [];
    itinerary.days.forEach(day => {
      const titleMatch = day.title.match(/:\s*(.+?)(?:\s+to\s+|\s*$)/i);
      if (titleMatch && titleMatch[1]) {
        const location = titleMatch[1].trim();
        if (
          location &&
          location.toLowerCase() !== departure.toLowerCase() &&
          location.toLowerCase() !== destination.toLowerCase() &&
          !stops.includes(location)
        ) {
          stops.push(location);
        }
      }
    });
    return stops;
  };

  const handleRefine = () => {
    if (editRequest.trim()) {
      onRefine(editRequest);
      setEditRequest('');
    }
  };

  const handleDownload = (format: 'json' | 'text' | 'html') => {
    if (format === 'json') {
      downloadAsJSON(itinerary, departure, destination);
    } else if (format === 'text') {
      downloadAsText(itinerary, departure, destination);
    } else if (format === 'html') {
      downloadAsHTML(itinerary, departure, destination);
    }
    setShowDownloadMenu(false);
  };

  const startEditingDay = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setEditedDay({ ...itinerary.days[dayIndex] });
  };

  const cancelEditingDay = () => {
    setEditingDayIndex(null);
    setEditedDay(null);
  };

  const saveEditedDay = () => {
    if (editedDay && editingDayIndex !== null) {
      const updatedDays = [...itinerary.days];
      updatedDays[editingDayIndex] = editedDay;

      const newTotalCost = updatedDays.reduce((sum, day) => sum + day.estimatedCost, 0);

      const updatedItinerary: Itinerary = {
        ...itinerary,
        days: updatedDays,
        totalEstimatedCost: newTotalCost,
      };

      onUpdateItinerary(updatedItinerary);
      setEditingDayIndex(null);
      setEditedDay(null);
    }
  };

  const updateEditedDayField = (field: keyof ItineraryDay, value: string | number | string[]) => {
    if (editedDay) {
      setEditedDay({ ...editedDay, [field]: value });
    }
  };

  const updateActivity = (index: number, value: string) => {
    if (editedDay) {
      const newActivities = [...editedDay.activities];
      newActivities[index] = value;
      setEditedDay({ ...editedDay, activities: newActivities });
    }
  };

  const addActivity = () => {
    if (editedDay) {
      setEditedDay({ ...editedDay, activities: [...editedDay.activities, ''] });
    }
  };

  const removeActivity = (index: number) => {
    if (editedDay && editedDay.activities.length > 1) {
      const newActivities = editedDay.activities.filter((_, i) => i !== index);
      setEditedDay({ ...editedDay, activities: newActivities });
    }
  };

  return (
    <div className="mt-8">
      <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Your Road Trip Itinerary</h3>
                <p className="text-blue-100 text-sm mt-1">A personalized journey crafted just for you</p>
              </div>
            </div>
            <div className="relative" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-all duration-200 border border-white/30"
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">Download</span>
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    onClick={() => handleDownload('html')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-b border-gray-100"
                  >
                    📄 HTML (Printable)
                  </button>
                  <button
                    onClick={() => handleDownload('text')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium border-b border-gray-100"
                  >
                    📝 Text File
                  </button>
                  <button
                    onClick={() => handleDownload('json')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-medium rounded-b-lg"
                  >
                    💾 JSON Data
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {itinerary.note && (
          <div className="mx-8 mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
            <p className="text-sm text-amber-800 leading-relaxed">{itinerary.note}</p>
          </div>
        )}

        <div className="mx-8 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Map className="w-5 h-5 text-blue-600" />
              <h4 className="text-lg font-bold text-gray-900">Trip Route</h4>
            </div>
            <TripMap
              departure={departure}
              destination={destination}
              stops={extractStops()}
            />
          </div>

          {itinerary.budgetBreakdown && (
            <BudgetBreakdownComponent
              budgetBreakdown={itinerary.budgetBreakdown}
              totalEstimatedCost={itinerary.totalEstimatedCost}
              userBudget={userBudget}
            />
          )}
        </div>

        <div className="p-8 space-y-6">
          {itinerary.days.map((day, index) => {
            const isEditing = editingDayIndex === index;
            const displayDay = isEditing && editedDay ? editedDay : day;

            return (
              <div
                key={day.day}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#D62828] to-[#F77F00] px-4 sm:px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="bg-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-[#D62828] font-bold text-base sm:text-lg">{day.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#FCBF49] text-xs font-medium uppercase tracking-wide">Day {day.day}</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={displayDay.title}
                            onChange={(e) => updateEditedDayField('title', e.target.value)}
                            className="text-lg sm:text-xl font-bold text-[#003049] mt-0.5 w-full bg-white rounded px-2 py-1"
                          />
                        ) : (
                          <h4 className="text-lg sm:text-xl font-bold text-white mt-0.5 break-words">{displayDay.title}</h4>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-right bg-white/20 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 flex-1 sm:flex-none">
                        <p className="text-[#FCBF49] text-xs font-medium">Daily Budget</p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={displayDay.estimatedCost}
                            onChange={(e) => updateEditedDayField('estimatedCost', Number(e.target.value))}
                            className="text-xl sm:text-2xl font-bold text-[#003049] w-20 sm:w-24 bg-white rounded px-2 py-1"
                          />
                        ) : (
                          <p className="text-xl sm:text-2xl font-bold text-white">₹{displayDay.estimatedCost}</p>
                        )}
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => startEditingDay(index)}
                          className="tooltip bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-lg transition-all duration-200"
                          data-tooltip="Edit this day"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {(displayDay.drivingDistance || displayDay.drivingTime) && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {displayDay.drivingDistance && (
                        <div className="bg-[#D62828]/10 rounded-lg p-3 sm:p-4 border-2 border-[#D62828]/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Navigation className="w-4 h-4 text-[#D62828]" />
                            <span className="text-xs font-semibold text-[#D62828] uppercase tracking-wide">Distance</span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-[#003049]">{displayDay.drivingDistance}</p>
                        </div>
                      )}
                      {displayDay.drivingTime && (
                        <div className="bg-[#F77F00]/10 rounded-lg p-3 sm:p-4 border-2 border-[#F77F00]/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-[#F77F00]" />
                            <span className="text-xs font-semibold text-[#F77F00] uppercase tracking-wide">Driving Time</span>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-[#003049]">{displayDay.drivingTime}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-[#D62828]" />
                      <h5 className="text-sm font-bold text-[#003049] uppercase tracking-wide">Activities</h5>
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        {displayDay.activities.map((activity, actIndex) => (
                          <div key={actIndex} className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                              {actIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={activity}
                              onChange={(e) => updateActivity(actIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter activity"
                            />
                            {displayDay.activities.length > 1 && (
                              <button
                                onClick={() => removeActivity(actIndex)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove activity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={addActivity}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-2"
                        >
                          + Add Activity
                        </button>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {displayDay.activities.map((activity, actIndex) => {
                          const ActivityIcon = getActivityIcon(activity);
                          return (
                            <li
                              key={actIndex}
                              className="flex items-start gap-3 group/item hover:bg-[#FCBF49]/20 p-2 rounded-lg transition-colors duration-200"
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FCBF49]/30 to-[#F77F00]/30 flex items-center justify-center group-hover/item:from-[#FCBF49]/50 group-hover/item:to-[#F77F00]/50 transition-colors">
                                  <ActivityIcon className="w-4 h-4 text-[#D62828]" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-semibold text-[#D62828]">{actIndex + 1}.</span>
                                  <p className="text-[#003049] leading-relaxed flex-1">{activity}</p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Hotel className="w-5 h-5 text-[#F77F00]" />
                      <h5 className="text-sm font-bold text-[#003049] uppercase tracking-wide">Accommodation</h5>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayDay.accommodation}
                        onChange={(e) => updateEditedDayField('accommodation', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#F77F00]/30 rounded-lg focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828]"
                        placeholder="Enter accommodation"
                      />
                    ) : (
                      <p className="text-[#003049] pl-7">{displayDay.accommodation}</p>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                      <button
                        onClick={cancelEditingDay}
                        className="px-4 py-2 text-[#003049] hover:bg-[#FCBF49]/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={saveEditedDay}
                        className="px-4 py-2 bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white rounded-lg transition-colors font-medium flex items-center gap-2 shadow-md"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
                {index < itinerary.days.length - 1 && (
                  <div className="flex justify-center pb-6">
                    <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-transparent"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-8 mb-8">
          <div className="bg-gradient-to-br from-[#D62828] via-[#F77F00] to-[#FCBF49] rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium mb-2 uppercase tracking-wide">
                  Total Trip Budget
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-bold text-white">
                    ₹{itinerary.totalEstimatedCost.toLocaleString()}
                  </p>
                  <p className="text-white/80 text-lg">INR</p>
                </div>
                <p className="text-white/80 text-sm mt-2">
                  Based on {itinerary.days.length} {itinerary.days.length === 1 ? 'day' : 'days'} of travel
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-6">
                <DollarSign className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
        </div>

        {itinerary.budgetTips && itinerary.budgetTips.length > 0 && (
          <div className="mx-8 mb-8">
            <div className="bg-gradient-to-br from-[#FCBF49]/20 to-[#F77F00]/20 rounded-xl shadow-lg border-2 border-[#F77F00]/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-br from-[#F77F00] to-[#FCBF49] rounded-full p-2">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-lg font-bold text-[#003049]">Money-Saving Tips</h4>
              </div>
              <ul className="space-y-3">
                {itinerary.budgetTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-[#F77F00] to-[#FCBF49] text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <p className="text-[#003049] flex-1 pt-0.5">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mx-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg border-2 border-[#F77F00]/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#D62828]" />
              <h4 className="text-lg font-bold text-[#003049]">Refine Your Itinerary</h4>
            </div>
            <p className="text-sm text-[#003049]/70 mb-4">
              Want to make changes? Tell us what you'd like to adjust and we'll update your itinerary.
            </p>

            <div className="space-y-3">
              <textarea
                value={editRequest}
                onChange={(e) => setEditRequest(e.target.value)}
                placeholder="e.g., Add a museum visit on Day 2, or swap the beach activity for hiking"
                rows={3}
                disabled={isRefining}
                className="w-full px-4 py-3 rounded-lg border-2 border-[#F77F00]/30 focus:ring-2 focus:ring-[#D62828] focus:border-[#D62828] transition-all duration-200 outline-none resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />

              <button
                onClick={handleRefine}
                disabled={isRefining || !editRequest.trim()}
                className="w-full bg-gradient-to-r from-[#D62828] to-[#F77F00] hover:from-[#D62828]/90 hover:to-[#F77F00]/90 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                {isRefining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Refining Your Itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Refine Itinerary
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Tip:</span> Be specific about what you want to change. For example: "Make Day 1 more budget-friendly" or "Add more outdoor activities throughout the trip"
              </p>
            </div>
          </div>
        </div>

        {conversationHistory.length > 0 && (
          <div className="mx-8 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  <h4 className="text-lg font-bold text-gray-900">
                    View Edit History
                  </h4>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {conversationHistory.length} {conversationHistory.length === 1 ? 'change' : 'changes'}
                  </span>
                </div>
                {isHistoryExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isHistoryExpanded && (
                <div className="border-t border-gray-200 p-6">
                  <div className="space-y-4">
                    {conversationHistory.map((entry, index) => (
                      <div
                        key={index}
                        className="relative pl-8 pb-4 last:pb-0"
                      >
                        {index < conversationHistory.length - 1 && (
                          <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                        )}

                        <div className="absolute left-0 top-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            entry.type === 'original'
                              ? 'bg-blue-500 text-white'
                              : 'bg-green-500 text-white'
                          }`}>
                            {index + 1}
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              entry.type === 'original'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {entry.type === 'original' ? 'Original Request' : 'Edit Request'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {entry.request}
                          </p>

                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-2 font-semibold">Result Summary:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">{entry.itinerary.days.length} days</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-600">${entry.itinerary.totalEstimatedCost}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

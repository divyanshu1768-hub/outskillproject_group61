import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ConversationHistoryEntry {
  type: 'original' | 'edit';
  request: string;
  timestamp: string;
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

interface Itinerary {
  days: ItineraryDay[];
  totalEstimatedCost: number;
  budgetBreakdown?: {
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
  };
  budgetTips?: string[];
  note?: string;
}

interface ItineraryRequest {
  departure: string;
  destination: string;
  days: string;
  budget: string;
  people: string;
  interests: string;
  transportMode: string;
  editRequest?: string;
  currentItinerary?: Itinerary;
  conversationHistory?: ConversationHistoryEntry[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: ItineraryRequest = await req.json();

    console.log('Received itinerary request:', requestData);

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyDAEjq9HGF6BuiNw54gF7mQlPngC1um6Dc';

    console.log('Gemini API key status:', geminiApiKey ? 'Configured' : 'Not configured');

    if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
      console.warn('Gemini API key not configured - using mock response');

      const totalBudget = Number(requestData.budget);
      const costPerDay = Math.floor(totalBudget / Number(requestData.days));
      const mockItinerary = {
        days: [
          {
            day: 1,
            title: `Day 1: ${requestData.departure} to First Stop`,
            drivingDistance: "180 km",
            drivingTime: "3.5 hours",
            activities: [
              `Depart from ${requestData.departure} (8:00 AM)`,
              "Coffee break and fuel stop (30 minutes)",
              "Lunch at scenic roadside location (1 hour)",
              `Visit local attractions related to ${requestData.interests} (2 hours)`,
              "Check into accommodation (5:00 PM)"
            ],
            accommodation: "Mid-range hotel or motel",
            estimatedCost: costPerDay,
          },
          {
            day: 2,
            title: `Day 2: Continuing towards ${requestData.destination}`,
            drivingDistance: "200 km",
            drivingTime: "4 hours",
            activities: [
              "Early morning departure (7:30 AM)",
              "Stop at interesting landmark (1.5 hours)",
              "Lunch in local town (1 hour)",
              "Visit scenic viewpoint for photos (45 minutes)",
              "Arrive at accommodation (6:00 PM)"
            ],
            accommodation: "Comfortable lodging en route",
            estimatedCost: costPerDay,
          },
        ],
        totalEstimatedCost: totalBudget,
        budgetBreakdown: {
          accommodation: Math.floor(totalBudget * 0.40),
          food: Math.floor(totalBudget * 0.30),
          activities: Math.floor(totalBudget * 0.20),
          transport: Math.floor(totalBudget * 0.10),
        },
        budgetTips: [
          "Pack snacks and drinks to save on roadside purchases",
          "Consider camping or budget motels to reduce accommodation costs",
          "Look for free attractions and scenic viewpoints"
        ],
        note: `All costs shown are for ${requestData.people} people (entire group). This is a mock response. Configure your Gemini API key for Roady-generated itineraries (see SETUP.md).`,
      };

      return new Response(
        JSON.stringify({
          itinerary: mockItinerary,
          status: "success",
          message: "Mock itinerary generated (API key not configured)",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }

    let prompt: string;

    if (requestData.editRequest && requestData.currentItinerary) {
      let historyContext = '';
      if (requestData.conversationHistory && requestData.conversationHistory.length > 0) {
        historyContext = '\n\nCONVERSATION HISTORY:\n';
        requestData.conversationHistory.forEach((entry, index) => {
          if (entry.type === 'original') {
            historyContext += `${index + 1}. Original Request: ${entry.request}\n`;
          } else {
            historyContext += `${index + 1}. Edit Request: ${entry.request}\n`;
          }
        });
      }

      prompt = `You are refining an existing road trip itinerary based on user feedback.
${historyContext}
CURRENT ITINERARY:
${JSON.stringify(requestData.currentItinerary, null, 2)}

LATEST EDIT REQUEST:
${requestData.editRequest}

ORIGINAL TRIP PARAMETERS:
- Departure: ${requestData.departure}
- Destination: ${requestData.destination}
- Days: ${requestData.days}
- Number of People: ${requestData.people}
- Total Budget for Entire Group: ₹${requestData.budget} INR
- Budget Per Person: ₹${Math.floor(Number(requestData.budget) / Number(requestData.people))} INR
- Transport Mode: ${requestData.transportMode}
- Interests: ${requestData.interests}

CRITICAL REMINDER: All costs in the itinerary are for the ENTIRE GROUP of ${requestData.people} people, NOT per person. The "note" field must start with "All costs shown are for ${requestData.people} people (entire group)."

MODIFICATION REQUIREMENTS:
1. Apply the user's requested changes precisely
2. Maintain realistic road trip logistics (driving times, distances)
3. Keep activities with detailed time estimates and costs in format: "Activity (time, cost)"
4. Update budget breakdown to reflect any cost changes with detailed transport breakdown
5. Preserve all elements not mentioned in the edit request
6. Ensure driving distances and times remain realistic
7. If adding activities, include duration estimates AND cost estimates
8. If budget changes significantly, update budgetTips accordingly
9. Maintain detailed fuel, toll, and parking cost breakdowns in the note field

IMPORTANT: Return ONLY valid JSON in this EXACT format (no additional text):
{
  "days": [
    {
      "day": 1,
      "title": "Day 1: [Departure City] to [Destination City]",
      "drivingDistance": "245 km",
      "drivingTime": "4.5 hours",
      "activities": [
        "Depart from [City] (7:00 AM)",
        "Breakfast at Highway Dhaba (8:00 AM - 8:45 AM, ₹400 for group)",
        "Fuel stop (9:00 AM, ₹500 estimated)",
        "Visit [Landmark] (10:00 AM - 12:00 PM, Entry: ₹200 per person)",
        "Lunch at [Restaurant] (12:30 PM - 1:30 PM, ₹800 for group)",
        "Visit [Attraction] (2:00 PM - 4:00 PM, Entry: ₹300 per person)",
        "Check into hotel (5:00 PM, Parking: ₹100)",
        "Dinner at local restaurant (7:00 PM - 8:30 PM, ₹1,000 for group)"
      ],
      "accommodation": "Mid-range hotel in [City] - AC room with WiFi (₹2,500 per night)",
      "estimatedCost": 6500
    }
  ],
  "totalEstimatedCost": 15000,
  "budgetBreakdown": {
    "accommodation": 5000,
    "food": 4000,
    "activities": 2000,
    "transport": 4000
  },
  "budgetTips": [
    "Pack snacks and drinks to reduce meal costs on the road",
    "Book accommodations in advance for better rates",
    "Fill fuel before toll plazas where prices are typically lower"
  ],
  "note": "All costs shown are for ${requestData.people} people (entire group). Transport breakdown: Fuel (245 km × ₹8/km = ₹1,960) + Tolls (₹600) + Parking (₹200) = ₹2,760. Best time to visit is October to March."
}

CONSISTENCY RULES:
- Maintain the same JSON structure as the current itinerary
- Keep the same number of days unless specifically requested to change
- Update all affected fields (costs, times, activities) consistently
- Ensure total costs match the sum of daily costs`;
    } else {
      prompt = `Create a detailed, realistic day-by-day road trip itinerary with the following parameters:

TRIP DETAILS:
- Departure: ${requestData.departure}
- Destination: ${requestData.destination}
- Duration: ${requestData.days} days
- Number of People: ${requestData.people}
- Total Budget for Entire Group: ₹${requestData.budget} INR (₹${Math.floor(Number(requestData.budget) / Number(requestData.people))} per person)
- Transport Mode: ${requestData.transportMode}
- Interests: ${requestData.interests}

REQUIREMENTS - You MUST provide:

1. ROUTE PLANNING:
   - Plan the route based on the specified transport mode: ${requestData.transportMode}
   - For car/bike: Calculate realistic driving distances (km) and driving time
   - For train/bus: Specify routes, stations, ticket costs, and travel time
   - For flight: Include flight details, airport transfers, and costs
   - For mixed: Specify which transport for each leg and detailed costs
   - Consider Indian transport infrastructure and options
   - Include specific cost estimates for the chosen transport mode

2. DAILY ACTIVITIES:
   - Provide 5-7 specific activities per day with approximate durations and costs
   - Format with cost info: "Visit [Attraction] ([duration], Entry: ₹[amount] per person)" or "Visit [Attraction] ([duration], Free)"
   - Examples:
     * "Visit Amber Fort (3 hours, Entry: ₹550 per person, Elephant ride optional: ₹1,200)"
     * "Breakfast at local dhaba (1 hour, ₹400 for 2 people)"
     * "Explore Promenade Beach (1.5 hours, Free)"
   - Include ALL meals (breakfast, lunch, dinner) with estimated costs for the group
   - Include rest/fuel stops with timing and costs
   - Match activities to stated interests
   - Mix free/low-cost activities with paid attractions
   - Specify exact timing for each activity (e.g., "8:00 AM - 9:00 AM")

3. ACCOMMODATION:
   - Suggest specific types of lodging appropriate for the budget with names/examples
   - Include city/town name where you'll stay
   - Estimate per-night costs for the entire group (e.g., "₹2,500-3,000 per night for double room")
   - Mention amenities (AC, WiFi, breakfast included, etc.)
   - Provide budget alternatives (e.g., "Budget: Guesthouse ₹1,500 | Mid-range: Hotel ₹3,000 | Luxury: Resort ₹6,000")

4. BUDGET BREAKDOWN (ALL COSTS ARE FOR THE ENTIRE GROUP):
   - CRITICAL: All costs shown must be for the ENTIRE GROUP of ${requestData.people} people, NOT per person
   - In the "note" field, you MUST include detailed transport cost breakdown with: "All costs shown are for ${requestData.people} people (entire group). Transport: [specific breakdown]"
   - Calculate costs for: accommodation (total for group), food (total for group), activities (total for group), transport (total for group)
   - Transport costs MUST be itemized and detailed based on mode:
     * Car (own):
       - Fuel: Calculate total distance × ₹7-8/km (specify mileage, e.g., "580 km × ₹8/km = ₹4,640")
       - Tolls: Estimate based on route (e.g., "₹500-800 for major highways")
       - Parking: Daily parking at attractions/hotels (e.g., "₹200-300 total")
       - Example: "Fuel ₹4,640 + Tolls ₹600 + Parking ₹250 = ₹5,490"
     * Rental car:
       - Car rental: ₹2,500-4,000/day × number of days
       - Fuel: Total distance × ₹7-8/km
       - Tolls: Estimate based on route
       - Parking: Daily parking costs
       - Insurance/deposit: If applicable
     * Bike:
       - Fuel: Total distance × ₹2-3/km (better mileage than car)
       - Tolls: Same as car tolls
       - Parking: Minimal (₹20-50/day)
     * Bus: Ticket prices per person × number of people, specify bus type (AC/Non-AC)
     * Train: Ticket prices per person × number of people (specify class: Sleeper/3AC/2AC/1AC)
     * Flight: Airfare per person × number of people + airport transfers (₹500-1000 per person)
     * Mixed: Itemize each transport segment with detailed costs
   - All costs should be appropriate for India and scaled for ${requestData.people} people
   - Add a "budgetTips" field with 3-5 practical money-saving suggestions
   - Include transport-specific tips (e.g., "Book train tickets 60 days in advance for lowest fares", "Fill fuel before toll plazas for better prices")

5. PRACTICAL INFORMATION:
   - Best times to visit each location
   - Weather considerations for the route
   - Important notes (e.g., "Book accommodation in advance during peak season")

IMPORTANT: Return ONLY valid JSON in this EXACT format (no additional text):
{
  "days": [
    {
      "day": 1,
      "title": "Day 1: [Departure City] to [Destination City]",
      "drivingDistance": "245 km",
      "drivingTime": "4.5 hours",
      "activities": [
        "Depart from [City] (7:00 AM)",
        "Breakfast at Highway Dhaba (8:00 AM - 8:45 AM, ₹400 for group)",
        "Fuel stop (9:00 AM, ₹500 estimated)",
        "Visit [Landmark] (10:00 AM - 12:00 PM, Entry: ₹200 per person)",
        "Lunch at [Restaurant] (12:30 PM - 1:30 PM, ₹800 for group)",
        "Visit [Attraction] (2:00 PM - 4:00 PM, Entry: ₹300 per person)",
        "Check into hotel (5:00 PM, Parking: ₹100)",
        "Dinner at local restaurant (7:00 PM - 8:30 PM, ₹1,000 for group)"
      ],
      "accommodation": "Mid-range hotel in [City] - AC room with WiFi and breakfast (₹2,500 per night)",
      "estimatedCost": 6500
    }
  ],
  "totalEstimatedCost": 15000,
  "budgetBreakdown": {
    "accommodation": 5000,
    "food": 4000,
    "activities": 2000,
    "transport": 4000
  },
  "budgetTips": [
    "Pack snacks and drinks to reduce meal costs on the road",
    "Book accommodations in advance for better rates (save 20-30%)",
    "Fill fuel before toll plazas where prices are typically lower",
    "Use government tourism websites for attraction passes to save money",
    "Travel during weekdays to avoid weekend surge pricing"
  ],
  "note": "All costs shown are for ${requestData.people} people (entire group). Transport breakdown: Fuel (245 km × ₹8/km = ₹1,960) + Tolls (₹600) + Parking (₹200) = ₹2,760. Best time to visit is October to March. Book popular attractions in advance during peak season."
}

VALIDATION RULES:
- Total estimated cost should be close to (but can slightly exceed) the provided budget
- ALL COSTS MUST BE FOR THE ENTIRE GROUP OF ${requestData.people} PEOPLE, NOT PER PERSON
- The "note" field MUST START WITH: "All costs shown are for ${requestData.people} people (entire group)."
- Driving distances must be realistic and achievable
- Activities must include time estimates
- Each day should have 3-5 activities minimum
- Budget tips only needed if budget is tight or costs are near limit`;
    }

    console.log('Calling Gemini API...');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a helpful travel assistant that creates detailed, practical road trip itineraries. You MUST respond with valid JSON only, no additional text or explanations.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error status:', geminiResponse.status);
      console.error('Gemini API error response:', errorText);

      let errorMessage = 'Failed to generate itinerary';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = `API error (${geminiResponse.status})`;
      }

      throw new Error(errorMessage);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received, candidates:', geminiData.candidates?.length || 0);

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error('No candidates in Gemini response:', JSON.stringify(geminiData));
      throw new Error('No response from Gemini API - please try again');
    }

    if (!geminiData.candidates[0].content || !geminiData.candidates[0].content.parts || !geminiData.candidates[0].content.parts[0]) {
      console.error('Invalid response structure:', JSON.stringify(geminiData.candidates[0]));
      throw new Error('Invalid response structure from Gemini API');
    }

    let itineraryContent = geminiData.candidates[0].content.parts[0].text;
    console.log('Response content length:', itineraryContent.length);

    let itineraryJson;
    try {
      itineraryContent = itineraryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const jsonMatch = itineraryContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        itineraryContent = jsonMatch[0];
      } else {
        console.error('No JSON object found in response');
        throw new Error('Response does not contain valid JSON');
      }

      itineraryJson = JSON.parse(itineraryContent);

      if (!itineraryJson.days || !Array.isArray(itineraryJson.days) || itineraryJson.days.length === 0) {
        console.error('Invalid itinerary structure:', JSON.stringify(itineraryJson).substring(0, 200));
        throw new Error('Invalid itinerary format');
      }

    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw content preview:', itineraryContent.substring(0, 500));
      throw new Error('Failed to parse itinerary - please try again');
    }

    const response = {
      itinerary: itineraryJson,
      status: "success",
      message: "Itinerary generated successfully",
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);

    return new Response(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});

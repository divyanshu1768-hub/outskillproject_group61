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
3. Keep activities with time estimates in format: "Activity (duration)"
4. Update budget breakdown to reflect any cost changes
5. Preserve all elements not mentioned in the edit request
6. Ensure driving distances and times remain realistic
7. If adding activities, include duration estimates
8. If budget changes significantly, update budgetTips accordingly

IMPORTANT: Return ONLY valid JSON in this EXACT format (no additional text):
{
  "days": [
    {
      "day": 1,
      "title": "Day 1: [Departure City] to [Destination City]",
      "drivingDistance": "245 km",
      "drivingTime": "4.5 hours",
      "activities": [
        "Depart from [City] (8:00 AM)",
        "Stop at [Landmark] (1 hour)",
        "Lunch at [Location] (1 hour)",
        "Visit [Attraction] (2 hours)",
        "Check into hotel (6:00 PM)"
      ],
      "accommodation": "Mid-range hotel in [City]",
      "estimatedCost": 150
    }
  ],
  "totalEstimatedCost": 500,
  "budgetBreakdown": {
    "accommodation": 200,
    "food": 150,
    "activities": 100,
    "transport": 50
  },
  "budgetTips": [
    "Pack snacks and drinks to reduce meal costs",
    "Book accommodations in advance for better rates"
  ],
  "note": "Best time to visit is spring or fall. Book popular attractions in advance."
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
   - Provide 3-5 specific activities per day with approximate durations
   - Format: "Activity name (duration)" e.g., "Visit Grand Canyon (3 hours)"
   - Include rest/meal breaks in the schedule
   - Match activities to stated interests
   - Mix free/low-cost activities with paid attractions

3. ACCOMMODATION:
   - Suggest specific types of lodging appropriate for the budget
   - Include city/town name where you'll stay
   - Estimate per-night costs

4. BUDGET BREAKDOWN (ALL COSTS ARE FOR THE ENTIRE GROUP):
   - CRITICAL: All costs shown must be for the ENTIRE GROUP of ${requestData.people} people, NOT per person
   - In the "note" field, you MUST include: "All costs shown are for ${requestData.people} people (entire group)"
   - Calculate costs for: accommodation (total for group), food (total for group), activities (total for group), transport
   - Transport costs based on mode:
     * Car (own): fuel (~₹6-8/km), tolls, parking
     * Rental car: rental fee (~₹2000-4000/day), fuel, tolls, parking
     * Bike: fuel (~₹2-3/km), tolls, parking
     * Bus: ticket prices per person
     * Train: ticket prices per person (specify class)
     * Flight: airfare per person, airport transfers
     * Mixed: itemized costs for each transport mode used
   - All costs should be appropriate for India and scaled for ${requestData.people} people
   - Add a "budgetTips" field with 2-3 money-saving suggestions
   - Include transport-specific tips (e.g., book train tickets in advance, carpooling)

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
        "Depart from [City] (8:00 AM)",
        "Stop at [Landmark] (1 hour)",
        "Lunch at [Location] (1 hour)",
        "Visit [Attraction] (2 hours)",
        "Check into hotel (6:00 PM)"
      ],
      "accommodation": "Mid-range hotel in [City]",
      "estimatedCost": 150
    }
  ],
  "totalEstimatedCost": 500,
  "budgetBreakdown": {
    "accommodation": 200,
    "food": 150,
    "activities": 100,
    "transport": 50
  },
  "budgetTips": [
    "Pack snacks and drinks to reduce meal costs",
    "Book accommodations in advance for better rates"
  ],
  "note": "All costs shown are for ${requestData.people} people (entire group). Best time to visit is spring or fall. Book popular attractions in advance."
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
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    let itineraryContent = geminiData.candidates[0].content.parts[0].text;

    console.log('Successfully received response from Gemini');

    let itineraryJson;
    try {
      itineraryContent = itineraryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const jsonMatch = itineraryContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        itineraryContent = jsonMatch[0];
      }

      itineraryJson = JSON.parse(itineraryContent);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw content:', itineraryContent);
      console.error('Content length:', itineraryContent.length);
      throw new Error('Failed to parse itinerary JSON from Roady response');
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

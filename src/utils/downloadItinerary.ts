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

export function downloadAsJSON(itinerary: Itinerary, departure: string, destination: string) {
  const data = {
    trip: {
      departure,
      destination,
      generatedAt: new Date().toISOString(),
    },
    itinerary,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${departure}-to-${destination}-itinerary.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsText(itinerary: Itinerary, departure: string, destination: string) {
  let text = `ROAD TRIP ITINERARY\n`;
  text += `${departure} to ${destination}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `${'='.repeat(60)}\n\n`;

  if (itinerary.note) {
    text += `IMPORTANT NOTES:\n${itinerary.note}\n\n`;
    text += `${'='.repeat(60)}\n\n`;
  }

  itinerary.days.forEach((day) => {
    text += `DAY ${day.day}: ${day.title}\n`;
    text += `${'-'.repeat(60)}\n`;

    if (day.drivingDistance) {
      text += `Distance: ${day.drivingDistance} | Time: ${day.drivingTime}\n\n`;
    }

    text += `ACTIVITIES:\n`;
    day.activities.forEach((activity, index) => {
      text += `  ${index + 1}. ${activity}\n`;
    });

    text += `\nACCOMMODATION:\n`;
    text += `  ${day.accommodation}\n`;

    text += `\nESTIMATED COST: ₹${day.estimatedCost.toLocaleString()}\n`;
    text += `\n${'='.repeat(60)}\n\n`;
  });

  if (itinerary.budgetBreakdown) {
    text += `BUDGET BREAKDOWN\n`;
    text += `${'-'.repeat(60)}\n`;
    text += `Accommodation: ₹${itinerary.budgetBreakdown.accommodation.toLocaleString()}\n`;
    text += `Food: ₹${itinerary.budgetBreakdown.food.toLocaleString()}\n`;
    text += `Activities: ₹${itinerary.budgetBreakdown.activities.toLocaleString()}\n`;
    text += `Transport: ₹${itinerary.budgetBreakdown.transport.toLocaleString()}\n`;
    text += `${'-'.repeat(60)}\n`;
  }

  text += `TOTAL ESTIMATED COST: ₹${itinerary.totalEstimatedCost.toLocaleString()}\n\n`;

  if (itinerary.budgetTips && itinerary.budgetTips.length > 0) {
    text += `BUDGET TIPS:\n`;
    itinerary.budgetTips.forEach((tip, index) => {
      text += `  ${index + 1}. ${tip}\n`;
    });
  }

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${departure}-to-${destination}-itinerary.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsHTML(itinerary: Itinerary, departure: string, destination: string) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${departure} to ${destination} - Road Trip Itinerary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      background: #f9fafb;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 2em;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin-bottom: 30px;
      border-radius: 0 8px 8px 0;
    }
    .day-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }
    .day-header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .day-title {
      font-size: 1.5em;
      font-weight: bold;
      color: #1e293b;
      margin: 0 0 5px 0;
    }
    .day-meta {
      color: #64748b;
      font-size: 0.95em;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 10px;
      font-size: 1.1em;
    }
    .activity-list {
      list-style: none;
      padding: 0;
    }
    .activity-list li {
      padding: 8px 0 8px 25px;
      position: relative;
    }
    .activity-list li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: #2563eb;
      font-weight: bold;
    }
    .cost-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 5px 12px;
      border-radius: 20px;
      font-weight: 600;
      display: inline-block;
      margin-top: 10px;
    }
    .budget-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 25px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }
    .budget-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .budget-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .budget-label {
      font-size: 0.9em;
      color: #64748b;
      margin-bottom: 5px;
    }
    .budget-value {
      font-size: 1.3em;
      font-weight: bold;
      color: #1e293b;
    }
    .total-cost {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 1.5em;
      font-weight: bold;
      margin-top: 20px;
    }
    .tips {
      background: #e0f2fe;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .tips ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
    }
    .tips li {
      margin-bottom: 8px;
    }
    @media print {
      body {
        background: white;
      }
      .day-card, .budget-section {
        box-shadow: none;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Road Trip Itinerary</h1>
    <p>${departure} → ${destination}</p>
    <p style="margin-top: 10px; font-size: 0.9em;">Generated: ${new Date().toLocaleString()}</p>
  </div>

  ${itinerary.note ? `<div class="note">${itinerary.note}</div>` : ''}

  ${itinerary.days.map((day) => `
    <div class="day-card">
      <div class="day-header">
        <div class="day-title">Day ${day.day}: ${day.title}</div>
        ${day.drivingDistance ? `<div class="day-meta">📍 ${day.drivingDistance} • 🕐 ${day.drivingTime}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Activities</div>
        <ul class="activity-list">
          ${day.activities.map(activity => `<li>${activity}</li>`).join('')}
        </ul>
      </div>

      <div class="section">
        <div class="section-title">Accommodation</div>
        <p>${day.accommodation}</p>
      </div>

      <div class="cost-badge">Daily Cost: ₹${day.estimatedCost.toLocaleString()}</div>
    </div>
  `).join('')}

  <div class="budget-section">
    <h2 style="margin-top: 0; color: #1e293b;">Budget Summary</h2>

    ${itinerary.budgetBreakdown ? `
      <div class="budget-grid">
        <div class="budget-item">
          <div class="budget-label">Accommodation</div>
          <div class="budget-value">₹${itinerary.budgetBreakdown.accommodation.toLocaleString()}</div>
        </div>
        <div class="budget-item">
          <div class="budget-label">Food</div>
          <div class="budget-value">₹${itinerary.budgetBreakdown.food.toLocaleString()}</div>
        </div>
        <div class="budget-item">
          <div class="budget-label">Activities</div>
          <div class="budget-value">₹${itinerary.budgetBreakdown.activities.toLocaleString()}</div>
        </div>
        <div class="budget-item">
          <div class="budget-label">Transport</div>
          <div class="budget-value">₹${itinerary.budgetBreakdown.transport.toLocaleString()}</div>
        </div>
      </div>
    ` : ''}

    <div class="total-cost">
      Total Trip Cost: ₹${itinerary.totalEstimatedCost.toLocaleString()}
    </div>

    ${itinerary.budgetTips && itinerary.budgetTips.length > 0 ? `
      <div class="tips">
        <strong style="color: #0369a1;">💡 Money-Saving Tips:</strong>
        <ul>
          ${itinerary.budgetTips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${departure}-to-${destination}-itinerary.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

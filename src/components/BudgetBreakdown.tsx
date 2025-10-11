import { DollarSign, Home, Utensils, Compass, Car, AlertTriangle } from 'lucide-react';

interface BudgetBreakdown {
  accommodation: number;
  food: number;
  activities: number;
  transport: number;
}

interface BudgetBreakdownProps {
  budgetBreakdown: BudgetBreakdown;
  totalEstimatedCost: number;
  userBudget: number;
}

export function BudgetBreakdownComponent({ budgetBreakdown, totalEstimatedCost, userBudget }: BudgetBreakdownProps) {
  const isOverBudget = totalEstimatedCost > userBudget;
  const budgetUsagePercent = Math.min((totalEstimatedCost / userBudget) * 100, 100);

  const categories = [
    {
      name: 'Accommodation',
      amount: budgetBreakdown.accommodation,
      icon: Home,
      color: 'bg-[#D62828]',
      lightColor: 'bg-[#D62828]/10',
      textColor: 'text-[#D62828]',
    },
    {
      name: 'Food',
      amount: budgetBreakdown.food,
      icon: Utensils,
      color: 'bg-[#F77F00]',
      lightColor: 'bg-[#F77F00]/10',
      textColor: 'text-[#F77F00]',
    },
    {
      name: 'Activities',
      amount: budgetBreakdown.activities,
      icon: Compass,
      color: 'bg-[#FCBF49]',
      lightColor: 'bg-[#FCBF49]/10',
      textColor: 'text-[#FCBF49]',
    },
    {
      name: 'Transport',
      amount: budgetBreakdown.transport,
      icon: Car,
      color: 'bg-[#003049]',
      lightColor: 'bg-[#003049]/10',
      textColor: 'text-[#003049]',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-[#F77F00]/30 p-6">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6 text-[#D62828]" />
        <h3 className="text-xl font-bold text-[#003049]">Budget Breakdown</h3>
      </div>

      {isOverBudget && (
        <div className="mb-6 p-4 bg-[#D62828]/10 border-l-4 border-[#D62828] rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D62828] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#D62828]">Over Budget Warning</p>
              <p className="text-sm text-[#003049] mt-1">
                Estimated cost (₹{totalEstimatedCost}) exceeds your budget (₹{userBudget}) by ₹{totalEstimatedCost - userBudget}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[#003049]">Budget Usage</span>
          <span className="text-sm font-semibold text-[#003049]">
            ₹{totalEstimatedCost} / ₹{userBudget}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isOverBudget
                ? 'bg-gradient-to-r from-[#D62828] to-[#D62828]/80'
                : budgetUsagePercent > 80
                ? 'bg-gradient-to-r from-[#F77F00] to-[#FCBF49]'
                : 'bg-gradient-to-r from-[#F77F00] to-[#FCBF49]'
            }`}
            style={{ width: `${budgetUsagePercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-[#003049]/70">{budgetUsagePercent.toFixed(1)}% used</span>
          {!isOverBudget && (
            <span className="text-xs text-[#003049]/70">
              ₹{userBudget - totalEstimatedCost} remaining
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const percentage = (category.amount / totalEstimatedCost) * 100;
          const Icon = category.icon;

          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`${category.lightColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${category.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-[#003049]">{category.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#003049]">₹{category.amount}</span>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${category.color} h-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-xs text-[#003049]/70 mt-1 block text-right">
                  {percentage.toFixed(1)}% of total
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t-2 border-[#F77F00]/30">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[#003049]">Total Estimated Cost</span>
          <span className="text-2xl font-bold text-[#D62828]">₹{totalEstimatedCost}</span>
        </div>
      </div>
    </div>
  );
}

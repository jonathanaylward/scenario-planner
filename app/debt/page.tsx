"use client";

import { useState, useEffect } from "react";

const ALL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getNext12Months(date = new Date()): string[] {
  const currentMonthIndex = date.getMonth();
  return Array.from({ length: 12 }, (_, i) => ALL_MONTHS[(currentMonthIndex + i) % 12]);
}

export default function DebtEngine() {
  const [balance, setBalance] = useState<number>(0);
  const [apr, setApr] = useState<number>(24.99);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(200);
  const [autoImported, setAutoImported] = useState<boolean>(false);

  useEffect(() => {
    const calendarMonths = getNext12Months(new Date());
    const saved = localStorage.getItem("scenario-planner-v7");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const ccDebt = parsed.ccDebt || 0;
        const income = parsed.income || 0;
        const fixedCosts = parsed.fixedCosts || [];
        const expenses = parsed.expenses || [];

        // Replicate the scenario math to find projected deficits
        const totalFixed = fixedCosts.reduce((sum: number, fc: any) => sum + (Number(fc.cost) || 0), 0);
        const baselineMargin = income - totalFixed;
        let newDebtCreated = 0;

        calendarMonths.forEach((month) => {
          const monthlyDiscretionary = expenses
            .filter((e: any) => e.active && e.month === month)
            .reduce((sum: number, e: any) => sum + (Number(e.cost) || 0), 0);
          
          const netMargin = baselineMargin - monthlyDiscretionary;
          if (netMargin < 0) {
            newDebtCreated += Math.abs(netMargin);
          }
        });

        const projectedTotalDebt = ccDebt + newDebtCreated;
        if (projectedTotalDebt > 0) {
          setBalance(projectedTotalDebt);
          setAutoImported(true);
        }
      } catch (e) {
        console.error("Failed to parse scenario planner data", e);
      }
    }
  }, []);

  const calculateAmortization = () => {
    let currentBalance = balance;
    const monthlyRate = (apr / 100) / 12;
    let totalInterest = 0;
    let months = 0;
    
    // Prevent infinite loops if payment doesn't cover interest
    if (currentBalance > 0 && currentBalance * monthlyRate >= monthlyPayment) {
      return { infinite: true, totalInterest: 0, months: 0 };
    }

    while (currentBalance > 0 && months < 600) { // 50-year safety cap
      const interestForMonth = currentBalance * monthlyRate;
      let principalForMonth = monthlyPayment - interestForMonth;

      if (currentBalance < principalForMonth) {
        principalForMonth = currentBalance;
      }

      totalInterest += interestForMonth;
      currentBalance -= principalForMonth;
      months++;
    }

    return { infinite: false, totalInterest, months };
  };

  const results = calculateAmortization();
  const totalCost = balance + results.totalInterest;

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-gray-900">
      <h1 className="text-3xl font-bold mb-8">Debt Amortization Engine</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Inputs */}
        <div className="bg-gray-50 border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">Debt Variables</h2>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm text-gray-600">Total Principal Balance</label>
                {autoImported && (
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                    Imported from Scenarios
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input 
                  type="number" 
                  value={balance} 
                  onChange={(e) => {
                    setBalance(Number(e.target.value));
                    setAutoImported(false); // Clear badge if user manually edits
                  }}
                  className="w-full pl-8 pr-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Annual Percentage Rate (APR %)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={apr} 
                  onChange={(e) => setApr(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Target Monthly Payment</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input 
                  type="number" 
                  value={monthlyPayment} 
                  onChange={(e) => setMonthlyPayment(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">True Cost Projection</h2>
          
          {results.infinite ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg font-bold shadow-sm">
              Critical Alert: Your monthly payment (${monthlyPayment}) does not even cover the monthly interest. This debt will grow indefinitely.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">Time to Payoff:</span>
                <span className="text-xl font-bold">{Math.floor(results.months / 12)} yrs {results.months % 12} mos</span>
              </div>
              
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-gray-600">Total Interest Burned:</span>
                <span className="text-xl font-bold text-red-600">${results.totalInterest.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-900 font-bold">Total Cash Paid:</span>
                <span className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
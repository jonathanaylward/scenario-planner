"use client";

import { useState, useEffect, useRef } from "react";
import defaultData from "./default-scenario.json";

type FixedCost = { id: string; name: string; cost: number };
type Expense = { id: string; name: string; cost: number; month: string; category: string; active: boolean };
type AppData = { startingCash: number; ccDebt: number; income: number; fixedCosts: FixedCost[]; expenses: Expense[] };

const calendarMonths = [
  "September", "October", "November", "December", "January", "February",
  "March", "April", "May", "June", "July", "August"
];

export default function ScenarioPlanner() {
  const [data, setData] = useState<AppData>({ ...defaultData, startingCash: defaultData.startingCash || 0, ccDebt: defaultData.ccDebt || 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("scenario-planner-v7");
    if (saved) {
      setData(JSON.parse(saved));
    } else {
      setData(defaultData);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("scenario-planner-v7", JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const updateField = (field: keyof AppData, val: number) => setData({ ...data, [field]: val });

  const addFixedCost = () => {
    setData((prev) => ({ ...prev, fixedCosts: [...prev.fixedCosts, { id: "f" + Date.now(), name: "New Bill", cost: 0 }] }));
  };

  const deleteFixedCost = (id: string) => {
    setData((prev) => ({ ...prev, fixedCosts: prev.fixedCosts.filter((fc) => fc.id !== id) }));
  };

  const updateFixedCostField = (id: string, field: keyof FixedCost, value: any) => {
    setData((prev) => ({ ...prev, fixedCosts: prev.fixedCosts.map((fc) => (fc.id === id ? { ...fc, [field]: value } : fc)) }));
  };

  const addExpense = () => {
    setData((prev) => ({ ...prev, expenses: [...prev.expenses, { id: "e" + Date.now(), name: "New Expense", cost: 0, month: "September", category: "Misc", active: true }] }));
  };

  const deleteExpense = (id: string) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.filter((exp) => exp.id !== id) }));
  };

  const updateExpenseField = (id: string, field: keyof Expense, value: any) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)) }));
  };

  const toggleExpense = (id: string) => {
    setData((prev) => ({ ...prev, expenses: prev.expenses.map((exp) => (exp.id === id ? { ...exp, active: !exp.active } : exp)) }));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scenario-budget-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setData(JSON.parse(event.target?.result as string));
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isLoaded) return null;

  const totalFixed = data.fixedCosts.reduce((sum, fc) => sum + fc.cost, 0);
  const baselineMargin = data.income - totalFixed;
  const currentNetLiquidity = data.startingCash - data.ccDebt;
  
  // Calculate Flow and Debt Impact
  let accumulatedFlow = 0;
  let newDebtCreated = 0;

  calendarMonths.forEach((month) => {
    const monthlyDiscretionary = data.expenses
      .filter((e) => e.active && e.month === month)
      .reduce((sum, e) => sum + e.cost, 0);
    
    const netMargin = baselineMargin - monthlyDiscretionary;
    if (netMargin < 0) {
      newDebtCreated += Math.abs(netMargin);
    }
  });

  const totalProjectedDebt = data.ccDebt + newDebtCreated;
  const monthsToPayoff = baselineMargin > 0 ? (totalProjectedDebt / baselineMargin).toFixed(1) : "∞";

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-stretch mb-8 gap-6">
        
        {/* Header & Controls */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-3">Time-Phased Scenario Planner</h1>
          <div className="space-x-3 flex items-center">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition text-sm font-medium">Import JSON</button>
            <button onClick={handleExport} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium">Export JSON</button>
          </div>
        </div>

        {/* Current Liquidity Sandbox */}
        <div className="bg-gray-50 border rounded-lg p-4 w-full md:w-64 shadow-sm flex flex-col justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Liquidity</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500">Cash</label>
              <input type="number" value={data.startingCash} onChange={(e) => updateField("startingCash", Number(e.target.value))} className="w-full text-lg font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">CC Debt</label>
              <input type="number" value={data.ccDebt} onChange={(e) => updateField("ccDebt", Number(e.target.value))} className="w-full text-lg font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-red-500 text-red-600" />
            </div>
          </div>
          <div className="flex justify-between items-center border-t pt-2 mt-auto">
            <span className="text-xs font-medium text-gray-600">Net Position:</span>
            <span className={`text-sm font-bold ${currentNetLiquidity >= 0 ? "text-green-700" : "text-red-600"}`}>
              ${currentNetLiquidity.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Debt & Recovery Impact */}
        <div className={`border rounded-lg p-4 w-full md:w-72 shadow-sm flex flex-col justify-between ${newDebtCreated > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">Debt & Recovery Impact</h2>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-600">New Debt from Scenarios:</span>
            <span className={`font-bold ${newDebtCreated > 0 ? "text-red-600" : "text-gray-900"}`}>${newDebtCreated.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-gray-600">Total Projected Debt:</span>
            <span className="font-bold text-gray-900">${totalProjectedDebt.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2 mt-auto">
            <span className="text-xs font-medium text-gray-600">Recovery Penalty:</span>
            <span className="text-sm font-bold text-gray-900">
              {baselineMargin <= 0 ? "Impossible (Negative Margin)" : `${monthsToPayoff} Months`}
            </span>
          </div>
        </div>

      </div>

      {/* 12-Month Cumulative Dashboard */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Cumulative Cash Flow Generated (Next 12 Months)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {calendarMonths.map((month) => {
            const monthlyDiscretionary = data.expenses
              .filter((e) => e.active && e.month === month)
              .reduce((sum, e) => sum + e.cost, 0);
            
            const netMargin = baselineMargin - monthlyDiscretionary;
            accumulatedFlow += netMargin; 
            
            return (
              <div key={month} className={`p-4 border rounded-lg ${accumulatedFlow >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <div className="text-sm font-semibold text-gray-700">{month}</div>
                <div className="text-xs text-gray-500 mt-1">Monthly Flow: ${netMargin.toFixed(0)}</div>
                <div className={`text-xl font-bold mt-2 ${accumulatedFlow >= 0 ? "text-green-700" : "text-red-700"}`}>
                  ${accumulatedFlow.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Income & Fixed Costs */}
        <div className="col-span-1">
          <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
            <label className="block text-sm text-gray-500 mb-1">Net Monthly Income</label>
            <input type="number" value={data.income} onChange={(e) => updateField("income", Number(e.target.value))} className="w-full text-2xl font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold">Fixed Monthly Overhead</h2>
            <button onClick={addFixedCost} className="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700 transition">
              + Add Bill
            </button>
          </div>
          
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left">
              <tbody>
                {data.fixedCosts.map((fc) => (
                  <tr key={fc.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-2"><input type="text" value={fc.name} onChange={(e) => updateFixedCostField(fc.id, "name", e.target.value)} className="w-full bg-transparent border-b border-dashed focus:border-solid focus:border-blue-500 focus:outline-none px-1 py-1 font-medium text-gray-700" /></td>
                    <td className="p-2 text-right whitespace-nowrap">$ <input type="number" value={fc.cost} onChange={(e) => updateFixedCostField(fc.id, "cost", Number(e.target.value))} className="w-24 text-right bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" /></td>
                    <td className="p-2 text-center align-middle w-10"><button onClick={() => deleteFixedCost(fc.id)} className="text-gray-400 hover:text-red-600 transition font-bold" title="Delete Item">×</button></td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2">
                  <td className="p-3 text-sm">Total Fixed Outflow</td>
                  <td colSpan={2} className="p-3 text-right text-red-600 pr-12">${totalFixed.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 text-sm">Baseline Margin</td>
                  <td colSpan={2} className="p-3 text-right text-green-700 pr-12">${baselineMargin.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Scenario Sandbox */}
        <div className="col-span-1 lg:col-span-2">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold">Discretionary Scenarios</h2>
            <button onClick={addExpense} className="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700 transition">
              + Add Item
            </button>
          </div>
          
          <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 w-10 text-center"></th>
                  <th className="p-3">Expense Item</th>
                  <th className="p-3 text-right">Cost</th>
                  <th className="p-3">Target Month</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3 text-center align-middle"><input type="checkbox" checked={expense.active} onChange={() => toggleExpense(expense.id)} className="w-5 h-5 cursor-pointer rounded border-gray-300" /></td>
                    <td className="p-2"><input type="text" value={expense.name} onChange={(e) => updateExpenseField(expense.id, "name", e.target.value)} className={`w-full bg-transparent border-b border-dashed focus:border-solid focus:border-blue-500 focus:outline-none px-1 py-1 ${expense.active ? "text-gray-900 font-medium" : "text-gray-400"}`} /></td>
                    <td className="p-2 text-right whitespace-nowrap">$ <input type="number" value={expense.cost} onChange={(e) => updateExpenseField(expense.id, "cost", Number(e.target.value))} className="w-20 text-right bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" /></td>
                    <td className="p-2">
                      <select value={expense.month} onChange={(e) => updateExpenseField(expense.id, "month", e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500">
                        {calendarMonths.map(m => (<option key={m} value={m}>{m}</option>))}
                      </select>
                    </td>
                    <td className="p-2"><input type="text" value={expense.category} onChange={(e) => updateExpenseField(expense.id, "category", e.target.value)} className="w-24 bg-gray-100 border border-transparent rounded px-2 py-1 text-xs focus:outline-none focus:bg-white focus:border-blue-500" /></td>
                    <td className="p-3 text-center align-middle"><button onClick={() => deleteExpense(expense.id)} className="text-gray-400 hover:text-red-600 transition font-bold" title="Delete Item">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
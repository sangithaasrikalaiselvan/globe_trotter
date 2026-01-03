import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";

export default function Budget() {
  const { id } = useParams();
  const [totalBudget, setTotalBudget] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Flight");

  async function loadBudget() {
    const { data: budget } = await supabase
      .from("trip_budget")
      .select("*")
      .eq("trip_id", id!)
      .single();

    if (budget) setTotalBudget(budget.total_budget);

    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("*")
      .eq("trip_id", id!);

    if (budgetItems) setItems(budgetItems);
  }

  async function saveBudget() {
    await supabase.from("trip_budget").upsert({
      trip_id: id,
      total_budget: totalBudget,
    });
    loadBudget();
  }

  async function addExpense() {
    if (!amount) return alert("Enter amount!");

    await supabase.from("budget_items").insert({
      trip_id: id,
      amount: Number(amount),
      category,
    });

    setAmount("");
    loadBudget();
  }

  useEffect(() => {
    loadBudget();
  }, []);

  const totalSpent = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const remaining = totalBudget - totalSpent;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Budget Planner</h1>

        {/* TOTAL BUDGET INPUT */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <label className="font-semibold">Total Trip Budget</label>
          <input
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="w-full border p-2 rounded mt-2"
            placeholder="Enter total budget"
          />
          <button
            onClick={saveBudget}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save Budget
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-xl text-center">
            <p>Total Budget</p>
            <h2 className="text-xl font-bold">${totalBudget}</h2>
          </div>

          <div className="bg-green-100 p-4 rounded-xl text-center">
            <p>Spent</p>
            <h2 className="text-xl font-bold">${totalSpent}</h2>
          </div>

          <div className="bg-yellow-100 p-4 rounded-xl text-center">
            <p>Remaining</p>
            <h2 className="text-xl font-bold">${remaining}</h2>
          </div>
        </div>

        {/* ADD EXPENSE */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <h2 className="font-semibold mb-2">Add Expense</h2>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded mr-2"
          >
            <option>Flight</option>
            <option>Hotel</option>
            <option>Food</option>
            <option>Transport</option>
            <option>Shopping</option>
            <option>Other</option>
          </select>

          <input
            type="number"
            placeholder="Amount"
            className="border p-2 rounded mr-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <button
            onClick={addExpense}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Add
          </button>
        </div>

        {/* LIST */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="font-semibold mb-3">Expense List</h2>

          {items.map((i) => (
            <div className="flex justify-between border-b py-2" key={i.id}>
              <span>{i.category}</span>
              <span>${i.amount}</span>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-gray-500 text-center">No expenses yet</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

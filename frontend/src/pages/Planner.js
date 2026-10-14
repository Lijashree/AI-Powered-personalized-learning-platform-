import { useState, useEffect } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ListTodo,
  CheckCircle2,
} from "lucide-react";

export default function Planner() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/planner/goals");
      setGoals(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Please specify a goal title.");
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post("/planner/goals", {
        title: title.trim(),
        description: description.trim(),
        target_date: targetDate || null,
      });
      setGoals([data, ...goals]);
      setTitle("");
      setDescription("");
      setTargetDate("");
      toast.success("Goal added successfully!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setAdding(false);
    }
  };

  const handleToggleGoal = async (goalId) => {
    try {
      const { data } = await api.put(`/planner/goals/${goalId}`);
      setGoals(
        goals.map((g) => (g.id === goalId ? { ...g, is_completed: data.is_completed } : g))
      );
      toast.success(data.is_completed ? "Goal completed!" : "Goal unmarked");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;
    try {
      await api.delete(`/planner/goals/${goalId}`);
      setGoals(goals.filter((g) => g.id !== goalId));
      toast.success("Goal deleted");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const total = goals.length;
  const completed = goals.filter((g) => g.is_completed).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pendingGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left panel: Add Goal Form */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm sticky top-24 space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-zinc-900 dark:text-white" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Create Study Goal</h2>
          </div>
          
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Goal Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Binary Trees, Solve 3 LeetCode problems"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                disabled={adding}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Short Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Read through notes and attempt quiz"
                className="w-full min-h-[80px] px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all resize-y"
                disabled={adding}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Date (Optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                disabled={adding}
              />
            </div>
            
            <button
              type="submit"
              disabled={adding || !title.trim()}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Goal...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Goal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right panel: Checklist grid & Stats */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Progress header summary */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Goal Completion Progress</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Track and finish your study tasks</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                {progressPct}% ({completed} of {total} completed)
              </span>
            </div>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Goals Checklist Streams */}
        {loading && goals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Syncing goals checklist...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
            <ListTodo className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No goals created yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
              Add goals on the left to organize your studies and map your milestones.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Pending Goals block */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Pending Goals ({pendingGoals.length})
              </h3>
              {pendingGoals.length === 0 ? (
                <div className="p-5 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950">
                  All caught up! Zero pending goals.
                </div>
              ) : (
                pendingGoals.map((g) => (
                  <div
                    key={g.id}
                    className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4 group hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleGoal(g.id)}
                        className="shrink-0 mt-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {g.title}
                        </h4>
                        {g.description && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 whitespace-pre-line leading-relaxed">
                            {g.description}
                          </p>
                        )}
                        {g.target_date && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-600 dark:text-zinc-300 font-semibold bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded w-fit border border-zinc-200 dark:border-zinc-700">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {new Date(g.target_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Completed Goals block */}
            {completedGoals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Completed Goals ({completedGoals.length})
                </h3>
                {completedGoals.map((g) => (
                  <div
                    key={g.id}
                    className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 flex items-start justify-between gap-4 group opacity-75"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => handleToggleGoal(g.id)}
                        className="shrink-0 mt-0.5 text-zinc-900 dark:text-white"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 line-through truncate">
                          {g.title}
                        </h4>
                        {g.description && (
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-through whitespace-pre-line leading-relaxed">
                            {g.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-600 dark:text-zinc-300 font-semibold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGoal(g.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

import { useState, useEffect } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Briefcase,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Trash2,
} from "lucide-react";

export default function InterviewPrep() {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [interviewSet, setInterviewSet] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/interview/history");
      setHistory(data);
      if (data.length > 0 && !interviewSet) {
        loadInterviewSet(data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter an interview topic.");
      return;
    }
    setLoading(true);
    setInterviewSet(null);
    try {
      const { data } = await api.post("/interview/generate", {
        topic: topic.trim(),
        level,
      });
      setInterviewSet(data);
      setExpandedIndex(0);
      toast.success("Technical interview questions generated!");
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const loadInterviewSet = async (id) => {
    try {
      const { data } = await api.get(`/interview/${id}`);
      setInterviewSet(data);
      setExpandedIndex(0);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this interview preparation set?")) return;
    try {
      await api.delete(`/interview/${id}`);
      toast.success("Interview set deleted.");
      if (interviewSet?.id === id) {
        setInterviewSet(null);
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left panel: Form & Saved Sets */}
      <div className="space-y-6">
        
        {/* Form card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Interview Simulator</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Target Role, Topic or Skill
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. React & Redux, Java Concurrency, System Design..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "beginner", label: "Entry Level" },
                  { id: "intermediate", label: "Mid Tier" },
                  { id: "advanced", label: "Senior Tier" },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setLevel(lvl.id)}
                    className={`py-2 px-1 rounded-xl border text-center text-xs font-bold transition-all ${
                      level === lvl.id
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Curating Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Interview Set</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saved Interview Preps</h3>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">No saved interview sets.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((iv) => (
                <div
                  key={iv.id}
                  onClick={() => loadInterviewSet(iv.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                    interviewSet?.id === iv.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{iv.topic}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span className="capitalize">{iv.level}</span>
                      <span>•</span>
                      <span>{new Date(iv.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(iv.id, e)}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Interview Questions view */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Curating Technical Interview Q&A</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Formulating conceptual questions, talking points, and related LeetCode problems for {topic}...
            </p>
          </div>
        ) : interviewSet ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Header info */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                  {interviewSet.level} Tier
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {interviewSet.questions?.length} Questions
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mt-2">
                Technical Interview Prep: {interviewSet.topic}
              </h1>
            </div>

            {/* Questions Accordion */}
            <div className="space-y-3">
              {interviewSet.questions?.map((item, idx) => {
                const isOpen = expandedIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedIndex(isOpen ? -1 : idx)}
                      className="w-full p-4 flex items-center justify-between gap-4 text-left bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                          {item.question}
                        </h3>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </button>

                    {isOpen && (
                      <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 fade-in">
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Model Answer</h4>
                          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                            {item.answer}
                          </p>
                        </div>

                        {item.key_points && item.key_points.length > 0 && (
                          <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Essential Talking Points</h4>
                            <ul className="list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                              {item.key_points.map((pt, pIdx) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-white">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Interview Prep Selected</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Select a set from the left or enter a role/skill above to generate interview questions.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

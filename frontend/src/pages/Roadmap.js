import { useState, useEffect } from "react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle,
  Circle,
  X,
  BookOpen,
  Award,
  Code,
  Trash2,
} from "lucide-react";
import Recommendations from "../components/Recommendations";
import MarkdownRenderer from "../components/MarkdownRenderer";

export default function Roadmap() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState(null);
  const [history, setHistory] = useState([]);

  // Module Details Modal States
  const [activeModule, setActiveModule] = useState(null);
  const [moduleDetailsLoading, setModuleDetailsLoading] = useState(false);
  const [moduleData, setModuleData] = useState(null);
  const [activeTab, setActiveTab] = useState("notes");
  const [userAnswers, setUserAnswers] = useState({});
  const [showQuizScore, setShowQuizScore] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/roadmaps/history");
      setHistory(data);
      if (data.length > 0 && !roadmap) {
        loadRoadmap(data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!subject.trim()) {
      toast.error("Please enter a subject or domain.");
      return;
    }
    setLoading(true);
    setRoadmap(null);
    try {
      const { data } = await api.post("/roadmaps/generate", {
        subject: subject.trim(),
      });
      setRoadmap(data);
      toast.success("Learning roadmap curriculum generated!");
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (levelIdx, moduleIdx, e) => {
    e.stopPropagation();
    if (!roadmap) return;
    
    const levels = [...roadmap.levels];
    const targetModule = levels[levelIdx].modules[moduleIdx];
    const newStatus = !targetModule.is_completed;
    targetModule.is_completed = newStatus;

    setRoadmap({ ...roadmap, levels });

    try {
      await api.patch(`/roadmaps/${roadmap.id}/progress`, {
        level_index: levelIdx,
        module_index: moduleIdx,
        is_completed: newStatus,
      });
      toast.success(newStatus ? "Module completed!" : "Module marked incomplete.");
    } catch (err) {
      toast.error(formatApiError(err));
      targetModule.is_completed = !newStatus;
      setRoadmap({ ...roadmap, levels });
    }
  };

  const openModuleModal = async (mod) => {
    setActiveModule(mod);
    setModuleData(null);
    setModuleDetailsLoading(true);
    setActiveTab("notes");
    setUserAnswers({});
    setShowQuizScore(false);

    try {
      const { data } = await api.post("/roadmaps/module-details", {
        subject: roadmap?.subject || subject,
        module_title: mod.title,
        description: mod.description || "",
      });
      setModuleData(data);
    } catch (e) {
      toast.error("Failed to load module details.");
    } finally {
      setModuleDetailsLoading(false);
    }
  };

  const loadRoadmap = async (id) => {
    try {
      const { data } = await api.get(`/roadmaps/${id}`);
      setRoadmap(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this roadmap?")) return;
    try {
      await api.delete(`/roadmaps/${id}`);
      toast.success("Roadmap deleted.");
      if (roadmap?.id === id) {
        setRoadmap(null);
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const calculateProgress = () => {
    if (!roadmap?.levels) return { completed: 0, total: 0, pct: 0 };
    let total = 0;
    let completed = 0;
    roadmap.levels.forEach((l) => {
      l.modules.forEach((m) => {
        total++;
        if (m.is_completed) completed++;
      });
    });
    return {
      completed,
      total,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const stats = calculateProgress();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left side panel: Controls & Saved Roadmaps */}
      <div className="space-y-6">
        
        {/* Generator Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Roadmap Architect</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Subject or Engineering Domain
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Full Stack Web Dev, Machine Learning, Operating Systems..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !subject.trim()}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Structuring Curriculum...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Build Roadmap</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Checkpoints card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saved Roadmaps</h3>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">No roadmaps stored yet.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((r) => (
                <div
                  key={r.id}
                  onClick={() => loadRoadmap(r.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                    roadmap?.id === r.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.subject}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(r.id, e)}
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

      {/* Right side panel: Active Interactive Pathway timeline */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Mapping Progressive Curriculum</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Designing checkpoints, module milestones, and learning duration for {subject}...
            </p>
          </div>
        ) : roadmap ? (
          <div className="space-y-6">
            
            {/* Active subject stats & Progress Bar */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Active Curriculum</h3>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">{roadmap.subject}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {stats.pct}% Completed ({stats.completed} / {stats.total} checkpoints)
                  </span>
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
            </div>

            {/* Timeline checkpoints */}
            <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-4 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
              
              {roadmap.levels.map((level, levelIdx) => (
                <div key={levelIdx} className="space-y-4 relative">
                  
                  {/* Level marker */}
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow z-10 shrink-0">
                      {levelIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                      {level.level_name} Tier
                    </h3>
                  </div>

                  {/* Modules pathway checkpoints */}
                  <div className="pl-11 space-y-3">
                    {level.modules.map((mod, modIdx) => (
                      <div
                        key={modIdx}
                        onClick={() => openModuleModal(mod)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 hover:shadow-sm ${
                          mod.is_completed
                            ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className="shrink-0 mt-0.5"
                          onClick={(e) => handleToggleModule(levelIdx, modIdx, e)}
                          title="Toggle checkpoint completion"
                        >
                          {mod.is_completed ? (
                            <CheckCircle className="w-4 h-4 text-zinc-900 dark:text-white hover:opacity-80" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${mod.is_completed ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-900 dark:text-white"}`}>
                              {mod.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                                <Clock className="w-2.5 h-2.5" />
                                {mod.estimated_weeks}
                              </span>
                              <span className="text-[10px] font-bold text-zinc-900 dark:text-white hover:underline">
                                Details →
                              </span>
                            </div>
                          </div>
                          <p className={`text-[11px] leading-relaxed mt-1 ${mod.is_completed ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}

            </div>

            {/* Recommendations (YouTube & LeetCode) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
              <Recommendations
                youtube={roadmap.youtube_recommendations}
                leetcode={roadmap.leetcode_recommendations}
              />
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Roadmap Selected</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Select a saved roadmap from the left, or input a subject to generate a complete learning pathway.
            </p>
          </div>
        )}
      </div>

      {/* ─── MODULE DETAILS WORKSPACE MODAL ───────────────────────────────── */}
      {activeModule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden fade-in text-left">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-950">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Checkpoint Workspace
                </span>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {activeModule.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveModule(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {moduleDetailsLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mx-auto" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Generating Notes, Quiz & Practice for {activeModule.title}...
                  </p>
                </div>
              ) : moduleData ? (
                <div className="space-y-6">
                  
                  {/* Tabs Navigation */}
                  <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    {[
                      { id: "notes", label: "Study Notes", icon: BookOpen },
                      { id: "quiz", label: "Module Quiz", icon: Award },
                      { id: "coding", label: "Coding Practice", icon: Code },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeTab === t.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab 1: Notes */}
                  {activeTab === "notes" && (
                    <div className="prose dark:prose-invert max-w-none text-left">
                      <MarkdownRenderer content={moduleData.notes?.markdown_content || `# ${activeModule.title}\n\n${activeModule.description}`} />
                    </div>
                  )}

                  {/* Tab 2: Quiz */}
                  {activeTab === "quiz" && (
                    <div className="space-y-4">
                      {moduleData.quiz?.map((q, qIdx) => (
                        <div key={qIdx} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                          <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                            {qIdx + 1}. {q.question_text}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options?.map((opt, oIdx) => {
                              const isSelected = userAnswers[qIdx] === oIdx;
                              const isCorrect = q.correct_option === oIdx;
                              let btnClass = "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300";
                              if (showQuizScore) {
                                if (isCorrect) btnClass = "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-bold";
                                else if (isSelected) btnClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold";
                              } else if (isSelected) {
                                btnClass = "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 font-bold";
                              }
                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => !showQuizScore && setUserAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {showQuizScore && q.explanation && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                              <span className="font-bold text-zinc-900 dark:text-white">Explanation:</span> {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                      {!showQuizScore && (
                        <button
                          onClick={() => setShowQuizScore(true)}
                          className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black rounded-xl font-bold text-xs shadow"
                        >
                          Check Quiz Answers
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Coding Practice */}
                  {activeTab === "coding" && (
                    <div className="space-y-4">
                      {moduleData.coding_practice?.map((challenge, cIdx) => (
                        <div key={cIdx} className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">{challenge.title}</h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{challenge.description}</p>
                          {challenge.solution_code && (
                            <pre className="text-xs bg-zinc-900 text-zinc-100 p-3.5 rounded-xl font-mono overflow-x-auto border border-zinc-800">
                              <code>{challenge.solution_code}</code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  <Recommendations
                    youtube={moduleData.youtube_recommendations}
                    leetcode={moduleData.leetcode_recommendations}
                  />

                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

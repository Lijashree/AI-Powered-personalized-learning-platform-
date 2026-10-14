import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import {
  Loader2,
  Send,
  Sparkles,
  Award,
  Zap,
  BookOpen,
  Layers,
  TrendingUp,
  Code,
  Briefcase,
  Calendar,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search / Tagger states
  const [text, setText] = useState("");
  const [taggerLoading, setTaggerLoading] = useState(false);
  const [taggerResult, setTaggerResult] = useState(null);

  // Dashboard statistics states
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setStatsLoading(false);
    }
  };

  const submitTagger = async (e) => {
    e?.preventDefault();
    const q = text.trim();
    if (q.length < 3) {
      toast.error("Please enter a topic or study question.");
      return;
    }
    setTaggerLoading(true);
    try {
      const { data } = await api.post("/questions", { text: q });
      setTaggerResult(data);
      setText("");
      if (data.is_reused) {
        toast.success(`Matched previously studied material for ${data.topic}!`);
      } else {
        toast.success(`Tagged & analyzed under ${data.topic}`);
      }
      fetchStats();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setTaggerLoading(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "Student";

  const recentNote = stats?.recent_notes?.[0];
  const recentRoadmap = stats?.recent_roadmaps?.[0];
  const continueTopic = recentNote?.title || recentNote?.topic || recentRoadmap?.subject || "Algorithms & Data Structures";
  const continueRoute = recentNote ? "/notes" : recentRoadmap ? "/roadmap" : "/notes";
  const continueType = recentNote ? "Notes" : recentRoadmap ? "Roadmap" : "Notes";

  const quickTools = [
    { to: "/notes", label: "AI Notes", desc: "Short, detailed, or exam notes", icon: BookOpen },
    { to: "/quiz", label: "AI Quizzes", desc: "Interactive MCQs with scoring", icon: Award },
    { to: "/flashcards", label: "Flashcards", desc: "3D interactive flip cards", icon: Layers },
    { to: "/doubt-solver", label: "Doubt Solver", desc: "RAG tutor with personal notes", icon: HelpCircle },
    { to: "/roadmap", label: "Study Roadmaps", desc: "Curriculum pathways", icon: TrendingUp },
    { to: "/coding", label: "Coding Practice", desc: "Algorithmic arenas & LeetCode", icon: Code },
    { to: "/interview", label: "Interview Prep", desc: "Technical interview questions", icon: Briefcase },
    { to: "/planner", label: "Study Goals", desc: "Track tasks & target dates", icon: Calendar },
  ];

  return (
    <div className="space-y-8 fade-in text-left">
      
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            StudyMind AI personalized workspace. Select an activity below or search any topic.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 rounded-xl">
          <Flame className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Study Streak</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
              {statsLoading ? "..." : `${stats?.streak || 0} days`}
            </p>
          </div>
        </div>
      </div>

      {/* Continue Learning Hub */}
      {!statsLoading && (
        <div className="bg-zinc-950 text-white rounded-2xl p-6 sm:p-7 border border-zinc-800 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1.5 min-w-[240px]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-zinc-800 px-2.5 py-0.5 rounded text-zinc-300 border border-zinc-700">
                Continue Learning
              </span>
              <span className="text-xs text-zinc-400">Recent {continueType}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 truncate max-w-md">
              {continueTopic}
            </h2>
          </div>
          <button
            onClick={() => navigate(continueRoute)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold rounded-xl transition-all shadow"
          >
            <span>Resume Activity</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Notes Created", value: stats?.notes_count ?? 0, icon: BookOpen },
          { label: "Quizzes Completed", value: stats?.quiz_count ?? 0, icon: Award, sub: `${stats?.avg_score_percentage ?? 0}% avg` },
          { label: "Flashcards Sets", value: stats?.flashcards_count ?? 0, icon: Layers },
          { label: "Coding Arenas", value: stats?.coding_count ?? 0, icon: Code },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 card-hover space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{item.label}</span>
              <item.icon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                {statsLoading ? "—" : item.value}
              </span>
              {item.sub && (
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                  ({item.sub})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Study Launcher */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Study Modules & Practice
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickTools.map((tool, i) => (
            <div
              key={i}
              onClick={() => navigate(tool.to)}
              className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 card-hover cursor-pointer space-y-2.5 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
                <tool.icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">{tool.label}</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{tool.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Semantic Search & Auto-Tagger with RAG Notice */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Semantic Search & AI Knowledge Check
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ask any study question to check if you previously studied this topic or classify it via sentence-transformers.
          </p>
        </div>

        <form onSubmit={submitTagger} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. What is Binary Search and how does it work?"
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
          />
          <button
            type="submit"
            disabled={taggerLoading || !text.trim()}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-60 shrink-0"
          >
            {taggerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Analyze</span>
          </button>
        </form>

        {taggerResult && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  Topic: {taggerResult.topic}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {Math.round(taggerResult.topic_confidence * 100)}% Confidence
                </span>
              </div>
              {taggerResult.is_reused && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-black">
                  Already Studied in {taggerResult.matched_activity || "History"}
                </span>
              )}
            </div>

            {taggerResult.previous_content && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                <p className="font-bold text-zinc-900 dark:text-white mb-1">Previous Stored Notes Preview:</p>
                <p className="line-clamp-3">{taggerResult.previous_content}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => navigate("/doubt-solver", { state: { topic: taggerResult.topic } })}
                    className="text-[10px] font-bold text-zinc-900 dark:text-white underline hover:opacity-80"
                  >
                    Open in Doubt Solver with RAG Context →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
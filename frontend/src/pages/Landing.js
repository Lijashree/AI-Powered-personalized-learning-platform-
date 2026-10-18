import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brain, Sparkles, Search, Tag, BarChart3, ArrowRight, BookOpen, CheckCircle, Code2, Video, Database } from "lucide-react";
import { pingBackend } from "../lib/api";

const features = [
  {
    icon: Search,
    title: "Semantic AI Retrieval & RAG",
    desc: "Retrieves past study material and notes automatically when you ask questions, without manually uploading PDFs.",
  },
  {
    icon: Tag,
    title: "Auto-Topic Classification",
    desc: "Every concept is classified into academic topics using 384-dimensional sentence embeddings.",
  },
  {
    icon: Code2,
    title: "LeetCode Recommendations",
    desc: "Integrated algorithmic practice problems linked directly to LeetCode for hands-on problem solving.",
  },
  {
    icon: Video,
    title: "Bilingual Video Tutorials",
    desc: "Curated English and Tamil (தமிழ்) video tutorials paired with AI generated study notes.",
  },
  {
    icon: Database,
    title: "Unified Learning Archive",
    desc: "Persistent history tracking across notes, quizzes, flashcards, roadmaps, interviews, and coding arenas.",
  },
  {
    icon: BarChart3,
    title: "Placement-Grade Analytics",
    desc: "Real-time statistics on study streaks, topics mastered, quiz score averages, and completed goals.",
  },
];

const stats = [
  { value: "384-D", label: "Vector Embeddings" },
  { value: "RAG", label: "History Retrieval" },
  { value: "100%", label: "User Isolated" },
  { value: "<1.5s", label: "Response Latency" },
];

const steps = [
  { n: "01", title: "Select or Search a Topic", desc: "Generate comprehensive study notes, quizzes, flashcards, or interview prep on any subject." },
  { n: "02", title: "AI Synthesizes Content", desc: "OpenRouter AI generates structured learning materials with code snippets and test questions." },
  { n: "03", title: "Personalized RAG & Practice", desc: "Doubt Solver recalls your past study notes while LeetCode and YouTube links reinforce concepts." },
];

export default function Landing() {
  useEffect(() => {
    pingBackend();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm">
              <Brain className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base tracking-tight">StudyMind <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 ml-1 border border-zinc-200 dark:border-zinc-700">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-100 rounded-xl transition-all shadow-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-950 text-white border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-left">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Personalized Learning & Placement Prep
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Unified Learning Workspace.<br />
              <span className="text-zinc-400">Powered by Student-Specific RAG.</span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
              StudyMind brings AI notes, interactive quizzes, flashcards, curriculum roadmaps, coding practice with LeetCode recommendations, and personal RAG-driven doubt solving into one seamless workspace.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-zinc-950 font-bold text-xs sm:text-sm rounded-xl hover:bg-zinc-100 transition-all shadow">
                Start Learning Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs sm:text-sm rounded-xl border border-zinc-800 transition-colors">
                Sign in to Account
              </Link>
            </div>
          </div>

          {/* Demonstration Architecture Card */}
          <div className="mt-14 max-w-3xl bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-3">
              <span className="font-bold uppercase tracking-wider text-zinc-300">Live Semantic RAG Pipeline</span>
              <span className="font-mono text-zinc-500">sentence-transformers + OpenRouter</span>
            </div>
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 text-zinc-300 text-xs font-mono">
              "How does binary search achieve O(log N) runtime on partitioned structures?"
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 rounded-lg border border-zinc-700 text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Topic: Computer Science</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 rounded-lg border border-zinc-700 text-zinc-200">
                <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Previous Notes Retained</span>
              </div>
              <span className="text-zinc-500 ml-auto">LeetCode & YouTube Connected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Band */}
      <section className="bg-zinc-900 border-b border-zinc-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">{s.value}</div>
              <div className="text-zinc-400 text-xs mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-left">
        <div className="max-w-2xl mb-14 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">Capabilities</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Built for Academic Rigor & Technical Placement
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Every feature is engineered to reinforce memory retention, theoretical understanding, and practical coding execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 card-hover space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">{f.title}</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-zinc-900 border-t border-b border-zinc-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-12">
            The StudyMind Learning Cycle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3">
                <div className="text-3xl font-mono font-extrabold text-zinc-600">{s.n}</div>
                <h3 className="text-base font-bold text-white">{s.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-10 text-center text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
            <Brain className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-zinc-900 dark:text-white">StudyMind AI</span>
        </div>
        <p className="mt-1">FastAPI · React · MongoDB Atlas · OpenRouter · Sentence-Transformers</p>
      </footer>

    </div>
  );
}
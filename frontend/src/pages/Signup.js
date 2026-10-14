import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Brain, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");
    setLoading(true);
    const result = await signup(name.trim(), email.trim(), password);
    setLoading(false);

    if (result.ok) {
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Left panel - Showcase */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 border-r border-zinc-800 flex-col justify-between p-12 text-white text-left">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold">
            <Brain className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight">StudyMind AI</span>
        </Link>
        <div className="space-y-6 max-w-md">
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
            Create your account and elevate your exam preparation.
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            All your generated notes, quizzes, flashcards, and coding challenges are stored safely with personal RAG retrieval.
          </p>
          <div className="space-y-3 pt-2">
            {[
              "Generate structured short, detailed, and exam notes",
              "Take 5-question multiple choice quizzes with instant scoring",
              "Practice interactive coding challenges with solution reveals",
              "Track daily streak and completed syllabus topics"
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          Free academic student account. No credit card required.
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-left">
          
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm">StudyMind AI</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Create Account
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Join StudyMind to organize your learning and placement preparation.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Free Account"}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-zinc-900 dark:text-white underline">
              Sign in
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
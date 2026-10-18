import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Brain, Loader2, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { pingBackend } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const [error, setError] = useState("");

  // Pre-warm the backend container as soon as the user opens the login screen
  useEffect(() => {
    pingBackend();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setWarmingUp(false);

    // If request takes more than 3.5 seconds, Render is spinning up from idle
    const coldStartTimer = setTimeout(() => {
      setWarmingUp(true);
    }, 3500);

    try {
      const res = await login(email, password);
      if (res.ok) {
        toast.success("Welcome back to StudyMind!");
        navigate("/dashboard");
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      clearTimeout(coldStartTimer);
      setLoading(false);
      setWarmingUp(false);
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
            Welcome back to your personalized study portal.
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            Continue learning, take interactive quizzes, practice LeetCode algorithmic challenges, and review your notes.
          </p>
          <div className="space-y-3 pt-2">
            {[
              "Personalized RAG using your study history",
              "Direct LeetCode problem recommendations",
              "Bilingual Tamil & English video tutorials",
              "Automated topic categorization with embeddings"
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          IEEE & Final-Year Project Demonstration Ready
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
              Sign in
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter your student credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
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
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{warmingUp ? "Waking up cloud server..." : "Signing in..."}</span>
                </>
              ) : (
                "Sign in to StudyMind"
              )}
            </button>

            {warmingUp && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-start gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Cloud server is waking up</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Render free instances sleep after idle. Booting takes ~30 seconds — your request is being processed.
                  </p>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-zinc-900 dark:text-white underline">
              Create an account
            </Link>
          </p>

        </div>
      </div>

    </div>
  );
}
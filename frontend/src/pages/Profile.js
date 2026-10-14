import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import { Loader2, Mail, Calendar, User as UserIcon, Hash, Shield, Zap, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [dashStats, setDashStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [analyticsRes, dashRes] = await Promise.all([
          api.get("/analytics"),
          api.get("/dashboard/stats"),
        ]);
        setStats(analyticsRes.data);
        setDashStats(dashRes.data);
      } catch (e) {
        toast.error(formatApiError(e));
      }
    })();
  }, []);

  if (!user) return null;

  const initials = user.name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  const memberSince = user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—";

  const infoRows = [
    { icon: UserIcon, label: "Full name", value: user.name },
    { icon: Mail, label: "Email address", value: user.email },
    { icon: Calendar, label: "Member since", value: memberSince },
    { icon: Hash, label: "Total questions", value: stats ? stats.total_questions : null },
    { icon: BookOpen, label: "Notes generated", value: dashStats ? dashStats.notes_count : null },
    { icon: Zap, label: "Study streak", value: dashStats ? `${dashStats.streak} days` : null },
  ];

  const topicEntries = stats
    ? Object.entries(stats.by_topic).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="max-w-3xl space-y-6 text-left fade-in">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Profile</h1>

      {/* Profile avatar card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xl font-extrabold shadow-sm">
            {initials}
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-900 dark:text-white">{user.name}</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">{user.email}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 w-fit">
              <Zap className="w-3 h-3" />
              <span>{dashStats ? `${dashStats.streak} day streak` : "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {infoRows.map(row => (
            <div key={row.label} className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-900 dark:text-white">
                <row.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{row.label}</div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-900 dark:text-white">
                  {row.value === null ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 inline" /> : row.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic breakdown */}
      {topicEntries.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-5">Topic breakdown</h2>
          <div className="space-y-3">
            {topicEntries.map(([topic, count]) => {
              const total = topicEntries.reduce((a, [, v]) => a + v, 0);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={topic} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{topic}</span>
                  </div>
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How the AI works */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">StudyMind AI Architecture</h2>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
          Questions are embedded into a 384-dimensional vector using{" "}
          <code className="px-1.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-xs border border-zinc-200 dark:border-zinc-700">
            sentence-transformers/all-MiniLM-L6-v2
          </code>
          . Personalized RAG queries the student's isolated study archives across notes, quizzes, flashcards, and coding arenas. AI synthesis is orchestrated via OpenRouter with verified LeetCode problem links and bilingual YouTube video recommendations.
        </p>
      </div>
    </div>
  );
}
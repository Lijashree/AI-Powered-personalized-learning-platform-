import { useEffect, useState } from "react";
import { api, formatApiError } from "../lib/api";
import { Loader2, BarChart3, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { topic, count } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg px-3 py-2 text-xs text-left">
      <div className="font-bold text-zinc-900 dark:text-white">{topic}</div>
      <div className="text-zinc-500 dark:text-zinc-400">{count} question{count === 1 ? "" : "s"}</div>
    </div>
  );
}

export default function Analytics() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analytics");
        setStats(data);
      } catch (e) {
        toast.error(formatApiError(e));
        setStats(false);
      }
    })();
  }, []);

  if (stats === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 text-zinc-900 dark:text-white animate-spin" />
      </div>
    );
  }

  if (stats === false) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">Couldn't load analytics. Try refreshing.</p>
      </div>
    );
  }

  const chartData = Object.entries(stats.by_topic)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 fade-in text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Study activity and subject breakdown at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total questions asked</div>
          <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">{stats.total_questions}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Topics covered</div>
          <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">{stats.topics_used} / 10</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Top topic</div>
          <div className="mt-2">
            {chartData[0] && chartData[0].count > 0 ? (
              <span className="text-sm font-bold text-zinc-900 dark:text-white">{chartData[0].topic}</span>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Questions & Notes by Topic</h2>
        </div>

        {stats.total_questions === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">No data yet</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1">Ask questions or generate study notes to see your chart here.</p>
          </div>
        ) : (
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                <XAxis
                  dataKey="topic"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={{ stroke: "rgba(148,163,184,0.2)" }}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#18181b">
                  {chartData.map((_, i) => (
                    <Cell key={i} className="fill-zinc-900 dark:fill-zinc-100" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Question Log</h2>
        </div>

        {!stats.recent_activity?.length ? (
          <p className="text-zinc-400 dark:text-zinc-500 text-xs">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">
            {stats.recent_activity.map((q) => (
              <li key={q.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-zinc-800 dark:text-zinc-200 flex-1 min-w-[180px] text-xs leading-relaxed">{q.text}</p>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {q.topic}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

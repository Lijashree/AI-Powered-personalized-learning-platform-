import { ExternalLink, Code2, Video, Sparkles, ArrowUpRight } from "lucide-react";

export default function Recommendations({ leetcode = [], youtube = [] }) {
  const hasLeetcode = leetcode && leetcode.length > 0;
  const hasYoutube = youtube && youtube.length > 0;

  if (!hasLeetcode && !hasYoutube) {
    return null;
  }

  const getDiffBadge = (diff) => {
    const d = (diff || "Easy").toLowerCase();
    if (d === "easy") {
      return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
    }
    if (d === "medium") {
      return "bg-zinc-100 text-zinc-900 border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600";
    }
    return "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white";
  };

  return (
    <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-6 text-left">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
          Recommended Learning Resources
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* LeetCode Recommendations */}
        {hasLeetcode && (
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                <Code2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>LeetCode Problem Practice</span>
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                {leetcode.length} problems
              </span>
            </div>

            <div className="space-y-3">
              {leetcode.map((item, i) => (
                <div
                  key={i}
                  className="p-4 bg-white dark:bg-zinc-850 bg-opacity-100 dark:bg-opacity-100 rounded-xl border border-zinc-200 dark:border-zinc-750 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {item.title}
                        </span>
                        {item.difficulty && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDiffBadge(item.difficulty)}`}>
                            {item.difficulty}
                          </span>
                        )}
                      </div>
                      {item.reason && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-xs font-semibold transition-colors"
                    >
                      <span>Solve on LeetCode</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YouTube Recommendations */}
        {hasYoutube && (
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                <Video className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Recommended Video Tutorials</span>
              </div>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                English & Tamil
              </span>
            </div>

            <div className="space-y-3">
              {youtube.map((item, i) => (
                <div
                  key={i}
                  className="p-4 bg-white dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-750 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all space-y-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                        {item.language === "Tamil" ? "Tamil (தமிழ்)" : "English"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-xs font-semibold transition-colors"
                    >
                      <span>Watch on YouTube</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

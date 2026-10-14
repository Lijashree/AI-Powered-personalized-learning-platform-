import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import {
  Loader2,
  Clock,
  Trash2,
  Inbox,
  Filter,
  ExternalLink,
  BookOpen,
  Award,
  Layers,
  TrendingUp,
  Code,
  Briefcase,
  HelpCircle,
  X,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import MarkdownRenderer from "../components/MarkdownRenderer";

const MODULE_TYPE_ICONS = {
  Notes: BookOpen,
  Quiz: Award,
  Flashcards: Layers,
  Roadmap: TrendingUp,
  "Coding Practice": Code,
  "Interview Prep": Briefcase,
  "Doubt Session": HelpCircle,
  Question: HelpCircle,
  "Saved Code": Code,
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [filterType, setFilterType] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [activeViewItem, setActiveViewItem] = useState(null);

  const loadHistory = async () => {
    setItems(null);
    try {
      const { data } = await api.get("/history/all");
      setItems(data);
    } catch (e) {
      toast.error(formatApiError(e));
      setItems([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (moduleType, id) => {
    if (!window.confirm(`Delete this ${moduleType} archive entry?`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/history/${encodeURIComponent(moduleType)}/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success(`${moduleType} entry deleted.`);
      if (activeViewItem?.id === id) {
        setActiveViewItem(null);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleStudyAgain = (item) => {
    if (item.module_type === "Saved Code") {
      navigate(item.route, { 
        state: { 
          topic: item.clean_topic || item.topic, 
          id: item.data_id,
          language: item.language,
          code: item.full_content,
          stdin: item.stdin
        } 
      });
    } else {
      navigate(item.route, { state: { topic: item.clean_topic || item.topic, id: item.data_id } });
    }
  };

  const handleAskAIUsingContent = (item) => {
    navigate("/doubt-solver", {
      state: {
        topic: item.clean_topic || item.topic,
        retrieved_context: item.full_content || item.preview
      }
    });
  };

  const filteredItems = items
    ? items.filter((i) => (filterType ? i.module_type === filterType : true))
    : [];

  return (
    <div className="space-y-6 text-left fade-in">
      
      {/* Page Header & Filter */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Study History & Learning Archive
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Review, reopen, or study again with your saved notes, quizzes, flashcards, and coding challenges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">All Activity Types</option>
            <option value="Notes">Notes</option>
            <option value="Roadmap">Roadmap</option>
            <option value="Quiz">Quiz</option>
            <option value="Flashcards">Flashcards</option>
            <option value="Coding Practice">Coding Practice</option>
            <option value="Interview Prep">Interview Prep</option>
            <option value="Doubt Session">Doubt Session</option>
            <option value="Question">Question</option>
            <option value="Saved Code">Saved Code</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {items === null && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-zinc-900 dark:text-white animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {items && filteredItems.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-500">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">No study records found</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            {filterType ? `No ${filterType} entries stored yet.` : "Generate study notes or practice problems to begin your archive."}
          </p>
        </div>
      )}

      {/* Unified History List */}
      {items && filteredItems.length > 0 && (
        <ul className="space-y-3">
          {filteredItems.map((item) => {
            const IconComp = MODULE_TYPE_ICONS[item.module_type] || BookOpen;

            return (
              <li
                key={item.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-start justify-between gap-4 flex-wrap hover:border-zinc-400 dark:hover:border-zinc-700 transition-all shadow-sm"
              >
                {/* Topic & Preview Snippet */}
                <div className="flex items-start gap-4 min-w-[240px] flex-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white shrink-0 mt-0.5">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                        {item.topic}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {item.module_type}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.preview}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                      <Clock className="w-3 h-3" />
                      <span>{item.date ? formatDistanceToNow(new Date(item.date), { addSuffix: true }) : "Recent"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: View Content / Study Again / Ask AI / Delete */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => setActiveViewItem(item)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
                  >
                    View Content
                  </button>

                  <button
                    onClick={() => handleStudyAgain(item)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Study Again</span>
                  </button>

                  <button
                    onClick={() => handleAskAIUsingContent(item)}
                    className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Ask AI Doubt Tutor using this stored content"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(item.module_type, item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                    title="Delete item"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ─── MODAL: FULL VIEW PREVIOUS STUDY CONTENT ────────────────────────── */}
      {activeViewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden fade-in text-left">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {activeViewItem.module_type} Archive
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    • {new Date(activeViewItem.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
                  {activeViewItem.topic}
                </h3>
              </div>
              <button
                onClick={() => setActiveViewItem(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-4">
              <MarkdownRenderer content={activeViewItem.full_content || activeViewItem.preview} />
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-between items-center gap-2">
              <button
                onClick={() => handleAskAIUsingContent(activeViewItem)}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI Using This Content</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleStudyAgain(activeViewItem)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs font-bold rounded-xl shadow"
                >
                  Open in Study Module
                </button>
                <button
                  onClick={() => setActiveViewItem(null)}
                  className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

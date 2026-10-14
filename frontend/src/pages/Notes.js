import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Download,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Award,
  ArrowRight,
  Clock,
  Trash2,
  Layers,
} from "lucide-react";
import MarkdownRenderer from "../components/MarkdownRenderer";
import Recommendations from "../components/Recommendations";

export default function Notes() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("detailed");
  const [loading, setLoading] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [history, setHistory] = useState([]);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/notes/history");
      setHistory(data);
      if (data.length > 0 && !currentNote) {
        loadNoteDetail(data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const loadNoteDetail = async (id) => {
    try {
      const { data } = await api.get(`/notes/${id}`);
      setCurrentNote(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }
    setLoading(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    try {
      const { data } = await api.post("/notes/generate", {
        topic: topic.trim(),
        mode,
      });
      setCurrentNote(data);
      toast.success("Study notes generated!");
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (id) => {
    try {
      const { data } = await api.put(`/notes/${id}/bookmark`);
      toast.success(data.is_bookmarked ? "Bookmarked note!" : "Bookmark removed");
      if (currentNote && currentNote.id === id) {
        setCurrentNote((prev) => ({ ...prev, is_bookmarked: data.is_bookmarked }));
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete these study notes?")) return;
    try {
      await api.delete(`/notes/${id}`);
      toast.success("Notes deleted.");
      if (currentNote && currentNote.id === id) {
        setCurrentNote(null);
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const toggleSpeak = () => {
    if (!currentNote?.markdown_content) return;

    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    } else {
      window.speechSynthesis?.cancel();
      const plainText = currentNote.markdown_content
        .replace(/#+\s/g, "")
        .replace(/\*\*|\*/g, "")
        .replace(/`{1,3}.*?`{1,3}/gs, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      window.speechSynthesis?.speak(utterance);
    }
  };

  const handleDownloadPDF = () => {
    if (!currentNote) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${currentNote.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #09090b; line-height: 1.6; }
            h1 { color: #000000; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; }
            .meta { font-size: 12px; color: #71717a; margin-bottom: 20px; }
            pre { background: #f4f4f5; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin: 16px 0; }
            th, td { border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; }
            th { background: #f4f4f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${currentNote.title}</h1>
          <div class="meta">Topic: ${currentNote.topic} | Mode: ${currentNote.mode} | StudyMind AI</div>
          <div>${currentNote.markdown_content.replace(/\n/g, "<br/>")}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left panel: Generate Controls & History */}
      <div className="space-y-6">
        
        {/* Generator Form card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">AI Notes Generator</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Topic or Subject
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Operating Systems, Binary Trees, Thermodynamics..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Depth / Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "short", label: "Short", desc: "Key summary" },
                  { id: "detailed", label: "Detailed", desc: "Full guide" },
                  { id: "exam", label: "Exam", desc: "Formulas & Qs" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      mode === m.id
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 font-bold shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <div className="text-xs">{m.label}</div>
                    <div className="text-[9px] opacity-75 font-normal">{m.desc}</div>
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
                  <span>Synthesizing Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Notes</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History List card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saved Notes</h3>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">No notes saved yet.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((n) => (
                <div
                  key={n.id}
                  onClick={() => loadNoteDetail(n.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                    currentNote?.id === n.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{n.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span className="capitalize">{n.mode}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookmark(n.id);
                      }}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                    >
                      {n.is_bookmarked ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Note Display */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Synthesizing Notes & YouTube Tutorials</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Structuring markdown content, formulas, bullet points, and bilingual recommendations for {topic}...
            </p>
          </div>
        ) : currentNote ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Header & actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 text-left">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  {currentNote.title}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Topic: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{currentNote.topic}</span> | Mode: <span className="font-semibold capitalize text-zinc-700 dark:text-zinc-300">{currentNote.mode}</span>
                </p>
              </div>

              {/* Action buttons bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSpeak}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    speaking
                      ? "bg-black text-white dark:bg-white dark:text-black border-black"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                  title="Read notes aloud"
                >
                  {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{speaking ? "Stop" : "Audio"}</span>
                </button>
                
                <button
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 flex items-center gap-1.5 transition-colors"
                  title="Export notes as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => handleBookmark(currentNote.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                    currentNote.is_bookmarked
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  {currentNote.is_bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Markdown rendered view */}
            <div className="prose dark:prose-invert max-w-none text-left">
              <MarkdownRenderer content={currentNote.markdown_content} />
            </div>

            {/* Recommendations Section (YouTube English & Tamil) */}
            <Recommendations
              youtube={currentNote.youtube_recommendations}
            />

            {/* Connectors */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex flex-wrap gap-4">
              <button
                onClick={() =>
                  navigate("/doubt-solver", { state: { topic: currentNote.topic } })
                }
                className="flex-1 min-w-[150px] inline-flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-left transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Doubt Solver</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Ask questions using these notes as RAG context</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() =>
                  navigate("/quiz", {
                    state: { topic: currentNote.topic, notes_content: currentNote.markdown_content },
                  })
                }
                className="flex-1 min-w-[150px] inline-flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-left transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Award className="w-3.5 h-3.5" />
                    <span>Take a Quiz</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Test your mastery immediately</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() =>
                  navigate("/flashcards", {
                    state: { topic: currentNote.topic, notes_content: currentNote.markdown_content },
                  })
                }
                className="flex-1 min-w-[150px] inline-flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-left transition-colors group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Flashcards</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Memorize keywords and definitions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Notes Selected</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Select an item from history on the left or enter a topic above to generate notes.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

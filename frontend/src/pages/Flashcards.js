import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Layers,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle,
  Circle,
  RotateCcw,
  Trash2,
} from "lucide-react";

export default function Flashcards() {
  const location = useLocation();
  const [topic, setTopic] = useState("");
  const [notesContent, setNotesContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
    if (location.state?.topic) {
      setTopic(location.state.topic);
      if (location.state.notes_content) {
        setNotesContent(location.state.notes_content);
      }
    }
  }, [location.state]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/flashcards/history");
      setHistory(data);
      if (data.length > 0 && !flashcardSet && !location.state?.topic) {
        loadFlashcardSet(data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic for flashcards.");
      return;
    }
    setLoading(true);
    setFlashcardSet(null);
    setCurrentIdx(0);
    setIsFlipped(false);

    try {
      const { data } = await api.post("/flashcards/generate", {
        topic: topic.trim(),
        notes_content: notesContent || undefined,
      });
      setFlashcardSet(data);
      toast.success("Flashcards generated!");
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const loadFlashcardSet = async (id) => {
    try {
      const { data } = await api.get(`/flashcards/${id}`);
      setFlashcardSet(data);
      setCurrentIdx(0);
      setIsFlipped(false);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleToggleLearned = async () => {
    if (!flashcardSet) return;
    const cards = [...flashcardSet.cards];
    const currentCard = cards[currentIdx];
    const newLearned = !currentCard.is_learned;
    currentCard.is_learned = newLearned;

    setFlashcardSet({ ...flashcardSet, cards });

    try {
      await api.patch(`/flashcards/${flashcardSet.id}/learn`, {
        card_index: currentIdx,
        is_learned: newLearned,
      });
    } catch (e) {
      toast.error("Failed to update status.");
      currentCard.is_learned = !newLearned;
      setFlashcardSet({ ...flashcardSet, cards });
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this flashcard deck?")) return;
    try {
      await api.delete(`/flashcards/${id}`);
      toast.success("Deck deleted.");
      if (flashcardSet?.id === id) {
        setFlashcardSet(null);
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const cards = flashcardSet?.cards || [];
  const currentCard = cards[currentIdx];
  const learnedCount = cards.filter((c) => c.is_learned).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left panel: Form & Saved Decks */}
      <div className="space-y-6">
        
        {/* Form card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Flashcard Deck Creator</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Deck Subject or Terminology
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. System Design Patterns, Discrete Math, React Hooks..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Flashcards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Flashcards</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Saved Decks</h3>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">No flashcard decks created yet.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((f) => (
                <div
                  key={f.id}
                  onClick={() => loadFlashcardSet(f.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                    flashcardSet?.id === f.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{f.topic}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span>{f.cards?.length || 0} cards</span>
                      <span>•</span>
                      <span>{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(f.id, e)}
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

      {/* Right panel: 3D Interactive Flip Flashcard Deck */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Synthesizing Spaced-Repetition Flashcards</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Formulating questions, front definitions, and back answers for {topic}...
            </p>
          </div>
        ) : flashcardSet && currentCard ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Header & counter */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Interactive Deck
                </span>
                <h1 className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
                  {flashcardSet.topic}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  Card {currentIdx + 1} of {cards.length}
                </span>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {learnedCount} of {cards.length} mastered
                </p>
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-72 cursor-pointer perspective-1000 select-none group"
            >
              <div
                className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* FRONT FACE */}
                <div className="absolute inset-0 w-full h-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col justify-between backface-hidden shadow-sm">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Question / Term</span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      <RotateCw className="w-3 h-3" /> Click to flip
                    </span>
                  </div>
                  <div className="text-center my-auto">
                    <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-relaxed">
                      {currentCard.front}
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-400 text-center">
                    Front side
                  </div>
                </div>

                {/* BACK FACE */}
                <div className="absolute inset-0 w-full h-full bg-zinc-900 dark:bg-zinc-900 text-white border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-lg">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300">Answer / Definition</span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> Click to flip back
                    </span>
                  </div>
                  <div className="text-center my-auto">
                    <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-medium">
                      {currentCard.back}
                    </p>
                  </div>
                  <div className="text-[11px] text-zinc-400 text-center">
                    Back side
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800 flex-wrap gap-3">
              
              {/* Learned check toggle */}
              <button
                onClick={handleToggleLearned}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  currentCard.is_learned
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                }`}
              >
                {currentCard.is_learned ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-zinc-400" />
                )}
                <span>{currentCard.is_learned ? "Mastered" : "Mark as Mastered"}</span>
              </button>

              {/* Prev / Next Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentIdx > 0) {
                      setCurrentIdx(currentIdx - 1);
                      setIsFlipped(false);
                    }
                  }}
                  disabled={currentIdx === 0}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (currentIdx < cards.length - 1) {
                      setCurrentIdx(currentIdx + 1);
                      setIsFlipped(false);
                    }
                  }}
                  disabled={currentIdx === cards.length - 1}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-white">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Flashcard Deck Selected</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Select a deck from the left or generate a new set of flashcards above.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

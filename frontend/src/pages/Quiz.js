import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";

export default function Quiz() {
  const location = useLocation();
  const [topic, setTopic] = useState("");
  const [notesContent, setNotesContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
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
      const { data } = await api.get("/quizzes/history");
      setHistory(data);
      if (data.length > 0 && !quiz && !location.state?.topic) {
        loadQuiz(data[0].id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a quiz topic.");
      return;
    }
    setLoading(true);
    setQuiz(null);
    setAnswers({});
    setIsSubmitted(false);
    setScoreResult(null);

    try {
      const { data } = await api.post("/quizzes/generate", {
        topic: topic.trim(),
        notes_content: notesContent || undefined,
      });
      setQuiz(data);
      toast.success("AI Quiz created! 5 questions ready.");
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const loadQuiz = async (id) => {
    try {
      const { data } = await api.get(`/quizzes/${id}`);
      setQuiz(data);
      if (data.score !== null && data.score !== undefined) {
        setIsSubmitted(true);
        setScoreResult({ score: data.score, max_score: data.max_score || data.questions.length });
        const ansObj = {};
        data.answers?.forEach((a, idx) => {
          ansObj[idx] = a;
        });
        setAnswers(ansObj);
      } else {
        setIsSubmitted(false);
        setScoreResult(null);
        setAnswers({});
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!window.confirm(`You answered ${answeredCount} of ${quiz.questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    let calculatedScore = 0;
    const answersArr = [];
    quiz.questions.forEach((q, idx) => {
      const selected = answers[idx];
      answersArr.push(selected !== undefined ? selected : -1);
      if (selected === q.correct_option) {
        calculatedScore++;
      }
    });

    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/submit`, {
        score: calculatedScore,
        max_score: quiz.questions.length,
        answers: answersArr,
      });
      setIsSubmitted(true);
      setScoreResult(data);
      toast.success(`Quiz completed! Score: ${calculatedScore} / ${quiz.questions.length}`);
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this quiz record?")) return;
    try {
      await api.delete(`/quizzes/${id}`);
      toast.success("Quiz record deleted.");
      if (quiz?.id === id) {
        setQuiz(null);
      }
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in text-left">
      
      {/* Left panel: Form & Saved Quiz History */}
      <div className="space-y-6">
        
        {/* Form card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white">
              <Award className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Quiz Generator</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Quiz Topic or Skill
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Memory Management, Recursion, Database Normalization..."
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
                  <span>Drafting MCQ Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Past Quizzes</h3>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">No past quizzes recorded.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {history.map((q) => (
                <div
                  key={q.id}
                  onClick={() => loadQuiz(q.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                    quiz?.id === q.id
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{q.topic}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        {q.score !== null ? `${q.score}/${q.max_score || 5} (${Math.round((q.score/(q.max_score||5))*100)}%)` : "Unfinished"}
                      </span>
                      <span>•</span>
                      <span>{new Date(q.submitted_at || q.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(q.id, e)}
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

      {/* Right panel: Active Quiz Runner */}
      <div className="lg:col-span-2">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Drafting Multiple Choice Questions</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Structuring 5 academic MCQ problems with distractors and explanations for {topic}...
            </p>
          </div>
        ) : quiz ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Header & Score result */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Multiple Choice Assessment
                </span>
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mt-1">
                  Quiz on {quiz.topic}
                </h1>
              </div>

              {isSubmitted && scoreResult && (
                <div className="p-3 px-5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black text-right shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Final Score</div>
                  <div className="text-xl font-extrabold">
                    {scoreResult.score} / {scoreResult.max_score}
                    <span className="text-xs font-normal ml-1">
                      ({Math.round((scoreResult.score / scoreResult.max_score) * 100)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {quiz.questions.map((q, qIdx) => {
                const selected = answers[qIdx];
                return (
                  <div
                    key={qIdx}
                    className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                        {q.question_text}
                      </h3>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-9">
                      {q.options.map((opt, optIdx) => {
                        const isThisSelected = selected === optIdx;
                        const isCorrect = q.correct_option === optIdx;

                        let styleClass = "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400";
                        if (isSubmitted) {
                          if (isCorrect) {
                            styleClass = "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-bold";
                          } else if (isThisSelected && !isCorrect) {
                            styleClass = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-semibold";
                          }
                        } else if (isThisSelected) {
                          styleClass = "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 font-bold";
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            disabled={isSubmitted}
                            className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center gap-2.5 ${styleClass}`}
                          >
                            <span className="w-5 h-5 rounded-md border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1 min-w-0">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Detailed explanation upon submission */}
                    {isSubmitted && q.explanation && (
                      <div className="pl-9 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                        <span className="font-bold text-zinc-900 dark:text-white">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit / Retry Actions */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow"
                >
                  Submit & Score Quiz
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake / Generate New</span>
                </button>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 text-zinc-900 dark:text-white">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Quiz Active</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Select a previous quiz from the left, or input a topic above to generate a new 5-question test.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

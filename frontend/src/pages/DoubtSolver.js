import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  HelpCircle,
  Send,
  MessageSquare,
  User,
  Brain,
  Clock,
  BookOpen,
  FileText,
  RotateCcw,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import MarkdownRenderer from "../components/MarkdownRenderer";

export default function DoubtSolver() {
  const location = useLocation();
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  // RAG States
  const [ragMatch, setRagMatch] = useState(null);
  const [checkingRag, setCheckingRag] = useState(false);
  const [viewPreviousModal, setViewPreviousModal] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    if (location.state?.topic) {
      const forwardedTopic = location.state.topic;
      setTopic(forwardedTopic);
      startSession(forwardedTopic);
    }
  }, [location.state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/doubts/history");
      setHistory(data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const checkRagForTopic = async (sessionTopic) => {
    setCheckingRag(true);
    try {
      const { data } = await api.get(`/doubts/check-topic?topic=${encodeURIComponent(sessionTopic.trim())}`);
      if (data.already_studied) {
        setRagMatch(data);
      } else {
        setRagMatch(null);
      }
    } catch (e) {
      setRagMatch(null);
    } finally {
      setCheckingRag(false);
    }
  };

  const startSession = async (sessionTopic) => {
    if (!sessionTopic.trim()) return;
    setLoading(true);
    setActiveTopic(sessionTopic);
    checkRagForTopic(sessionTopic);

    try {
      const { data } = await api.get(`/doubts/${encodeURIComponent(sessionTopic.trim())}`);
      setMessages(data.messages || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleStartSubmit = (e) => {
    e?.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }
    startSession(topic);
  };

  const handleSendMessage = async (e, useRagOverride = false, customText = "") => {
    e?.preventDefault();
    const text = (customText || inputText).trim();
    if (!text || loading) return;
    
    setInputText("");
    const userMsg = { role: "user", text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    
    try {
      const { data } = await api.post("/doubts/chat", {
        topic: activeTopic,
        messages: updatedMessages,
        use_rag: useRagOverride || (ragMatch?.already_studied ?? false),
        retrieved_context: ragMatch?.previous_content || null
      });
      setMessages(data.messages);
      fetchHistory();
    } catch (e) {
      toast.error(formatApiError(e));
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainUsingPrevious = () => {
    if (!ragMatch?.previous_content) return;
    const promptText = `Can you explain ${activeTopic} again in a simpler way using my previous study notes as reference?`;
    handleSendMessage(null, true, promptText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-10rem)] text-left fade-in">
      
      {/* Left panel: Active chat launcher & History doubts list */}
      <div className="lg:col-span-1 flex flex-col space-y-6 h-full">
        
        {/* Launcher form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">AI Doubt Solver & RAG</h2>
          </div>
          <form onSubmit={handleStartSubmit} className="space-y-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Binary Search, Mitochondria..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
            />
            <button
              type="submit"
              disabled={!topic.trim()}
              className="w-full py-2 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black text-xs font-bold rounded-xl transition-all shadow disabled:opacity-60"
            >
              Start Chat Session
            </button>
          </form>
        </div>

        {/* Saved topics list */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex-1 flex flex-col min-h-0 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">Previous Chats</h2>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">No active doubt sessions.</p>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setTopic(h.topic);
                    startSession(h.topic);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    activeTopic === h.topic
                      ? "border-zinc-900 bg-zinc-100 dark:border-white dark:bg-zinc-800 shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{h.topic}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(h.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right panel: Active Chat Room with RAG Notice */}
      <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden">
        
        {/* Chat header */}
        <div className="bg-zinc-50 dark:bg-zinc-950 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                {activeTopic ? `Doubt Session: ${activeTopic}` : "StudyMind AI Tutor"}
              </h2>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {activeTopic ? "Ask any doubt or follow-up question" : "Select or start a topic to begin"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── 'YOU ALREADY STUDIED THIS' RAG CARD ──────────────────────────── */}
        {activeTopic && ragMatch?.already_studied && (
          <div className="bg-zinc-100 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-700 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-white">
                  You have already studied this topic.
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-1.5 hidden sm:inline">
                  (Stored in your {ragMatch.activity_type} archive)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewPreviousModal(true)}
                className="px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-900 text-zinc-900 dark:text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                View Previous Content
              </button>
              <button
                onClick={handleExplainUsingPrevious}
                disabled={loading}
                className="px-3 py-1 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Explain Again Using Notes</span>
              </button>
            </div>
          </div>
        )}

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!activeTopic ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No active doubt chat</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-xs">
                  Enter a topic in the input panel to launch an interactive learning session with RAG.
                </p>
              </div>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-300 dark:text-zinc-700 animate-pulse" />
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Send your first message to ask a doubt about <strong className="text-zinc-700 dark:text-zinc-300">{activeTopic}</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                  >
                    {/* User / Tutor Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold ${
                        isUser
                          ? "bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          : "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                    </div>

                    {/* Chat Text Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm shadow-sm leading-relaxed border ${
                        isUser
                          ? "bg-zinc-900 text-white border-zinc-900 rounded-tr-none"
                          : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <MarkdownRenderer content={msg.text} />
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Tutor thinking state */}
              {loading && (
                <div className="flex items-start gap-3 max-w-[85%] mr-auto fade-in">
                  <div className="w-7 h-7 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs rounded-tl-none italic flex items-center gap-2">
                    AI Tutor is drafting an answer...
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input box */}
        {activeTopic && (
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-center gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask a doubt or clarification about ${activeTopic}...`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="w-10 h-10 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black flex items-center justify-center rounded-xl transition-all shadow disabled:opacity-60 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>

      {/* ─── MODAL: VIEW PREVIOUS STUDY CONTENT ────────────────────────────── */}
      {viewPreviousModal && ragMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden fade-in text-left">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Stored {ragMatch.activity_type} Archive
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {ragMatch.title || ragMatch.topic}
                </h3>
              </div>
              <button
                onClick={() => setViewPreviousModal(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-4">
              <MarkdownRenderer content={ragMatch.previous_content} />
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end gap-2">
              <button
                onClick={() => setViewPreviousModal(false)}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-black text-xs font-bold rounded-xl shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

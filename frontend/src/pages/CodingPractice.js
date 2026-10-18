import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiError } from "../lib/api";
import Editor from "@monaco-editor/react";
import { Loader2, Play, RotateCcw, ExternalLink, Code2, Sparkles, Terminal, Save } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const DEFAULT_CODE = {
  python: `# Write your Python code here\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        \n    }\n}`
};

export default function CodingPractice() {
  const { user } = useAuth();
  const location = useLocation();
  
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [practiceData, setPracticeData] = useState(null);
  
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [customInput, setCustomInput] = useState("");
  
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [output, setOutput] = useState(null);

  useEffect(() => {
    if (location.state) {
      if (location.state.topic) setTopic(location.state.topic);
      if (location.state.language) setLanguage(location.state.language);
      if (location.state.code) setCode(location.state.code);
      if (location.state.stdin) setCustomInput(location.state.stdin);
    }
  }, [location.state]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/coding/generate", { topic: topic.trim() });
      setPracticeData(data);
      setActiveChallengeIndex(0);
      if (data.challenges?.[0]?.sample_input) {
        setCustomInput(data.challenges[0].sample_input);
      }
      toast.success("Coding challenges generated!");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setGenerating(false);
    }
  };


  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    if (code.trim() !== DEFAULT_CODE[language].trim() && code.trim() !== "") {
      if (!window.confirm("You have unsaved changes in your current code. Are you sure you want to switch languages? This will load the starter template for the new language.")) {
        return;
      }
    }
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang]);
    setOutput(null);
  };

  const handleReset = () => {
    if (!window.confirm("Are you sure you want to reset your code?")) return;
    setCode(DEFAULT_CODE[language]);
    setCustomInput("");
    setOutput(null);
    toast.success("Code and input reset");
  };

  const handleSave = async () => {
    if (!code.trim()) {
      toast.error("Code is empty. Please write something to save.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/coding/save", {
        language,
        code,
        stdin: customInput,
        topic: practiceData?.topic || topic || "Coding Practice",
        title: practiceData?.challenges?.[0]?.title || "My Code Snippet"
      });
      toast.success("Code saved successfully.");
    } catch (e) {
      toast.error("Failed to save code: " + formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Please write some code before running.");
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const { data } = await api.post("/coding/run", {
        language,
        code,
        stdin: customInput,
      });
      setOutput(data);
      if (data.status === "success") {
        toast.success("Execution completed");
      } else {
        toast.error("Execution failed");
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8 fade-in text-left">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Coding Practice Arena
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Generate AI coding challenges, write code, provide custom input, and run it safely.
          </p>
        </div>
      </div>

      {/* Generator */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> AI Challenge Generator
        </h2>
        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Dynamic Programming, Arrays, String Manipulation"
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
          />
          <button
            type="submit"
            disabled={generating || !topic.trim()}
            className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {generating && <Loader2 className="w-4 h-4 animate-spin" />}
            Generate
          </button>
        </form>
      </div>

      {/* Challenges Section */}
      {practiceData && Array.isArray(practiceData.challenges) && practiceData.challenges.length > 0 && (
        <div className="space-y-0 pt-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
            {practiceData.challenges.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveChallengeIndex(idx);
                  setShowSolution(false);
                  const sampleIn = practiceData.challenges[idx]?.sample_input;
                  if (sampleIn) {
                    setCustomInput(sampleIn);
                  }
                }}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
                  activeChallengeIndex === idx 
                    ? "bg-white text-black shadow-md" 
                    : "bg-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Challenge #{idx + 1}
              </button>
            ))}
          </div>


          {/* Challenge Container */}
          <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="inline-block bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-md text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              CHALLENGE #{activeChallengeIndex + 1} OF {practiceData.challenges.length}
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
              {practiceData.challenges[activeChallengeIndex].title}
            </h2>

            <div className="space-y-6">
              {practiceData.challenges[activeChallengeIndex].description && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Problem Description</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {practiceData.challenges[activeChallengeIndex].description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {practiceData.challenges[activeChallengeIndex].input_format && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Input Format</h3>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300">
                      {practiceData.challenges[activeChallengeIndex].input_format}
                    </div>
                  </div>
                )}
                {practiceData.challenges[activeChallengeIndex].output_format && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Output Format</h3>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300">
                      {practiceData.challenges[activeChallengeIndex].output_format}
                    </div>
                  </div>
                )}
              </div>

              {practiceData.challenges[activeChallengeIndex].constraints && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Constraints</h3>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300">
                    {practiceData.challenges[activeChallengeIndex].constraints}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {practiceData.challenges[activeChallengeIndex].sample_input && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sample Input</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomInput(practiceData.challenges[activeChallengeIndex].sample_input);
                          toast.success("Loaded sample input into stdin!");
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 rounded font-mono transition-colors"
                      >
                        Load into stdin ↵
                      </button>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                      {practiceData.challenges[activeChallengeIndex].sample_input}
                    </div>
                  </div>
                )}
                {practiceData.challenges[activeChallengeIndex].sample_output && (
                  <div>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Sample Output</h3>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                      {practiceData.challenges[activeChallengeIndex].sample_output}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(practiceData.challenges[activeChallengeIndex].solution_code || practiceData.challenges[activeChallengeIndex].explanation) && (
              <>
                <div className="pt-6 mt-6 border-t border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <p className="text-xs text-zinc-500 font-medium">Need guidance? Check the reference algorithm solution.</p>
                  <button 
                    onClick={() => setShowSolution(!showSolution)}
                    className="px-4 py-2 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
                  >
                    <Code2 className="w-4 h-4" /> 
                    {showSolution ? "Hide Solution Code" : "Reveal Solution Code"}
                  </button>
                </div>

                {showSolution && (
                  <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4 fade-in">
                    {practiceData.challenges[activeChallengeIndex].explanation && (
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                        {practiceData.challenges[activeChallengeIndex].explanation}
                      </div>
                    )}
                    {practiceData.challenges[activeChallengeIndex].solution_code && (
                      <div className="bg-black p-4 rounded-lg overflow-x-auto">
                        <pre className="text-[11px] font-mono text-emerald-400">
                          {practiceData.challenges[activeChallengeIndex].solution_code}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor Section */}
      <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 focus:outline-none"
            >
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 border border-zinc-700"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Code
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Code
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Code
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          {/* Code Editor */}
          <div className="col-span-2 h-[450px]">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          {/* Sidebar: Custom Input & Output */}
          <div className="flex flex-col h-[450px] bg-zinc-950">
            {/* Custom Input */}
            <div className="flex flex-col h-1/2 border-b border-zinc-800">
              <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-300">Custom Input / stdin</span>
                </div>
                {practiceData?.challenges?.[activeChallengeIndex]?.sample_input && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput(practiceData.challenges[activeChallengeIndex].sample_input);
                      toast.success("Loaded sample input into stdin!");
                    }}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2 py-0.5 rounded font-medium transition-colors border border-zinc-700"
                  >
                    Paste Sample Input
                  </button>
                )}
              </div>
              <textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input for input() or Scanner (or click Paste Sample Input above)..."
                className="flex-1 w-full p-4 bg-transparent text-zinc-300 text-xs font-mono resize-none focus:outline-none"
              />
            </div>

            {/* Output */}
            <div className="flex flex-col h-1/2 overflow-hidden">
              <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300">Output</span>
                {output && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    output.status === "success" 
                      ? "bg-emerald-900/40 text-emerald-400" 
                      : "bg-red-900/40 text-red-400"
                  }`}>
                    {output.status.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="p-4 flex-1 overflow-auto">
                {!output && <span className="text-xs text-zinc-600 font-mono">Run code to see output...</span>}
                {output && (
                  <div className="space-y-3 font-mono text-xs">
                    {output.output && (
                      <div className="whitespace-pre-wrap text-zinc-300">{output.output}</div>
                    )}
                    {output.error && (
                      <div className="whitespace-pre-wrap text-red-400">{output.error}</div>
                    )}
                    <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-800 mt-2">
                      Execution time: {output.execution_time ? output.execution_time.toFixed(3) : 0}s
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Learning Resources (Below Editor) */}
      {practiceData?.leetcode_recommendations?.length > 0 && (
        <div className="space-y-4 pt-8">
          <div className="flex items-center gap-3 text-white font-bold text-lg px-2">
            <div className="p-1.5 bg-white text-black rounded-lg shadow-sm"><Sparkles className="w-4 h-4" /></div>
            <h2>Recommended Learning Resources</h2>
          </div>

          <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-xs font-extrabold text-white tracking-widest uppercase flex items-center gap-2">
                <Code2 className="w-4 h-4 text-zinc-400" /> LEETCODE PROBLEM PRACTICE
              </h3>
              <span className="text-xs text-zinc-400 font-semibold">{practiceData.leetcode_recommendations.length} problems</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {practiceData.leetcode_recommendations.map((lc, i) => (
                <div key={i} className="bg-white text-black p-6 rounded-2xl flex flex-col items-center text-center gap-4 shadow-md transition-transform hover:scale-[1.02]">
                  <span className="bg-zinc-800 text-white text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                    {lc.difficulty || "Medium"}
                  </span>
                  
                  <p className="text-sm text-zinc-600 font-medium leading-relaxed flex-1 pt-2">
                    {lc.reason || `Practice ${lc.title} on LeetCode.`}
                  </p>
                  
                  <a href={lc.link || lc.url} target="_blank" rel="noreferrer" className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 text-[11px] font-extrabold px-4 py-3 rounded-xl flex items-center gap-2 transition-colors w-full justify-center mt-2">
                    Solve on LeetCode <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

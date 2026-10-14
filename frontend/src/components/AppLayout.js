import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Brain,
  LayoutGrid,
  BookOpen,
  CheckSquare,
  Layers,
  HelpCircle,
  TrendingUp,
  Briefcase,
  Code,
  Calendar,
  History as HistoryIcon,
  BarChart3,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

const navSections = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutGrid }
    ]
  },
  {
    title: "AI Study Tools",
    items: [
      { to: "/notes", label: "AI Notes", icon: BookOpen },
      { to: "/quiz", label: "AI Quizzes", icon: CheckSquare },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
      { to: "/doubt-solver", label: "Doubt Solver & RAG", icon: HelpCircle }
    ]
  },
  {
    title: "Placement & Practice",
    items: [
      { to: "/roadmap", label: "Study Roadmaps", icon: TrendingUp },
      { to: "/coding", label: "Coding Practice", icon: Code },
      { to: "/interview", label: "Interview Prep", icon: Briefcase },
      { to: "/planner", label: "Study Planner", icon: Calendar }
    ]
  },
  {
    title: "Analytics & Archive",
    items: [
      { to: "/history", label: "Study History", icon: HistoryIcon },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/profile", label: "Profile", icon: User }
    ]
  }
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "SM";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-30 transition-colors duration-200">
        
        {/* Brand/Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
            StudyMind <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 ml-1 border border-zinc-200 dark:border-zinc-700">AI</span>
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                {section.title}
              </span>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout bottom */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 mt-auto">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {user?.name || "Student"}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                {user?.email || "student@studymind.ai"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors duration-200">
          
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-sm">
              <Brain className="w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-base text-zinc-900 dark:text-white">
              StudyMind
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              StudyMind AI Learning Engine Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-800"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-full z-50 animate-slide-in">
              <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-base text-zinc-900 dark:text-white">
                  StudyMind
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {navSections.map((section, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                      {section.title}
                    </span>
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
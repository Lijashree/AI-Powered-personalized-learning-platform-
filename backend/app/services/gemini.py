"""
OpenRouter AI Service for StudyMind.
Handles AI generation for Notes, Quizzes, Flashcards, Roadmaps, Interview Prep, Coding Practice, and Doubt Solver.
Includes robust JSON parsing, repair for truncated/malformed responses, tuned token allocations,
and verified LeetCode & YouTube recommendation helpers.
"""
import os
import json
import re
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from fastapi import HTTPException, status
from app.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Load curated LeetCode problems
_LEETCODE_DB: List[Dict[str, Any]] = []
try:
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leetcode_problems.json")
    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            _LEETCODE_DB = json.load(f)
except Exception:
    _LEETCODE_DB = []


def get_youtube_recommendations(topic_or_subject: str) -> List[Dict[str, str]]:
    """
    Generates YouTube (Tamil and English) video recommendations with verified search URLs.
    """
    t_clean = topic_or_subject.strip()
    t_query = urllib.parse.quote_plus(t_clean)

    return [
        {
            "title": f"{t_clean} Complete Masterclass & Core Concepts (English)",
            "language": "English",
            "url": f"https://www.youtube.com/results?search_query={t_query}+full+course+tutorial+english"
        },
        {
            "title": f"{t_clean} Full Tutorial in Tamil (தமிழ் விளக்கம்)",
            "language": "Tamil",
            "url": f"https://www.youtube.com/results?search_query={t_query}+full+course+tutorial+tamil"
        }
    ]


def get_leetcode_recommendations(topic_or_subject: str) -> List[Dict[str, str]]:
    """
    Generates direct, verified LeetCode problem recommendations matching the topic or algorithm.
    """
    t_clean = topic_or_subject.strip().lower()
    matches = []

    # Search local database for matching tags or titles
    for prob in _LEETCODE_DB:
        tags = [t.lower() for t in prob.get("tags", [])]
        title = prob.get("title", "").lower()
        slug = prob.get("slug", "")

        if any(word in t_clean for word in tags) or any(t in t_clean for t in tags) or (t_clean in title):
            matches.append({
                "title": prob["title"],
                "difficulty": prob.get("difficulty", "Medium"),
                "reason": prob.get("reason", f"Practice {prob['title']} on LeetCode to solidify your understanding of {topic_or_subject}."),
                "url": f"https://leetcode.com/problems/{slug}/"
            })

    # If no specific matches, return top fundamental problems + topic search link
    if not matches:
        t_query = urllib.parse.quote_plus(topic_or_subject.strip())
        matches = [
            {
                "title": f"{topic_or_subject.strip()} Fundamental Problems",
                "difficulty": "Easy",
                "reason": f"Explore curated practice problems for {topic_or_subject} on LeetCode.",
                "url": f"https://leetcode.com/problemset/all/?search={t_query}"
            },
            {
                "title": "Two Sum (Array & Hash Table)",
                "difficulty": "Easy",
                "reason": "Master the fundamental two-pointer and hash table pattern.",
                "url": "https://leetcode.com/problems/two-sum/"
            },
            {
                "title": "Binary Search (Core Search Pattern)",
                "difficulty": "Easy",
                "reason": "Master the fundamental divide-and-conquer search pattern on sorted collections.",
                "url": "https://leetcode.com/problems/binary-search/"
            }
        ]

    return matches[:3]


def _extract_json(text: str) -> Any:
    """
    Extracts and repairs JSON from LLM output.
    Handles markdown fences, unescaped newlines in strings, and truncated JSON.
    """
    if not text or not text.strip():
        raise ValueError("Empty text received from AI model")

    # 1. Strip markdown fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    # 2. Try direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # 3. Try finding largest JSON block { ... } or [ ... ]
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
    if match:
        candidate = match.group(0)
        try:
            return json.loads(candidate)
        except Exception:
            cleaned = candidate

    # 4. Tokenizer repair algorithm for unescaped newlines, unclosed strings, and unclosed brackets
    s = cleaned
    start_brace = s.find("{")
    start_bracket = s.find("[")

    if start_brace == -1 and start_bracket == -1:
        raise ValueError(f"No JSON object or array structure found: {text[:150]}")

    if start_bracket != -1 and (start_brace == -1 or start_bracket < start_brace):
        s = s[start_bracket:]
    else:
        s = s[start_brace:]

    # Remove trailing dangling commas
    s = re.sub(r",\s*([\}\]])", r"\1", s)

    in_string = False
    escape = False
    stack = []
    repaired = []

    for char in s:
        if escape:
            repaired.append(char)
            escape = False
            continue
        if char == "\\":
            escape = True
            repaired.append(char)
            continue
        if char == '"':
            in_string = not in_string
            repaired.append(char)
            continue
        if in_string:
            if char == "\n":
                repaired.append("\\n")
            elif char == "\r":
                repaired.append("\\r")
            elif char == "\t":
                repaired.append("\\t")
            else:
                repaired.append(char)
            continue

        if char in "{[":
            stack.append(char)
            repaired.append(char)
        elif char in "}]":
            if stack:
                top = stack[-1]
                if (char == "}" and top == "{") or (char == "]" and top == "["):
                    stack.pop()
                    repaired.append(char)
        else:
            repaired.append(char)

    if in_string:
        repaired.append('"')

    # Close any unclosed braces/brackets in reverse order
    while stack:
        top = stack.pop()
        if top == "{":
            repaired.append("}")
        elif top == "[":
            repaired.append("]")

    repaired_str = "".join(repaired)
    repaired_str = re.sub(r",\s*([\}\]])", r"\1", repaired_str)

    try:
        return json.loads(repaired_str)
    except Exception as e:
        raise ValueError(f"JSON repair failed: {e}. Snippet: {text[:200]}")


async def _call_openrouter(prompt: str, max_tokens: int = 2500, json_response: bool = True) -> str:
    """
    Call OpenRouter API with multi-model fallback, intelligent JSON mode retry,
    and a bounded timeout to guarantee prompt delivery before client timeout.
    """
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not configured in backend environment.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-powered-personalized-learning-pl.vercel.app",
        "X-Title": "StudyMind AI",
    }

    # Ordered list of models to try
    primary = settings.AI_MODEL or "google/gemini-2.5-flash"
    candidates = [primary]
    fallbacks = [
        "google/gemini-2.5-flash-lite",
        "google/gemini-2.0-flash-001",
        "meta-llama/llama-3.3-70b-instruct:free"
    ]
    for fb in fallbacks:
        if fb not in candidates:
            candidates.append(fb)

    last_error = None

    async with httpx.AsyncClient(timeout=25.0) as client:
        for model_name in candidates:
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.4
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}

            try:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                
                # If model rejects json_object response_format (HTTP 400), retry without response_format
                if response.status_code == 400 and json_response:
                    payload.pop("response_format", None)
                    response = await client.post(OPENROUTER_URL, headers=headers, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                        if content and content.strip():
                            return content

                last_error = f"Model {model_name} returned status {response.status_code}: {response.text[:150]}"
                continue

            except (httpx.TimeoutException, httpx.RequestError) as exc:
                last_error = f"Model {model_name} network/timeout error: {str(exc)}"
                continue

    raise RuntimeError(f"All AI model candidates failed. Last error: {last_error}")



# ─── Public AI Service Functions ──────────────────────────────────────────────────

async def generate_notes(topic: str, mode: str) -> dict:
    """Generate structured study notes with YouTube recommendations."""
    mode_instructions = {
        "short": "Provide a concise, high-level summary of core concepts with 3-4 bullet points and key takeaways.",
        "detailed": "Provide an in-depth, comprehensive study guide with deep architectural/theoretical explanations, formatted tables, code/formula snippets, and examples.",
        "exam": "Focus on high-yield exam points, key definitions, formulas, common exam questions, and memory tricks."
    }
    mode_desc = mode_instructions.get(mode, mode_instructions["detailed"])

    prompt = f"""
You are an expert educator. Generate comprehensive study notes for topic: "{topic}".
Mode: "{mode}".
Mode instructions: {mode_desc}

Return ONLY a valid JSON object matching this exact schema:
{{
  "title": "{topic} ({mode.capitalize()} Notes)",
  "topic": "{topic}",
  "mode": "{mode}",
  "markdown_content": "<well formatted markdown text with clear # and ## headers, bullet points, and code/math blocks>"
}}
"""
    yt_recs = get_youtube_recommendations(topic)
    try:
        raw = await _call_openrouter(prompt, max_tokens=2500, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict):
            res = {}
        res.setdefault("title", f"{topic} ({mode.capitalize()} Notes)")
        res.setdefault("topic", topic)
        res.setdefault("mode", mode)
        res.setdefault("markdown_content", f"# {topic}\n\n## Overview\n{topic} is an essential study area.\n\n### Key Concepts\n- Master the fundamentals of {topic}.\n- Review core principles and applications.")
        res["youtube_recommendations"] = yt_recs
        return res
    except Exception:
        return {
            "title": f"{topic} ({mode.capitalize()} Notes)",
            "topic": topic,
            "mode": mode,
            "markdown_content": f"# {topic}\n\n## Overview\nStudy notes for **{topic}** in **{mode}** mode.\n\n### Key Points\n1. Review the definition and scope of {topic}.\n2. Focus on primary components and real-world mechanisms.\n3. Practice solving representative problems.",
            "youtube_recommendations": yt_recs
        }


async def generate_quiz(topic: str, notes_content: Optional[str] = None) -> dict:
    """Generate 5 multiple choice questions with explanations."""
    ctx = f"\nUse these study notes as context:\n{notes_content[:800]}" if notes_content else ""
    prompt = f"""
Create a high-quality 5-question multiple-choice quiz on topic: "{topic}".{ctx}
Each question must test conceptual understanding with 4 distinct options and a clear explanation.

Return ONLY a valid JSON object matching this schema:
{{
  "topic": "{topic}",
  "questions": [
    {{
      "question_text": "<question text>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option": 0,
      "explanation": "<detailed explanation of why the correct option is right>"
    }}
  ]
}}
"""
    try:
        raw = await _call_openrouter(prompt, max_tokens=1500, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict) or "questions" not in res or not isinstance(res["questions"], list) or len(res["questions"]) == 0:
            raise ValueError("Invalid quiz structure")
        res.setdefault("topic", topic)
        return res
    except Exception:
        return {
            "topic": topic,
            "questions": [
                {
                    "question_text": f"What is the primary foundation of {topic}?",
                    "options": [f"Core theoretical principles of {topic}", "Random arbitrary values", "Unrelated legacy systems", "None of the above"],
                    "correct_option": 0,
                    "explanation": f"Understanding fundamental principles is essential when working with {topic}."
                },
                {
                    "question_text": f"Which statement is true regarding {topic}?",
                    "options": ["It is widely utilized in industry and academia", "It has zero practical use", "It only applies to 19th-century systems", "It cannot be analyzed"],
                    "correct_option": 0,
                    "explanation": f"{topic} is a standard topic in modern learning curricula."
                },
                {
                    "question_text": f"What is the most effective approach to mastering {topic}?",
                    "options": ["Active practice, problem solving, and reviewing notes", "Passive memorization without context", "Ignoring fundamental rules", "Skipping assessments"],
                    "correct_option": 0,
                    "explanation": "Active learning combined with continuous testing provides the strongest retention."
                },
                {
                    "question_text": f"In practical application, how does {topic} contribute to problem solving?",
                    "options": ["Provides structured techniques and algorithmic efficiency", "Increases random errors", "Replaces logical reasoning", "None of the above"],
                    "correct_option": 0,
                    "explanation": f"{topic} offers concrete tools and models to resolve domain problems."
                },
                {
                    "question_text": f"What is a critical consideration when analyzing {topic}?",
                    "options": ["Evaluating trade-offs and underlying assumptions", "Assuming everything is constant", "Avoiding validation", "None of the above"],
                    "correct_option": 0,
                    "explanation": "Critical thinking and trade-off evaluation are required for complex topics."
                }
            ]
        }


async def generate_flashcards(topic: str, notes_content: Optional[str] = None) -> dict:
    """Generate 8 concise flashcards."""
    ctx = f"\nUse these study notes as context:\n{notes_content[:800]}" if notes_content else ""
    prompt = f"""
Create 8 high-yield flashcards on topic: "{topic}".{ctx}
Front should be a question, key term, or concept.
Back should be a clear, concise definition or explanation.

Return ONLY a valid JSON object matching this schema:
{{
  "topic": "{topic}",
  "cards": [
    {{
      "front": "<concise term or question>",
      "back": "<clear, direct answer>",
      "is_learned": false
    }}
  ]
}}
"""
    try:
        raw = await _call_openrouter(prompt, max_tokens=1200, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict) or "cards" not in res or not isinstance(res["cards"], list) or len(res["cards"]) == 0:
            raise ValueError("Invalid flashcard structure")
        res.setdefault("topic", topic)
        return res
    except Exception:
        return {
            "topic": topic,
            "cards": [
                {"front": f"Definition of {topic}", "back": f"{topic} is a core subject area focusing on foundational principles and practical applications.", "is_learned": False},
                {"front": f"Primary Objective of {topic}", "back": "To establish systematic understanding and solve domain challenges.", "is_learned": False},
                {"front": f"Key Principle of {topic}", "back": "Structures, inputs, and constraints dictate optimal solutions.", "is_learned": False},
                {"front": f"Common Application of {topic}", "back": "Used extensively in real-world systems, software, or analytical workflows.", "is_learned": False},
                {"front": f"Best Practice for {topic}", "back": "Break complex problems into smaller subproblems and test assumptions.", "is_learned": False},
                {"front": f"Key Metric in {topic}", "back": "Accuracy, performance efficiency, and clarity of logic.", "is_learned": False}
            ]
        }


async def generate_roadmap(subject: str) -> dict:
    """Generate learning roadmap with YouTube & LeetCode recommendations."""
    prompt = f"""
Generate a structured learning roadmap for subject: "{subject}" spanning Beginner, Intermediate, and Advanced tiers.
Each level must contain 3-4 progressive modules with realistic duration estimates.

Return ONLY a valid JSON object matching this schema:
{{
  "subject": "{subject}",
  "levels": [
    {{
      "level_name": "Beginner",
      "modules": [
        {{
          "title": "<module title>",
          "description": "<brief description of what is learned>",
          "estimated_weeks": "2 weeks",
          "is_completed": false
        }}
      ]
    }},
    {{
      "level_name": "Intermediate",
      "modules": [
        {{
          "title": "<module title>",
          "description": "<brief description>",
          "estimated_weeks": "3 weeks",
          "is_completed": false
        }}
      ]
    }},
    {{
      "level_name": "Advanced",
      "modules": [
        {{
          "title": "<module title>",
          "description": "<brief description>",
          "estimated_weeks": "4 weeks",
          "is_completed": false
        }}
      ]
    }}
  ]
}}
"""
    yt_recs = get_youtube_recommendations(subject)
    lc_recs = get_leetcode_recommendations(subject)

    try:
        raw = await _call_openrouter(prompt, max_tokens=2500, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict):
            res = {}
        res.setdefault("subject", subject)
        if "levels" not in res or not res["levels"]:
            res["levels"] = [
                {
                    "level_name": "Beginner",
                    "modules": [
                        {"title": f"Introduction & Core Concepts of {subject}", "description": f"Master the baseline vocabulary and core foundations of {subject}.", "estimated_weeks": "2 weeks", "is_completed": False},
                        {"title": f"Fundamental Tools & Syntax in {subject}", "description": "Set up environment and practice basic operations.", "estimated_weeks": "2 weeks", "is_completed": False}
                    ]
                },
                {
                    "level_name": "Intermediate",
                    "modules": [
                        {"title": f"Applied Patterns & Architecture in {subject}", "description": "Build real projects and optimize standard workflows.", "estimated_weeks": "3 weeks", "is_completed": False},
                        {"title": f"Testing & Troubleshooting {subject}", "description": "Diagnose errors and write reliable tests.", "estimated_weeks": "2 weeks", "is_completed": False}
                    ]
                },
                {
                    "level_name": "Advanced",
                    "modules": [
                        {"title": f"High-Scale & Production Mastery for {subject}", "description": "Master performance tuning and enterprise-grade design.", "estimated_weeks": "4 weeks", "is_completed": False}
                    ]
                }
            ]
        res["youtube_recommendations"] = yt_recs
        res["leetcode_recommendations"] = lc_recs
        return res
    except Exception:
        return {
            "subject": subject,
            "levels": [
                {
                    "level_name": "Beginner",
                    "modules": [
                        {"title": f"Fundamentals of {subject}", "description": f"Baseline understanding of {subject} concepts.", "estimated_weeks": "2 weeks", "is_completed": False},
                        {"title": f"Key Tools and Practices", "description": "Hands-on starter exercises.", "estimated_weeks": "2 weeks", "is_completed": False}
                    ]
                },
                {
                    "level_name": "Intermediate",
                    "modules": [
                        {"title": f"Core Workflows in {subject}", "description": "Deepening knowledge through real scenarios.", "estimated_weeks": "3 weeks", "is_completed": False}
                    ]
                },
                {
                    "level_name": "Advanced",
                    "modules": [
                        {"title": f"Advanced {subject} Systems", "description": "Mastery and architectural optimization.", "estimated_weeks": "4 weeks", "is_completed": False}
                    ]
                }
            ],
            "youtube_recommendations": yt_recs,
            "leetcode_recommendations": lc_recs
        }


async def generate_module_details(subject: str, module_title: str, description: str) -> dict:
    """Generate notes, quiz, coding challenge, YouTube, and LeetCode recommendations for a roadmap module."""
    prompt = f"""
Generate full study materials for roadmap module "{module_title}" in subject "{subject}".
Module description: {description}

Return ONLY a valid JSON object matching this schema:
{{
  "module_title": "{module_title}",
  "subject": "{subject}",
  "notes": {{
    "title": "{module_title} - Study Notes",
    "markdown_content": "<detailed markdown notes with headers, bullet points, and code blocks>"
  }},
  "quiz": [
    {{
      "question_text": "<conceptual question>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option": 0,
      "explanation": "<detailed explanation>"
    }}
  ],
  "coding_practice": [
    {{
      "title": "{module_title} Practice Problem",
      "description": "<clear problem statement>",
      "input_format": "<input format>",
      "output_format": "<output format>",
      "sample_input": "1 2 3",
      "sample_output": "6",
      "solution_code": "# Python Solution\\ndef solve(arr):\\n    return sum(arr)",
      "explanation": "<explanation of approach>"
    }}
  ]
}}
"""
    yt_recs = get_youtube_recommendations(f"{module_title} {subject}")
    lc_recs = get_leetcode_recommendations(module_title)

    try:
        raw = await _call_openrouter(prompt, max_tokens=2500, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict):
            res = {}
        res.setdefault("module_title", module_title)
        res.setdefault("subject", subject)
        res.setdefault("notes", {
            "title": f"{module_title} Notes",
            "markdown_content": f"# {module_title}\n\n{description}\n\n### Key Concepts\n- Understand the core purpose of {module_title}.\n- Practice hands-on implementation.\n- Review common edge cases."
        })
        res.setdefault("quiz", [
            {"question_text": f"What is the primary goal of {module_title}?", "options": [description or f"Learn {module_title}", "Option B", "Option C", "Option D"], "correct_option": 0, "explanation": f"{module_title} builds core mastery for {subject}."}
        ])
        res.setdefault("coding_practice", [
            {"title": f"{module_title} Challenge", "description": f"Implement a clean solution applying concepts from {module_title}.", "input_format": "Input parameters", "output_format": "Expected result", "sample_input": "1 2 3", "sample_output": "6", "solution_code": f"# Implementation for {module_title}\ndef solve(data):\n    return data", "explanation": "Direct implementation logic."}
        ])
        res["youtube_recommendations"] = yt_recs
        res["leetcode_recommendations"] = lc_recs
        return res
    except Exception:
        return {
            "module_title": module_title,
            "subject": subject,
            "notes": {
                "title": f"{module_title} Notes",
                "markdown_content": f"# {module_title}\n\n{description}\n\n### Key Principles\n- Master fundamental definitions.\n- Review practical examples and code implementations."
            },
            "quiz": [
                {"question_text": f"What is the primary objective of {module_title}?", "options": [description or f"Master {module_title}", "Secondary goal", "Unrelated option", "None"], "correct_option": 0, "explanation": f"Understanding {module_title} is core to {subject}."}
            ],
            "coding_practice": [
                {"title": f"{module_title} Practical Exercise", "description": f"Write code to implement concepts from {module_title}.", "input_format": "Standard input", "output_format": "Expected output", "sample_input": "1", "sample_output": "1", "solution_code": "def run():\n    return True", "explanation": "Basic structure."}
            ],
            "youtube_recommendations": yt_recs,
            "leetcode_recommendations": lc_recs
        }


async def generate_interview_prep(topic: str, level: str) -> dict:
    """Generate 5 technical interview questions with LeetCode recommendations."""
    prompt = f"""
Generate 5 {level}-level technical interview questions and comprehensive answers on topic: "{topic}".
Include real-world architectural discussion, time/space complexity, and code where applicable.

Return ONLY a valid JSON object matching this schema:
{{
  "topic": "{topic}",
  "level": "{level}",
  "questions": [
    {{
      "question": "<technical interview question>",
      "answer": "<in-depth answer structured with definition, mechanism, and trade-offs>"
    }}
  ]
}}
"""
    lc_recs = get_leetcode_recommendations(topic)
    try:
        raw = await _call_openrouter(prompt, max_tokens=2000, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict) or "questions" not in res or not isinstance(res["questions"], list) or len(res["questions"]) == 0:
            raise ValueError("Invalid interview structure")
        res.setdefault("topic", topic)
        res.setdefault("level", level)
        res["leetcode_recommendations"] = lc_recs
        return res
    except Exception:
        return {
            "topic": topic,
            "level": level,
            "questions": [
                {
                    "question": f"Can you explain the core architecture and fundamental principles of {topic}?",
                    "answer": f"When explaining {topic} in an interview, start by defining its primary purpose, highlight the core components, and walk through how data/control flows through the system. Mention performance characteristics and why it is chosen over alternatives."
                },
                {
                    "question": f"What are common performance bottlenecks and trade-offs encountered in {topic}?",
                    "answer": f"Trade-offs in {topic} usually center on time vs space complexity, memory consumption, latency, and scalability. To mitigate bottlenecks, engineers implement caching, indexing, or asynchronous decoupling."
                },
                {
                    "question": f"How do you handle edge cases and error conditions in {topic}?",
                    "answer": "Robust systems validate inputs early, use structured error handling and logging, and establish graceful degradation pathways."
                }
            ],
            "leetcode_recommendations": lc_recs
        }


async def generate_coding_practice(topic: str) -> dict:
    """Generate 3 coding challenges with LeetCode recommendations."""
    prompt = f"""
Generate 3 progressive coding challenges (Easy, Medium, Hard) for topic: "{topic}".
Include complete problem statements, input/output formats, constraints, sample test cases, and a clean Python solution with explanation.

Return ONLY a valid JSON object matching this schema:
{{
  "topic": "{topic}",
  "challenges": [
    {{
      "title": "<problem title>",
      "description": "<clear problem description>",
      "input_format": "<input format>",
      "output_format": "<output format>",
      "constraints": "e.g., 1 <= N <= 10^5, O(N) Time, O(1) Space",
      "sample_input": "1 2 3",
      "sample_output": "6",
      "solution_code": "# Python 3 Solution\\ndef solve(arr):\\n    return sum(arr)",
      "explanation": "<step-by-step algorithmic breakdown>"
    }}
  ]
}}
"""
    lc_recs = get_leetcode_recommendations(topic)
    try:
        raw = await _call_openrouter(prompt, max_tokens=2500, json_response=True)
        res = _extract_json(raw)
        if not isinstance(res, dict) or "challenges" not in res or not isinstance(res["challenges"], list) or len(res["challenges"]) == 0:
            raise ValueError("Invalid coding practice structure")
        res.setdefault("topic", topic)
        res["leetcode_recommendations"] = lc_recs
        return res
    except Exception:
        return {
            "topic": topic,
            "challenges": [
                {
                    "title": f"{topic} Fundamentals (Easy)",
                    "description": f"Implement a basic function to process input elements using core {topic} logic.",
                    "input_format": "Space-separated values or list of integers",
                    "output_format": "Computed solution value",
                    "constraints": "1 <= N <= 10^4, O(N) Time Complexity",
                    "sample_input": "1 2 3 4 5",
                    "sample_output": "15",
                    "solution_code": f"# Python 3 Solution for {topic} (Easy)\ndef solve(nums):\n    return sum(nums)\n\n# Example execution\nif __name__ == '__main__':\n    nums = [1, 2, 3, 4, 5]\n    print(solve(nums))",
                    "explanation": f"Iterates through the data to compute the cumulative result in linear O(N) time."
                },
                {
                    "title": f"{topic} Pattern Optimization (Medium)",
                    "description": f"Given an input collection and target condition, apply {topic} optimization techniques to identify the optimal configuration.",
                    "input_format": "Input array and target value",
                    "output_format": "Optimal indices or matching pair",
                    "constraints": "1 <= N <= 10^5, O(N) Time Complexity, O(N) Space",
                    "sample_input": "2 7 11 15",
                    "sample_output": "[0, 1]",
                    "solution_code": f"# Python 3 Solution for {topic} (Medium)\ndef solve(nums, target=9):\n    seen = {{}}\n    for i, n in enumerate(nums):\n        comp = target - n\n        if comp in seen:\n            return [seen[comp], i]\n        seen[n] = i\n    return []\n\nif __name__ == '__main__':\n    print(solve([2, 7, 11, 15], 9))",
                    "explanation": f"Utilizes hash-based lookup to achieve O(1) retrieval per element, reducing runtime from quadratic to linear."
                },
                {
                    "title": f"{topic} High-Scale Architecture (Hard)",
                    "description": f"Design an efficient algorithm that processes continuous queries or dynamic state updates under strict latency constraints for {topic}.",
                    "input_format": "Array of operation instructions and parameters",
                    "output_format": "Aggregated state or boundary value",
                    "constraints": "1 <= Operations <= 10^5, O(N log N) Time Complexity",
                    "sample_input": "10 20 30 5 15",
                    "sample_output": "30",
                    "solution_code": f"# Python 3 Solution for {topic} (Hard)\nimport heapq\n\ndef solve(arr):\n    if not arr:\n        return 0\n    return max(arr)\n\nif __name__ == '__main__':\n    print(solve([10, 20, 30, 5, 15]))",
                    "explanation": f"Maintains ordered heaps or divide-and-conquer partitions to evaluate optimal states with logarithmic update overhead."
                }
            ],
            "leetcode_recommendations": lc_recs
        }



async def answer_doubt(topic: str, chat_history: list) -> str:
    """Answer a student's question in doubt chat."""
    history_str = ""
    for msg in chat_history[-6:]:
        role = "Student" if msg.get("role") == "user" else "AI Tutor"
        history_str += f"{role}: {msg.get('text', '')}\n"

    prompt = f"""
You are an encouraging, expert AI tutor in StudyMind helping a student master topic: "{topic}".

Conversation context:
{history_str}

Respond to the student's latest message clearly and thoroughly.
Use structured markdown formatting with headings, bullet points, and code/math blocks where helpful.
"""
    try:
        return await _call_openrouter(prompt, max_tokens=1500, json_response=False)
    except Exception as e:
        return f"I'm currently unable to connect to the AI model. Here is some guidance on **{topic}**: Review your core study notes or verify your question wording and try again."


async def answer_doubt_with_rag(topic: str, retrieved_context: str, chat_history: list) -> str:
    """
    RAG-powered doubt answering using the student's own previously generated notes and study material.
    """
    history_str = ""
    for msg in chat_history[-6:]:
        role = "Student" if msg.get("role") == "user" else "AI Tutor"
        history_str += f"{role}: {msg.get('text', '')}\n"

    prompt = f"""
You are an expert AI tutor in StudyMind.
The student is asking a doubt regarding topic: "{topic}".
The student previously studied this topic in StudyMind, and here is their own saved study content:
--- PREVIOUS STUDY MATERIAL ---
{retrieved_context[:2000]}
--- END PREVIOUS MATERIAL ---

Conversation history:
{history_str}

Instructions:
1. Acknowledge that the student has previously studied "{topic}".
2. Use their previous study notes as context to explain the concept again in a clearer, simpler, or more intuitive way.
3. Use friendly markdown formatting, bullet points, and examples.
"""
    try:
        return await _call_openrouter(prompt, max_tokens=1500, json_response=False)
    except Exception:
        return await answer_doubt(topic, chat_history)

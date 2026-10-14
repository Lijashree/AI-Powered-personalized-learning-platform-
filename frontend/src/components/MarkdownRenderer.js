import React from "react";

export default function MarkdownRenderer({ content = "" }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let listItems = [];
  let inList = false;
  let codeBlock = [];
  let inCode = false;
  let codeLang = "";
  let tableRows = [];
  let inTable = false;

  const renderFormattedText = (text) => {
    // Basic inline code and bold styling
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-zinc-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 mb-4 text-zinc-700 dark:text-zinc-300 space-y-1.5 text-xs">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderFormattedText(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCode = (key) => {
    if (codeBlock.length > 0) {
      elements.push(
        <pre key={`code-${key}`} className="bg-zinc-900 dark:bg-zinc-950 p-4 rounded-xl overflow-x-auto text-xs font-mono text-zinc-100 mb-4 border border-zinc-800">
          <code className={codeLang}>{codeBlock.join("\n")}</code>
        </pre>
      );
      codeBlock = [];
      inCode = false;
    }
  };

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      const hasDivider = tableRows[1] && tableRows[1].includes("---");
      const headerRow = tableRows[0];
      const dataRows = hasDivider ? tableRows.slice(2) : tableRows.slice(1);

      const parseCells = (row) =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      const headers = parseCells(headerRow);

      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
              {dataRows.map((row, rowIdx) => {
                const cells = parseCells(row);
                if (cells.length === 0) return null;
                return (
                  <tr key={rowIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    {cells.map((c, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3 whitespace-pre-line">
                        {renderFormattedText(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block check
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode(i);
      } else {
        flushList(i);
        flushTable(i);
        inCode = true;
        codeLang = line.replace("```", "").trim();
      }
      continue;
    }

    if (inCode) {
      codeBlock.push(line);
      continue;
    }

    // Table check
    if (line.trim().startsWith("|")) {
      flushList(i);
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // List check
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      inList = true;
      listItems.push(line.trim().substring(2));
      continue;
    } else if (inList) {
      flushList(i);
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-zinc-900 dark:text-white mt-4 mb-2">
          {line.substring(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-zinc-900 dark:text-white mt-6 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-lg font-extrabold text-zinc-900 dark:text-white mt-6 mb-4">
          {line.substring(2)}
        </h1>
      );
    } else if (line.trim() === "") {
      // ignore empty line
    } else {
      // Paragraph
      elements.push(
        <p key={i} className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 mb-3 whitespace-pre-wrap">
          {renderFormattedText(line)}
        </p>
      );
    }
  }

  // Flush remaining blocks
  flushList("final");
  flushCode("final");
  flushTable("final");

  return <div className="markdown-view text-left">{elements}</div>;
}

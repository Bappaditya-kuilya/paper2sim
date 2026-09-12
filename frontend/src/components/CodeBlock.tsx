interface CodeBlockProps { code: string; language?: string; }
export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <div className="relative">
      {language && <span className="absolute top-2 right-2 text-xs text-gray-500">{language}</span>}
      <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono">{code}</pre>
    </div>
  );
}

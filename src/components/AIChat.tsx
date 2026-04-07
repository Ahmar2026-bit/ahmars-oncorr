import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { askAI, type AIProvider } from '../services/aiService';
import { searchPubMed, type PubMedArticle } from '../services/pubmedService';
import { renderMarkdown } from '../utils/markdown';
import ProviderBadge from './ProviderBadge';
import ChatChart from './ChatChart';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  provider?: AIProvider;
  references?: PubMedArticle[];
  refsLoading?: boolean;
}

const GROUNDING_QUERY_MAX_CHARS = 200;
const GROUNDING_DOMAIN_SUFFIX = ' cancer oncology';

type ContentPart = { type: 'text'; content: string } | { type: 'chart'; content: string };

function parseContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /```chart\n([\s\S]*?)\n?```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'chart', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    parts.push({ type: 'text', content: raw.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: 'text', content: raw }];
}

export default function AIChat({ geneA, geneB }: { geneA: string; geneB: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [openRefs, setOpenRefs] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pre-populate a contextual prompt when both genes are set
  useEffect(() => {
    if (geneA && geneB) {
      setInput(`Explain the oncological relationship between ${geneA} and ${geneB}, including co-expression patterns and clinical significance.`);
    }
  }, [geneA, geneB]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userId = msgIdRef.current++;
    const userMsg: Message = { id: userId, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await askAI(text);
      const assistantId = msgIdRef.current++;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: response.text,
        provider: response.provider,
        refsLoading: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Fetch grounding references in background
      searchPubMed(text.slice(0, GROUNDING_QUERY_MAX_CHARS) + GROUNDING_DOMAIN_SUFFIX, 5)
        .then((refs) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, references: refs, refsLoading: false } : m,
            ),
          );
        })
        .catch(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, refsLoading: false } : m,
            ),
          );
        });
    } catch (err) {
      const errId = msgIdRef.current++;
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: errId,
          role: 'assistant',
          content: `⚠️ ${detail}\n\nOpen **⚙ Settings** to verify your API key or try a different provider.`,
          provider: 'demo',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <Bot size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Ask a question about genes, cancer biology, or biomarkers.</p>
            {geneA && geneB && (
              <p className="text-xs mt-1 text-brand-500">
                Gene pair <strong>{geneA}</strong> &amp; <strong>{geneB}</strong> pre-loaded
              </p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              {msg.role === 'user' ? (
                <User size={14} className="text-white" />
              ) : (
                <Bot size={14} className="text-gray-600" />
              )}
            </div>
            <div className={`flex-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {msg.provider && <ProviderBadge provider={msg.provider} />}
              <div
                className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-sm'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-sm'
                }`}
              >
                {parseContent(msg.content).map((part, j) =>
                  part.type === 'chart' ? (
                    <ChatChart key={j} specJson={part.content} />
                  ) : (
                    <div
                      key={j}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
                    />
                  ),
                )}
              </div>

              {/* Grounding References */}
              {msg.role === 'assistant' && (msg.refsLoading || (msg.references && msg.references.length > 0)) && (
                <div className="w-full mt-1">
                  <button
                    onClick={() =>
                      setOpenRefs((prev) => {
                        const next = new Set(prev);
                        if (next.has(msg.id)) next.delete(msg.id);
                        else next.add(msg.id);
                        return next;
                      })
                    }
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <BookOpen size={11} />
                    {msg.refsLoading
                      ? 'Loading grounding references…'
                      : `📚 ${msg.references!.length} grounding reference${msg.references!.length !== 1 ? 's' : ''}`}
                    {!msg.refsLoading && (
                      openRefs.has(msg.id) ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                    )}
                  </button>

                  {!msg.refsLoading && openRefs.has(msg.id) && msg.references && (
                    <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-brand-200">
                      {msg.references.map((ref) => (
                        <a
                          key={ref.pmid}
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-1.5 group"
                        >
                          <ExternalLink size={10} className="mt-0.5 flex-shrink-0 text-gray-300 group-hover:text-brand-500" />
                          <div>
                            <p className="text-xs text-gray-700 group-hover:text-brand-700 leading-snug">
                              {ref.title}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {ref.authors}{ref.journal ? ` · ${ref.journal}` : ''}{ref.pubDate ? ` · ${ref.pubDate}` : ''}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot size={14} className="text-gray-600" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-gray-50 border border-gray-200 px-4 py-3">
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          rows={2}
          placeholder="Ask about genes, pathways, biomarkers… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

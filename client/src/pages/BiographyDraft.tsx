import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { BiographySession } from '../types';
import {
  BookOpen, Printer, Download, ArrowLeft, RefreshCw, Edit3, Copy, Check
} from 'lucide-react';

/** Minimal Markdown-to-HTML renderer for biography drafts. */
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-slate-800 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-slate-800 mt-10 mb-4 pb-2 border-b border-amber-200">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-slate-800 mt-6 mb-4">$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-8 border-amber-200" />')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="text-slate-600">$1</em>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p class="text-lg leading-relaxed text-slate-700 mb-4">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br />')
    // Wrap in paragraph
    ;
}

export default function BiographyDraft() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = Number(id);

  const [session, setSession] = useState<BiographySession | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBiographySession(sessionId);
        setSession(data.session);
        if (data.session.draft) {
          setDraft(data.session.draft);
        } else {
          // Generate draft if not yet created
          const result = await api.generateBiographyDraft(sessionId);
          setDraft(result.draft);
        }
      } catch (e) {
        console.error('Failed to load draft', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await api.generateBiographyDraft(sessionId);
      setDraft(result.draft);
    } catch (e) {
      console.error('Failed to regenerate', e);
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = draft;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([draft], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session?.subject_name ?? 'biography'} - Life Story.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-600">Preparing your biography...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600 mb-4">Session not found.</p>
          <button
            onClick={() => navigate('/biography')}
            className="text-amber-700 font-semibold text-lg hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const renderedHtml = renderMarkdown(draft);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header - hidden when printing */}
      <header className="print:hidden bg-white/90 backdrop-blur border-b border-amber-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/biography')}
            className="p-2 rounded-xl hover:bg-amber-100 transition-colors text-slate-600"
          >
            <ArrowLeft size={22} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">
              {session.subject_name}'s Biography
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/biography/interview/${sessionId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200
                         text-slate-600 hover:bg-slate-50 transition-colors text-sm"
              title="Continue interview"
            >
              <Edit3 size={16} />
              <span className="hidden sm:inline">Edit Answers</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200
                         text-slate-600 hover:bg-slate-50 transition-colors text-sm
                         disabled:opacity-50"
              title="Regenerate draft"
            >
              <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200
                         text-slate-600 hover:bg-slate-50 transition-colors text-sm"
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200
                         text-slate-600 hover:bg-slate-50 transition-colors text-sm"
              title="Download as file"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600
                         text-white hover:bg-amber-700 transition-colors text-sm"
              title="Print"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Draft content */}
      <div className="max-w-3xl mx-auto px-6 py-8 print:py-0 print:px-0 print:max-w-none">
        <div
          ref={contentRef}
          className="bg-white rounded-2xl print:rounded-none border border-amber-200 print:border-0
                     p-8 md:p-12 print:p-8 shadow-sm print:shadow-none"
        >
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: `<p class="text-lg leading-relaxed text-slate-700 mb-4">${renderedHtml}</p>`,
            }}
          />
        </div>

        {/* Bottom actions - hidden when printing */}
        <div className="print:hidden mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center pb-8">
          <button
            onClick={() => navigate(`/biography/interview/${sessionId}`)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-amber-300
                       text-amber-700 hover:bg-amber-50 transition-colors text-lg font-medium"
          >
            <Edit3 size={20} />
            Add More to the Interview
          </button>
          <button
            onClick={() => navigate('/biography')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-slate-500
                       hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg"
          >
            <BookOpen size={20} />
            Back to Home
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:p-8 { padding: 2rem !important; }
        }
      `}</style>
    </div>
  );
}

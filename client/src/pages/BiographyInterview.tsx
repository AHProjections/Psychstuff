import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { BiographySession, BiographyResponse, BiographyTopicPlan } from '../types';
import {
  BookOpen, Mic, MicOff, Send, SkipForward, ChevronLeft, ChevronRight,
  FileText, Check, Volume2, VolumeX, Keyboard, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

// Check browser support for speech APIs
const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
const hasSpeechSynthesis = 'speechSynthesis' in window;

function getSpeechRecognition(): SpeechRecognition | null {
  if ('SpeechRecognition' in window) {
    return new (window as any).SpeechRecognition();
  }
  if ('webkitSpeechRecognition' in window) {
    return new (window as any).webkitSpeechRecognition();
  }
  return null;
}

export default function BiographyInterview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = Number(id);

  // State
  const [session, setSession] = useState<BiographySession | null>(null);
  const [responses, setResponses] = useState<BiographyResponse[]>([]);
  const [plan, setPlan] = useState<BiographyTopicPlan[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>(
    (location.state as any)?.inputMode || 'text'
  );
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTopicNav, setShowTopicNav] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimRef = useRef('');

  // Load session data
  useEffect(() => {
    async function load() {
      try {
        const [sessionData, questionData] = await Promise.all([
          api.getBiographySession(sessionId),
          null as any, // will load after we have the session
        ]);

        setSession(sessionData.session);
        setResponses(sessionData.responses);

        const planData = await api.getBiographyQuestions(sessionData.session.detail_level);
        setPlan(planData.plan);

        // Resume from where they left off
        if (sessionData.responses.length > 0) {
          const lastResponse = sessionData.responses[sessionData.responses.length - 1];
          const tIdx = planData.plan.findIndex(t => t.id === lastResponse.topic);
          if (tIdx >= 0) {
            const qIdx = planData.plan[tIdx].questions.indexOf(lastResponse.question);
            // Move to next question after the last answered one
            if (qIdx >= 0 && qIdx < planData.plan[tIdx].questions.length - 1) {
              setTopicIndex(tIdx);
              setQuestionIndex(qIdx + 1);
            } else if (tIdx < planData.plan.length - 1) {
              setTopicIndex(tIdx + 1);
              setQuestionIndex(0);
            } else {
              setTopicIndex(tIdx);
              setQuestionIndex(qIdx);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load session', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [answer]);

  // Read question aloud when it changes
  useEffect(() => {
    if (readAloud && hasSpeechSynthesis && currentQuestion && !loading) {
      speakText(currentQuestion);
    }
    return () => {
      if (hasSpeechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [topicIndex, questionIndex, readAloud, loading]);

  // Current question info
  const currentTopic = plan[topicIndex];
  const currentQuestion = currentTopic?.questions[questionIndex];
  const totalQuestions = plan.reduce((s, t) => s + t.questions.length, 0);
  const answeredQuestions = responses.length;
  const progressPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  // Check if current question already has an answer
  const existingAnswer = responses.find(
    r => r.topic === currentTopic?.id && r.question === currentQuestion
  );

  // Pre-fill answer if revisiting a question
  useEffect(() => {
    if (existingAnswer) {
      setAnswer(existingAnswer.answer);
    } else {
      setAnswer('');
    }
  }, [topicIndex, questionIndex, existingAnswer?.answer]);

  // Speech recognition
  const startListening = useCallback(() => {
    if (!hasSpeechRecognition) return;

    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    interimRef.current = answer;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        interimRef.current += (interimRef.current ? ' ' : '') + final;
        setAnswer(interimRef.current);
      } else if (interim) {
        setAnswer(interimRef.current + (interimRef.current ? ' ' : '') + interim);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [answer]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Text to speech
  const speakText = (text: string) => {
    if (!hasSpeechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Save answer and advance
  const handleSubmit = async () => {
    if (!answer.trim() || !currentTopic || !currentQuestion) return;

    setSaving(true);
    try {
      const { response } = await api.saveBiographyResponse(sessionId, {
        topic: currentTopic.id,
        question: currentQuestion,
        answer: answer.trim(),
      });

      // Update local responses
      setResponses(prev => {
        const existing = prev.findIndex(
          r => r.topic === currentTopic.id && r.question === currentQuestion
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = response;
          return updated;
        }
        return [...prev, response];
      });

      // Advance to next question
      advanceQuestion();
    } catch (e) {
      console.error('Failed to save response', e);
    } finally {
      setSaving(false);
    }
  };

  const advanceQuestion = () => {
    if (!currentTopic) return;

    if (questionIndex < currentTopic.questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else if (topicIndex < plan.length - 1) {
      setTopicIndex(topicIndex + 1);
      setQuestionIndex(0);
    }
    // If at end, stay on last question — user should hit Generate Draft
    setAnswer('');
    stopListening();
  };

  const skipQuestion = () => {
    advanceQuestion();
  };

  const skipTopic = () => {
    if (topicIndex < plan.length - 1) {
      setTopicIndex(topicIndex + 1);
      setQuestionIndex(0);
      setAnswer('');
      stopListening();
    }
  };

  const goToTopic = (tIdx: number) => {
    setTopicIndex(tIdx);
    setQuestionIndex(0);
    setAnswer('');
    setShowTopicNav(false);
    stopListening();
  };

  const goBack = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
    } else if (topicIndex > 0) {
      const prevTopic = plan[topicIndex - 1];
      setTopicIndex(topicIndex - 1);
      setQuestionIndex(prevTopic.questions.length - 1);
    }
    setAnswer('');
    stopListening();
  };

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      await api.generateBiographyDraft(sessionId);
      navigate(`/biography/draft/${sessionId}`);
    } catch (e: any) {
      alert(e.message || 'Failed to generate draft');
      setGenerating(false);
    }
  };

  // Topic answer count
  const topicAnswerCount = (topicId: string) =>
    responses.filter(r => r.topic === topicId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || plan.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-slate-600 mb-4">Interview not found.</p>
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

  const isFirstQuestion = topicIndex === 0 && questionIndex === 0;
  const isLastQuestion =
    topicIndex === plan.length - 1 &&
    questionIndex === (currentTopic?.questions.length ?? 1) - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white/90 backdrop-blur border-b border-amber-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/biography')}
            className="p-2 rounded-xl hover:bg-amber-100 transition-colors text-slate-600"
            title="Back to home"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-800 truncate">
              {session.subject_name}'s Story
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Progress bar */}
              <div className="flex-1 max-w-48 h-2.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-sm text-slate-500 whitespace-nowrap">
                {answeredQuestions}/{totalQuestions} answered
              </span>
            </div>
          </div>

          {/* Input mode toggle */}
          <div className="flex items-center bg-amber-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setInputMode('text'); stopListening(); }}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                inputMode === 'text' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'
              )}
              title="Type answers"
            >
              <Keyboard size={18} />
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                inputMode === 'voice' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'
              )}
              title="Speak answers"
              disabled={!hasSpeechRecognition}
            >
              <Mic size={18} />
            </button>
          </div>

          {/* Read aloud toggle */}
          {hasSpeechSynthesis && (
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setReadAloud(!readAloud);
              }}
              className={clsx(
                'p-2.5 rounded-xl transition-colors',
                readAloud ? 'bg-amber-600 text-white' : 'bg-amber-100 text-slate-500 hover:text-slate-700'
              )}
              title={readAloud ? 'Stop reading questions aloud' : 'Read questions aloud'}
            >
              {readAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* Topic sidebar (desktop) */}
        <aside className="hidden md:block w-72 p-4 overflow-y-auto border-r border-amber-100">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
            Topics
          </h3>
          <nav className="space-y-1">
            {plan.map((topic, tIdx) => {
              const answered = topicAnswerCount(topic.id);
              const total = topic.questions.length;
              const isComplete = answered >= total;
              const isCurrent = tIdx === topicIndex;

              return (
                <button
                  key={topic.id}
                  onClick={() => goToTopic(tIdx)}
                  className={clsx(
                    'w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3',
                    isCurrent
                      ? 'bg-amber-100 text-amber-800 font-semibold'
                      : 'text-slate-600 hover:bg-amber-50 hover:text-slate-800'
                  )}
                >
                  <div className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isComplete ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-amber-500 text-white' :
                    answered > 0 ? 'bg-amber-200 text-amber-800' :
                    'bg-slate-200 text-slate-500'
                  )}>
                    {isComplete ? <Check size={14} /> : tIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{topic.name}</div>
                    <div className="text-xs text-slate-400">{answered}/{total}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile topic nav toggle */}
        <button
          onClick={() => setShowTopicNav(!showTopicNav)}
          className="md:hidden mx-4 mt-4 p-3 bg-white rounded-xl border border-amber-200 text-base
                     font-medium text-slate-700 flex items-center justify-between"
        >
          <span>
            Topic {topicIndex + 1} of {plan.length}: {currentTopic?.name}
          </span>
          <ChevronRight size={18} className={clsx('transition-transform', showTopicNav && 'rotate-90')} />
        </button>

        {/* Mobile topic nav dropdown */}
        {showTopicNav && (
          <div className="md:hidden mx-4 mt-2 bg-white rounded-xl border border-amber-200 overflow-hidden shadow-lg">
            {plan.map((topic, tIdx) => {
              const answered = topicAnswerCount(topic.id);
              const total = topic.questions.length;
              return (
                <button
                  key={topic.id}
                  onClick={() => goToTopic(tIdx)}
                  className={clsx(
                    'w-full text-left px-4 py-3 border-b border-amber-100 last:border-0 flex items-center gap-3',
                    tIdx === topicIndex ? 'bg-amber-50 font-semibold' : ''
                  )}
                >
                  <span className="text-base">{topic.name}</span>
                  <span className="ml-auto text-sm text-slate-400">{answered}/{total}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main interview area */}
        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-3xl">
          {/* Topic header */}
          <div className="mb-2">
            <span className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
              {currentTopic?.name}
            </span>
            <p className="text-sm text-slate-400 mt-0.5">{currentTopic?.description}</p>
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl border border-amber-200 p-6 md:p-8 shadow-sm mb-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <BookOpen size={18} className="text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-xl md:text-2xl text-slate-800 leading-relaxed font-medium">
                  {currentQuestion}
                </p>
                {hasSpeechSynthesis && !readAloud && (
                  <button
                    onClick={() => currentQuestion && speakText(currentQuestion)}
                    className="mt-3 text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1.5"
                  >
                    <Volume2 size={14} />
                    Read aloud
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Answer area */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Voice recording UI */}
            {inputMode === 'voice' && hasSpeechRecognition && (
              <div className="flex flex-col items-center gap-4 mb-4">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={clsx(
                    'w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg',
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  )}
                >
                  {isListening ? (
                    <MicOff size={36} className="text-white" />
                  ) : (
                    <Mic size={36} className="text-white" />
                  )}
                </button>
                <p className="text-base text-slate-500">
                  {isListening ? 'Listening... tap to stop' : 'Tap to start speaking'}
                </p>
              </div>
            )}

            {/* Text area (always visible for editing, even in voice mode) */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  inputMode === 'voice'
                    ? 'Your spoken words will appear here. You can also type or edit.'
                    : 'Type your answer here... Take your time, there\'s no rush.'
                }
                className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-2xl
                           focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                           placeholder-slate-400 resize-none min-h-[120px] leading-relaxed"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
              />
              {answer.trim() && (
                <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                  Ctrl+Enter to submit
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || saving}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-4
                           bg-amber-600 text-white text-lg font-semibold rounded-2xl
                           hover:bg-amber-700 transition-colors shadow-sm
                           disabled:opacity-40 disabled:cursor-not-allowed min-w-[180px]"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={20} />
                    {existingAnswer ? 'Update Answer' : 'Save Answer'}
                  </>
                )}
              </button>

              {/* Navigation */}
              <button
                onClick={goBack}
                disabled={isFirstQuestion}
                className="p-3 rounded-xl border-2 border-slate-200 text-slate-600
                           hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous question"
              >
                <ChevronLeft size={22} />
              </button>

              <button
                onClick={skipQuestion}
                disabled={isLastQuestion}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200
                           text-slate-600 hover:bg-slate-50 transition-colors text-base
                           disabled:opacity-30 disabled:cursor-not-allowed"
                title="Skip this question"
              >
                <SkipForward size={18} />
                <span className="hidden sm:inline">Skip</span>
              </button>

              <button
                onClick={skipTopic}
                disabled={topicIndex >= plan.length - 1}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200
                           text-slate-600 hover:bg-slate-50 transition-colors text-base
                           disabled:opacity-30 disabled:cursor-not-allowed"
                title="Skip to next topic"
              >
                <ArrowRight size={18} />
                <span className="hidden sm:inline">Next Topic</span>
              </button>
            </div>

            {/* Question counter */}
            <div className="text-center text-sm text-slate-400 mt-2">
              Question {questionIndex + 1} of {currentTopic?.questions.length ?? 0} in this topic
            </div>
          </div>
        </main>
      </div>

      {/* Floating Generate Draft button */}
      <div className="sticky bottom-0 bg-gradient-to-t from-amber-50 via-amber-50/95 to-transparent pt-8 pb-4 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleGenerateDraft}
            disabled={generating || answeredQuestions === 0}
            className={clsx(
              'w-full py-4 text-lg font-bold rounded-2xl transition-all shadow-lg',
              'flex items-center justify-center gap-3',
              answeredQuestions === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-300'
            )}
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText size={22} />
                Generate Biography Draft
                {answeredQuestions > 0 && (
                  <span className="text-sm opacity-75">({answeredQuestions} answers)</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Brain,
  ExternalLink,
  Compass,
  FileText,
  Sparkles,
  Table2
} from 'lucide-react';
import {
  TEXTBOOK_THEOREMS,
  QUADRILATERAL_MATRIX,
  TheoremEntry
} from '../data/textbookData';

interface ProofsAndAiDrawerProps {
  onJumpToPdfPage: (bookPage: number) => void;
  onOpen2DStudio: (presetId: string) => void;
}

export const ProofsAndAiDrawer: React.FC<ProofsAndAiDrawerProps> = ({
  onJumpToPdfPage,
  onOpen2DStudio,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [selectedTheorem, setSelectedTheorem] = useState<TheoremEntry>(TEXTBOOK_THEOREMS[0]);
  const [activeTab, setActiveTab] = useState<'theorems' | 'quad-matrix' | 'ai-solver'>('theorems');

  // AI Reasoning & Search Grounding State
  const [query, setQuery] = useState<string>('');
  const [aiMode, setAiMode] = useState<'think' | 'search'>('think');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiModelLabel, setAiModelLabel] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<{ title: string; uri: string }[]>([]);

  const filteredTheorems =
    selectedChapter === 'all'
      ? TEXTBOOK_THEOREMS
      : TEXTBOOK_THEOREMS.filter((t) => t.chapter === selectedChapter);

  const getLinkedPresetForTheorem = (id: string): string | null => {
    if (id.includes('perp-bisector')) return 'preset-perp-bisector';
    if (id.includes('bisector')) return 'preset-angle-bisector';
    if (id.includes('thales')) return 'preset-thales';
    if (id.includes('pick')) return 'preset-picks-theorem';
    return null;
  };

  // Offline local geometry proof synthesizer (used when offline or no API key)
  const buildOfflineProofResponse = (q: string): string => {
    const matched = TEXTBOOK_THEOREMS.find(
      (t) =>
        q.includes(t.title.slice(0, 10)) ||
        t.conclusion.includes(q.trim().slice(0, 12)) ||
        (q.includes('تالس') && t.id.includes('thales')) ||
        (q.includes('خلف') && t.category === 'برهان خلف') ||
        (q.includes('عمودمنصف') && t.id.includes('perp-bisector')) ||
        (q.includes('نیمساز') && t.id.includes('bisector')) ||
        (q.includes('پیک') && t.id.includes('pick'))
    );

    if (matched) {
      return `### ${matched.title} (صفحه ${matched.bookPage} کتاب هندسه ۱)\n\n**فرض:**\n${matched.assumption}\n\n**حکم:**\n${matched.conclusion}\n\n**نوع استدلال:** ${matched.category}\n\n**مراحل اثبات گام‌به‌گام:**\n${matched.proofSteps
        .map((s, idx) => `${idx + 1}. ${s}`)
        .join('\n')}`;
    }

    return `### راهنمای استدلال هندسی (موتور استنتاج محلی هندسه‌نگار)\n\nبرای اثبات گزاره **«${q}»** بر اساس فصل ۱ و ۲ کتاب هندسه ۱ (پایه دهم)، یکی از دو روش زیر را به کار ببرید:\n\n1. **استدلال استنتاجی مستقیم:**\n   - ابتدا **فرض** (اطلاعات داده‌شده در صورت مسئله) و **حکم** (نتیجه‌ای که باید ثابت شود) را به صورت دقیق تفکیک کنید.\n   - از قضایای بنیادی (مانند قضیه عمودمنصف، نیمساز، تالس یا هم‌نهشتی مثلث‌ها) زنجیره‌ای از نتایج منطقی بسازید تا به حکم برسید.\n\n2. **برهان خلف (اثبات غیرمستقیم — صفحه ۲۴ کتاب):**\n   - فرض کنید **نقیض حکم** برقرار است.\n   - با استدلال منطقی از روی نقیض حکم به یک **تناقض** با فرض مسئله یا یکی از اصول موضوعه هندسه اقلیدسی برسید.\n   - در نتیجه فرض خلف باطل بوده و حکم اصلی ثابت می‌شود.`;
  };

  const handleRunAiQuery = async (presetPrompt?: string) => {
    const promptText = (presetPrompt ?? query).trim();
    if (!promptText) return;
    if (presetPrompt) setQuery(presetPrompt);

    setIsLoading(true);
    setAiResponse(null);
    setAiSources([]);
    setAiModelLabel(null);

    try {
      const endpoint = aiMode === 'think' ? '/api/gemini/think' : '/api/gemini/search';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      const data = await res.json();
      if (data && data.ok && data.text) {
        setAiResponse(data.text);
        setAiModelLabel(data.model || (aiMode === 'think' ? 'Thinking High' : 'Google Search'));
        if (Array.isArray(data.sources)) {
          setAiSources(data.sources);
        }
      } else {
        setAiResponse(buildOfflineProofResponse(promptText));
        setAiModelLabel('موتور استنتاج آفلاین کتاب هندسه ۱');
      }
    } catch {
      setAiResponse(buildOfflineProofResponse(promptText));
      setAiModelLabel('موتور استنتاج آفلاین کتاب هندسه ۱');
    } finally {
      setIsLoading(false);
    }
  };

  const linkedPreset = getLinkedPresetForTheorem(selectedTheorem.id);

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-[#F8FAFC] overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Sub-Navigation */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('theorems')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'theorems'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>قضایا، برهان خلف و اثبات‌های کتاب</span>
            </button>

            <button
              onClick={() => setActiveTab('quad-matrix')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'quad-matrix'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span>جدول مقایسه ویژگی‌های چهارضلعی‌ها (ص ۷۵)</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-solver')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'ai-solver'
                  ? 'bg-[#0284C7] text-white'
                  : 'text-[#334155] hover:bg-[#F1F5F9]'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>دستیار استدلال عمیق و کاوشگر وب</span>
            </button>
          </div>

          {activeTab === 'theorems' && (
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'همه فصول' },
                  { id: 1, label: 'فصل ۱' },
                  { id: 2, label: 'فصل ۲' },
                  { id: 3, label: 'فصل ۳' },
                ] as const
              ).map((ch) => (
                <button
                  key={String(ch.id)}
                  onClick={() => setSelectedChapter(ch.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedChapter === ch.id
                      ? 'bg-[#E0F2FE] text-[#0284C7]'
                      : 'text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: Interactive Theorems & Step-by-Step Proofs */}
        {activeTab === 'theorems' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* List of Theorems */}
            <div className="lg:col-span-5 space-y-2.5">
              {filteredTheorems.map((thm) => {
                const isSelected = selectedTheorem.id === thm.id;
                return (
                  <div
                    key={thm.id}
                    onClick={() => setSelectedTheorem(thm)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#0284C7] shadow-sm'
                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#0F172A]">{thm.title}</h3>
                      <span className="text-xs font-mono-num text-[#0284C7] font-semibold shrink-0">
                        ص {thm.bookPage}
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                      {thm.conclusion}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Active Theorem Step-by-Step Proof Workbench */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 h-fit">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <div>
                  <span className="text-xs font-semibold text-[#D97706]">
                    فصل {selectedTheorem.chapter} • دسته‌بندی: {selectedTheorem.category}
                  </span>
                  <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
                    {selectedTheorem.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onJumpToPdfPage(selectedTheorem.bookPage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>صفحه {selectedTheorem.bookPage} کتاب</span>
                  </button>

                  {linkedPreset && (
                    <button
                      onClick={() => onOpen2DStudio(linkedPreset)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>آزمایش در کارگاه ۲بعدی</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <h4 className="text-xs font-bold text-[#0284C7] mb-1">فرض (Assumption):</h4>
                  <p className="text-xs text-[#1E293B] leading-relaxed">
                    {selectedTheorem.assumption}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD]">
                  <h4 className="text-xs font-bold text-[#0369A1] mb-1">حکم (Conclusion):</h4>
                  <p className="text-xs text-[#0F172A] font-medium leading-relaxed">
                    {selectedTheorem.conclusion}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A]">مراحل استدلال و اثبات هندسی:</h4>
                <ol className="space-y-2.5">
                  {selectedTheorem.proofSteps.map((step, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0]"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#F0F9FF] text-[#0284C7] font-mono-num text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-xs text-[#334155] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Quadrilateral Comparison Matrix (Page 75 of Textbook) */}
        {activeTab === 'quad-matrix' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  جدول کامل مقایسه ویژگی‌های چهارضلعی‌های خاص (صفحه ۷۵ کتاب هندسه ۱)
                </h2>
                <p className="text-xs text-[#475569] mt-1">
                  مقایسه ویژگی‌های اضلاع، زوایا و قطرها در متوازی‌الاضلاع، مستطیل، لوزی، مربع، ذوزنقه و ذوزنقه متساوی‌الساقین
                </p>
              </div>
              <button
                onClick={() => onJumpToPdfPage(75)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>مشاهده صفحه ۷۵ در کتاب PDF</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#0F172A]">
                    <th className="py-3 px-4 font-bold">ویژگی هندسی</th>
                    <th className="py-3 px-3 font-bold">متوازی‌الاضلاع</th>
                    <th className="py-3 px-3 font-bold">مستطیل</th>
                    <th className="py-3 px-3 font-bold">لوزی</th>
                    <th className="py-3 px-3 font-bold">مربع</th>
                    <th className="py-3 px-3 font-bold">ذوزنقه متساوی‌الساقین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {QUADRILATERAL_MATRIX.map((row, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-bold text-[#0F172A]">{row.property}</td>
                      <td className="py-3 px-3 text-[#334155]">{row.parallelogram}</td>
                      <td className="py-3 px-3 text-[#334155]">{row.rectangle}</td>
                      <td className="py-3 px-3 text-[#334155]">{row.rhombus}</td>
                      <td className="py-3 px-3 text-[#0284C7] font-semibold">{row.square}</td>
                      <td className="py-3 px-3 text-[#334155]">{row.isoscelesTrapezoid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Deep Geometric Thinking (ThinkingLevel.HIGH) + Google Search Grounding */}
        {activeTab === 'ai-solver' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  استودیو استدلال عمیق هندسی و کاوشگر منابع علمی
                </h2>
                <p className="text-xs text-[#475569] mt-1">
                  پشتیبانی از استنتاج گام‌به‌گام (High Thinking) و جستجوی وب به همراه موتور استنتاج آفلاین کتاب درسی
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
                <button
                  onClick={() => setAiMode('think')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                    aiMode === 'think'
                      ? 'bg-[#0F172A] text-white'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>اثبات عمیق (Thinking High)</span>
                </button>

                <button
                  onClick={() => setAiMode('search')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                    aiMode === 'search'
                      ? 'bg-[#0284C7] text-white'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>جستجوی علمی با Google Search</span>
                </button>
              </div>
            </div>

            {/* Quick Textbook Question Starters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B]">پرسش‌های نمونه کتاب:</span>
              {[
                'اثبات قضیه تالس در مثلث با استفاده از مساحت',
                'چگونه با برهان خلف ثابت کنیم از یک نقطه خارج خط فقط یک عمود بر آن رسم می‌شود؟',
                'اثبات قضیه دوشرطی عمودمنصف پاره‌خط',
                'عدم وجود مثلث متساوی‌الاضلاع شبکه‌ای با فرمول پیک',
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRunAiQuery(sample)}
                  className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E0F2FE] hover:text-[#0284C7] text-xs font-medium text-[#334155] transition-colors cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Query Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunAiQuery();
                }}
                placeholder="صورت قضیه، تمرین کتاب هندسه ۱ یا موضوع مورد نظر را بنویسید..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
              />
              <button
                onClick={() => handleRunAiQuery()}
                disabled={isLoading || !query.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isLoading ? 'در حال استنتاج...' : 'تحلیل و اثبات'}</span>
              </button>
            </div>

            {/* Result Output */}
            {aiResponse && (
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                {aiModelLabel && (
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-bold text-[#0284C7]">پاسخ و استدلال هندسی</span>
                    <span className="text-[11px] font-mono-num text-[#64748B]">
                      {aiModelLabel}
                    </span>
                  </div>
                )}
                <div className="text-xs text-[#1E293B] whitespace-pre-line leading-relaxed">
                  {aiResponse}
                </div>

                {aiSources.length > 0 && (
                  <div className="pt-3 border-t border-[#E2E8F0] space-y-1.5">
                    <span className="block text-xs font-bold text-[#0F172A]">منابع وب:</span>
                    <div className="flex flex-wrap gap-2">
                      {aiSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[11px] text-[#0284C7] hover:underline"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

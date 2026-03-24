import { useState } from 'react';
import Layout from '../components/Layout';
import { Search, ExternalLink, Pill } from 'lucide-react';
import clsx from 'clsx';

interface PriceSource {
  name: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  logoLetter: string;
  buildUrl: (drug: string) => string;
  note: string;
}

const SOURCES: PriceSource[] = [
  {
    name: 'GoodRx',
    description: 'Free prescription discount coupons — often 80% off retail price',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    logoLetter: 'G',
    buildUrl: (drug) =>
      `https://www.goodrx.com/${encodeURIComponent(drug.toLowerCase().replace(/\s+/g, '-'))}`,
    note: 'Compare prices at nearby pharmacies',
  },
  {
    name: 'Cost Plus Drugs',
    description: 'Mark Cuban\'s transparent-pricing pharmacy — often the lowest cost',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    logoLetter: 'C',
    buildUrl: (drug) =>
      `https://costplusdrugs.com/medications/search/?q=${encodeURIComponent(drug)}`,
    note: 'Transparent, flat pricing with no middlemen',
  },
  {
    name: 'SingleCare',
    description: 'Free savings card accepted at major pharmacy chains nationwide',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    logoLetter: 'S',
    buildUrl: (drug) =>
      `https://www.singlecare.com/prescription/${encodeURIComponent(drug.toLowerCase().replace(/\s+/g, '-'))}`,
    note: 'Print or show card on your phone at checkout',
  },
];

export default function MedicationPriceComparison() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) setSearched(trimmed);
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Pill size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Medication Price Comparison</h1>
            <p className="text-sm text-slate-500">Find the cheapest price for your prescription</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter medication name (e.g. Lisinopril, Metformin)"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Compare
          </button>
        </form>

        {/* Results */}
        {searched && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Showing price sources for <span className="font-semibold text-slate-700">"{searched}"</span> — click each to see the latest price:
            </p>

            {SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.buildUrl(searched)}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'flex items-center gap-4 p-4 rounded-2xl border bg-white hover:shadow-md transition-all group',
                  source.borderColor
                )}
              >
                {/* Logo */}
                <div className={clsx(
                  'w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0',
                  source.bgColor, source.color
                )}>
                  {source.logoLetter}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx('font-semibold text-sm', source.color)}>{source.name}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{source.description}</p>
                  <p className="text-xs text-slate-400 mt-1 italic">{source.note}</p>
                </div>

                {/* Arrow */}
                <ExternalLink
                  size={16}
                  className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors"
                />
              </a>
            ))}

            <p className="text-xs text-slate-400 text-center pt-2">
              Prices vary by pharmacy, location, and dosage. Always confirm the final price before purchasing.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!searched && (
          <div className="text-center py-12 text-slate-400">
            <Pill size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter a medication name above to compare prices across GoodRx, Cost Plus Drugs, and SingleCare.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

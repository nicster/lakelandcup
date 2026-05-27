import { db, rules } from '@/lib/db';
import { asc } from 'drizzle-orm';
import { DEFAULT_RULES } from '@/lib/default-rules';

export const dynamic = 'force-dynamic';

// Simple markdown-like renderer
function RenderContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 text-lake-ice/80 mb-4 ml-2">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const formatInline = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-lake-ice font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-lg font-semibold text-lake-gold mt-6 mb-3">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p
          key={index}
          className="text-lake-ice/80 mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
        />
      );
    }
  });

  flushList();

  return <>{elements}</>;
}

async function getRules() {
  try {
    const results = await db
      .select()
      .from(rules)
      .orderBy(asc(rules.sortOrder));

    return results.length > 0 ? results : null;
  } catch (err) { console.error("DB query failed:", err);
    return null;
  }
}

export default async function RulesPage() {
  const dbRules = await getRules();
  const rulesData = dbRules || DEFAULT_RULES.map((r, i) => ({ ...r, id: i, updatedAt: null }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Page Header */}
      <header className="mb-10">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">Official Manual</p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">Rules &amp; Regulations</h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          The governing document of the Lakeland Cup dynasty.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
        {/* Table of Contents — inline above on mobile, sticky sidebar on lg+ */}
        <nav
          aria-label="Rules table of contents"
          className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-8 lg:mb-0 lg:bg-transparent lg:border-0 lg:p-0 lg:sticky lg:top-24 lg:self-start"
        >
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-wider mb-4">
            Contents
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
            {rulesData.map((rule) => (
              <li key={rule.section}>
                <a
                  href={`#${rule.section}`}
                  className="text-lake-ice/70 hover:text-lake-gold transition-colors text-sm block py-0.5"
                >
                  {rule.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {/* Rules Sections */}
          <div className="space-y-12">
            {rulesData.map((rule) => (
              <section
                key={rule.section}
                id={rule.section}
                className="scroll-mt-24"
              >
                <h2 className="text-xl font-bold text-lake-gold mb-4 pb-2 border-b border-lake-blue-light/20">
                  {rule.title}
                </h2>
                <div className="prose-lake">
                  <RenderContent content={rule.content} />
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t border-lake-blue-light/20 text-center">
            <p className="text-lake-ice-muted text-sm">
              Originally published September 19, 2016. Revised September 30, 2023.
              <br />
              Contact the commissioner for rule clarifications or amendments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

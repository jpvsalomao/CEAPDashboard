/**
 * EntityDiagram - Clean, centered ERD visualization using pure CSS/HTML
 *
 * Layout (centered):
 *       [Deputy] ←—————→ [Aggregations]
 *          |
 *    [Supplier]  [FraudFlag]
 *          |
 *   [CNPJMismatch]
 */

interface EntityDiagramProps {
  height?: number;
  simplified?: boolean;
}

interface Entity {
  id: string;
  name: string;
  nameEn: string;
  fields: number;
  icon: string;
}

const ENTITIES: Entity[] = [
  { id: 'deputy', name: 'Deputado', nameEn: 'Deputy', fields: 18, icon: '👤' },
  { id: 'aggregations', name: 'Agregações', nameEn: 'Aggregations', fields: 5, icon: '📊' },
  { id: 'supplier', name: 'Fornecedor', nameEn: 'SupplierShare', fields: 4, icon: '🏢' },
  { id: 'fraudFlag', name: 'Indicadores', nameEn: 'FraudFlag', fields: 7, icon: '🚩' },
  { id: 'mismatch', name: 'Mismatch CNPJ', nameEn: 'CNPJMismatch', fields: 9, icon: '⚠️' },
];

export function EntityDiagram({ simplified = false }: EntityDiagramProps) {
  const deputy = ENTITIES.find(e => e.id === 'deputy')!;
  const aggregations = ENTITIES.find(e => e.id === 'aggregations')!;
  const supplier = ENTITIES.find(e => e.id === 'supplier')!;
  const fraudFlag = ENTITIES.find(e => e.id === 'fraudFlag')!;
  const mismatch = ENTITIES.find(e => e.id === 'mismatch')!;

  return (
    <div className="w-full py-4">
      {/* ===== ROW 1: Deputy (center) or Deputy + Aggregations ===== */}
      <div className="flex justify-center items-center gap-6 md:gap-12">
        <EntityBox entity={deputy} primary />

        {!simplified && (
          <>
            {/* Horizontal connector */}
            <div className="hidden md:flex items-center">
              <div className="w-8 lg:w-16 h-px bg-border" />
              <span className="px-2 py-1 text-[10px] text-text-muted bg-bg-card border border-border rounded whitespace-nowrap">
                contribui (N:M)
              </span>
              <div className="w-8 lg:w-16 h-px bg-border" />
            </div>
            <EntityBox entity={aggregations} />
          </>
        )}
      </div>

      {/* ===== Vertical connectors from Deputy ===== */}
      <div className="flex justify-center">
        <div className="flex items-start gap-6 md:gap-12">
          {/* Left branch: Deputy → Supplier */}
          <div className="flex flex-col items-center" style={{ width: simplified ? '160px' : '160px' }}>
            <div className="h-6 w-px bg-border" />
            <span className="px-2 py-0.5 text-[10px] text-text-muted bg-bg-card border border-border rounded">
              contrata (1:N)
            </span>
            <div className="h-6 w-px bg-border" />
          </div>

          {!simplified && (
            /* Right branch: Deputy → FraudFlag */
            <div className="hidden md:flex flex-col items-center" style={{ width: '160px' }}>
              <div className="h-6 w-px bg-border" />
              <span className="px-2 py-0.5 text-[10px] text-text-muted bg-bg-card border border-border rounded">
                tem (1:1)
              </span>
              <div className="h-6 w-px bg-border" />
            </div>
          )}

          {simplified && (
            <div className="flex flex-col items-center" style={{ width: '160px' }}>
              <div className="h-6 w-px bg-border" />
              <span className="px-2 py-0.5 text-[10px] text-text-muted bg-bg-card border border-border rounded">
                tem (1:1)
              </span>
              <div className="h-6 w-px bg-border" />
            </div>
          )}
        </div>
      </div>

      {/* ===== ROW 2: Supplier + FraudFlag ===== */}
      <div className="flex justify-center items-center gap-6 md:gap-12">
        <EntityBox entity={supplier} />
        <EntityBox entity={fraudFlag} />
      </div>

      {/* ===== Vertical connector: Supplier → Mismatch (only if not simplified) ===== */}
      {!simplified && (
        <>
          <div className="flex justify-center">
            <div className="flex items-start gap-6 md:gap-12">
              <div className="flex flex-col items-center" style={{ width: '160px' }}>
                <div className="h-6 w-px bg-border" />
                <span className="px-2 py-0.5 text-[10px] text-text-muted bg-bg-card border border-border rounded">
                  pode ter (1:N)
                </span>
                <div className="h-6 w-px bg-border" />
              </div>
              {/* Spacer to align with FraudFlag column */}
              <div style={{ width: '160px' }} />
            </div>
          </div>

          {/* ===== ROW 3: Mismatch ===== */}
          <div className="flex justify-center items-center gap-6 md:gap-12">
            <EntityBox entity={mismatch} />
            {/* Spacer */}
            <div style={{ width: '160px' }} className="hidden md:block" />
          </div>
        </>
      )}

      {/* ===== Legend ===== */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-text-muted">
          <span><strong className="text-text-secondary">1:1</strong> = Um para um</span>
          <span><strong className="text-text-secondary">1:N</strong> = Um para muitos</span>
          <span><strong className="text-text-secondary">N:M</strong> = Muitos para muitos</span>
        </div>
      </div>
    </div>
  );
}

function EntityBox({ entity, primary }: { entity: Entity; primary?: boolean }) {
  return (
    <div
      className={`
        w-40 p-3 rounded-lg border-2 transition-all
        ${primary
          ? 'bg-accent-teal/10 border-accent-teal/40 shadow-lg shadow-accent-teal/10'
          : 'bg-bg-secondary border-border hover:border-accent-teal/30'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{entity.icon}</span>
        <span className={`font-semibold text-sm ${primary ? 'text-accent-teal' : 'text-text-primary'}`}>
          {entity.name}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <code className="text-[10px] text-text-muted font-mono">{entity.nameEn}</code>
        <span className="text-[10px] text-accent-teal bg-accent-teal/10 px-1.5 py-0.5 rounded">
          {entity.fields} campos
        </span>
      </div>
    </div>
  );
}

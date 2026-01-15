/**
 * SpotlightNarrativeHook - Dramatic opening for investigative stories
 * Editorial style inspired by Folha/Piauí special reports
 */

import { formatReais } from '../../utils/formatters';

interface Props {
  hook: string;
  insight: string;
  stats: {
    totalEmendas: number;
    totalBlocked: number;
    phases: number;
    deputies: number;
  };
}

export function SpotlightNarrativeHook({ hook, insight, stats }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background with dramatic gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)
          `
        }}
      />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      <div className="relative z-10 p-8 md:p-12">
        {/* Dateline */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent-amber/50 to-transparent" />
          <span className="text-accent-amber text-xs font-mono tracking-[0.3em] uppercase">
            Investigação Especial
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent-amber/50 to-transparent" />
        </div>

        {/* The Hook - Dramatic opening */}
        <blockquote className="relative">
          {/* Opening quote mark */}
          <span
            className="absolute -left-2 -top-4 text-6xl text-accent-amber/20 font-serif leading-none select-none"
            aria-hidden="true"
          >
            "
          </span>

          <p className="text-xl md:text-2xl lg:text-3xl text-white font-light leading-relaxed tracking-tight pl-6">
            {hook}
          </p>
        </blockquote>

        {/* Insight */}
        <p className="mt-6 text-base text-slate-300 leading-relaxed max-w-3xl">
          {insight}
        </p>

        {/* Stats bar */}
        <div className="mt-10 pt-8 border-t border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="group">
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white tracking-tight">
                {formatReais(stats.totalEmendas, { noCents: true })}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-wider">
                em emendas analisadas
              </p>
            </div>

            <div className="group">
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-slate-300 tracking-tight">
                {formatReais(stats.totalBlocked, { noCents: true })}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-wider">
                bloqueados pela PF
              </p>
            </div>

            <div className="group">
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-accent-amber tracking-tight">
                {stats.phases}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-wider">
                fases da operação
              </p>
            </div>

            <div className="group">
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white tracking-tight">
                {stats.deputies}
              </p>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 uppercase tracking-wider">
                deputados investigados
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * SpotlightTimeline - Visual chronology of key events
 * Shows verified timeline for case context
 */

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'news' | 'transaction' | 'official' | 'investigation';
  highlight?: boolean;
}

interface SpotlightTimelineProps {
  events: TimelineEvent[];
  title?: string;
}

const EVENT_COLORS = {
  news: { bg: 'bg-accent-blue/20', border: 'border-accent-blue', icon: '📰' },
  transaction: { bg: 'bg-accent-amber/20', border: 'border-accent-amber', icon: '💳' },
  official: { bg: 'bg-accent-teal/20', border: 'border-accent-teal', icon: '🏛️' },
  investigation: { bg: 'bg-accent-red/20', border: 'border-accent-red', icon: '🔍' },
};

export function SpotlightTimeline({ events, title = 'Cronologia Verificada' }: SpotlightTimelineProps) {
  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      <h3 className="font-semibold text-text-primary mb-6 flex items-center gap-2">
        <span>📅</span>
        {title}
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {events.map((event, i) => {
            const colors = EVENT_COLORS[event.type];
            return (
              <div
                key={i}
                className={`relative pl-12 ${event.highlight ? 'scale-[1.02]' : ''}`}
              >
                {/* Timeline dot */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center text-xs`}
                >
                  {colors.icon}
                </div>

                <div className={`${colors.bg} rounded-lg p-4 ${event.highlight ? `border-l-4 ${colors.border}` : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-text-muted mb-1">{event.date}</p>
                      <h4 className="font-medium text-text-primary text-sm">{event.title}</h4>
                      <p className="text-xs text-text-secondary mt-1">{event.description}</p>
                    </div>
                    {event.highlight && (
                      <span className="shrink-0 px-2 py-0.5 bg-accent-red/20 text-accent-red text-xs rounded-full">
                        Chave
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

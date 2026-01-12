import { PreloadNavLink } from '../ui/PreloadLink';
import { getNavSections } from '../../config/features';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const navSections = getNavSections();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={`fixed left-0 top-0 h-full w-64 bg-bg-secondary border-r border-border flex flex-col z-40 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Onde Foi Parar a <span className="text-accent-teal">Cota</span>
            </h1>
            <p className="text-xs text-text-muted mt-1">
              Gastos Parlamentares 2023-2025
            </p>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-2 text-text-muted hover:text-text-primary"
            aria-label="Fechar menu de navegação"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto" aria-label="Menu de páginas">
          {navSections.map((section, index) => (
            <div
              key={section.id}
              className={section.label ? `${index > 0 ? 'mt-4 pt-4 border-t border-border' : ''}` : ''}
            >
              {section.label && (
                <h3 className="px-4 text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  {section.label}
                </h3>
              )}
              <ul className="space-y-1" role="list">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <PreloadNavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-accent-teal/20 text-accent-teal'
                            : section.id === 'coming-soon'
                              ? 'text-text-muted hover:bg-bg-card hover:text-text-secondary'
                              : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                        }`
                      }
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </PreloadNavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-muted">
            <p>Fonte: Dados Abertos</p>
            <p className="mt-1">Câmara dos Deputados</p>
          </div>
        </div>
      </aside>
    </>
  );
}

// Mobile bottom navigation removed - using header breadcrumbs instead for better screen real estate
export function MobileNav() {
  // Intentionally empty - bottom nav removed to save mobile screen space
  // Current page is now shown in the mobile header
  return null;
}

import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, MobileNav } from './Sidebar';
import { PageWrapper } from '../ui/PageTransition';
import { getEnabledNavItems } from '../../config/features';
import { FeedbackButton } from '../feedback';

// Get page label from current path
function usePageLabel(): string {
  const location = useLocation();
  const navItems = getEnabledNavItems();

  // Find matching nav item
  const matchedItem = navItems.find(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  // Handle deputy profile pages
  if (location.pathname.startsWith('/deputado/')) {
    return 'Perfil';
  }

  // Handle deep dive pages
  if (location.pathname.startsWith('/deepdive/')) {
    return 'Deep Dive';
  }

  return matchedItem?.label || 'CEAP';
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageLabel = usePageLabel();

  return (
    <div className="bg-bg-primary flex flex-col flex-1">
      {/* Mobile header with hamburger */}
      <header
        className="fixed top-0 left-0 right-0 h-14 bg-bg-secondary border-b border-border z-30 flex items-center justify-between px-4 md:hidden"
        role="banner"
      >
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-text-muted hover:text-text-primary"
            aria-label="Abrir menu de navegação"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-bold text-text-primary">
            Onde Foi Parar a <span className="text-accent-teal">Cota</span>
          </h1>
        </div>
        {/* Current page indicator */}
        <span className="text-sm text-text-muted bg-bg-card px-2 py-1 rounded">
          {pageLabel}
        </span>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Content wrapper - grows to fill space, pushing footer down */}
      <div className="md:ml-64 flex flex-col flex-1">
        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 pt-14 md:pt-0 p-4 md:p-6"
          role="main"
          aria-label="Conteúdo principal"
          tabIndex={-1}
        >
          <PageWrapper>
            <Outlet />
          </PageWrapper>
        </main>

        {/* Footer */}
        <footer
          className="py-6 px-4 md:px-6 border-t border-border bg-bg-secondary/50 no-print"
          role="contentinfo"
        >
          <div className="flex flex-col items-center gap-3 text-xs text-text-muted">
            {/* CTA */}
            <p className="text-text-secondary text-center">
              Projeto em andamento. Siga para acompanhar as novidades.
            </p>

            {/* Links row */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <a
                href="https://dadosabertos.camara.leg.br"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-secondary transition-colors"
              >
                Dados Abertos
              </a>
              <span className="text-border">•</span>
              <span>Projeto por</span>
              <a
                href="https://www.linkedin.com/in/joaopvs/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
                aria-label="LinkedIn de joaopvs"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://www.threads.net/@jpvsalomao"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center gap-1"
                aria-label="Threads de jpvsalomao"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.17.408-2.243 1.33-3.023.88-.744 2.12-1.201 3.59-1.323.98-.081 1.957-.043 2.905.112-.072-.478-.203-.906-.395-1.277-.384-.74-1.02-1.11-1.94-1.131h-.032c-.736 0-1.556.274-2.073.745l-1.325-1.568c.836-.707 2.105-1.295 3.4-1.295h.058c1.565.033 2.763.676 3.455 1.858.507.866.779 1.96.808 3.253.025 1.277-.155 2.395-.506 3.287 1.236.714 2.14 1.62 2.663 2.81.77 1.755.753 4.418-1.37 6.497-1.835 1.795-4.14 2.555-7.27 2.579zm.112-9.637c-1.644.138-2.626.755-2.584 1.626.034.694.59 1.347 1.862 1.352.032.001.063.002.095.002.977 0 1.727-.333 2.23-.99.39-.51.652-1.2.779-2.058-.77-.133-1.565-.181-2.382-.132z"/>
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* Feedback button */}
      <FeedbackButton />
    </div>
  );
}

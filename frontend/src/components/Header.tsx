import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, User, Home } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AccountSettingsDialog from './AccountSettingsDialog';
import { useState } from 'react';

// Custom minimal line-based three-node graph icon matching lucide-react style
const GraphIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Top node */}
    <circle cx="12" cy="6" r="2" />
    {/* Bottom left node */}
    <circle cx="6" cy="18" r="2" />
    {/* Bottom right node */}
    <circle cx="18" cy="18" r="2" />
    {/* Connecting lines */}
    <line x1="12" y1="8" x2="7.5" y2="16.5" />
    <line x1="12" y1="8" x2="16.5" y2="16.5" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

// Custom Ontology Builder icon matching lucide-react style
const OntologyBuilderIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Central node */}
    <circle cx="12" cy="12" r="2" />
    {/* Top node */}
    <circle cx="12" cy="4" r="1.5" />
    {/* Bottom node */}
    <circle cx="12" cy="20" r="1.5" />
    {/* Left node */}
    <circle cx="4" cy="12" r="1.5" />
    {/* Right node */}
    <circle cx="20" cy="12" r="1.5" />
    {/* Connecting lines */}
    <line x1="12" y1="5.5" x2="12" y2="10" />
    <line x1="12" y1="14" x2="12" y2="18.5" />
    <line x1="5.5" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="18.5" y2="12" />
  </svg>
);

export default function Header() {
  const { identity } = useInternetIdentity();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const isAuthenticated = !!identity;
  const currentPath = routerState.location.pathname;
  const isLandingPage = currentPath === '/';

  return (
    <>
      <header className="w-full border-b border-border/40 bg-background">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Home icon - positioned in top-left area with increased size */}
            {isAuthenticated && !isLandingPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/dashboard' })}
                className="h-12 w-12 hover:bg-foreground/10"
                title="Go to Dashboard"
              >
                <Home className="h-6 w-6 text-foreground/80 dark:text-foreground/90" />
                <span className="sr-only">Dashboard</span>
              </Button>
            )}

            {/* Graph icon button - minimal line-based three-node knowledge graph icon with theme-aware opacity */}
            {isAuthenticated && !isLandingPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/graph' })}
                className="h-12 w-12 hover:bg-foreground/10"
                title="Go to Graph View"
              >
                <GraphIcon className="h-6 w-6 text-foreground/80 dark:text-foreground/90" />
                <span className="sr-only">Graph View</span>
              </Button>
            )}

            {/* Ontology Builder icon button - positioned next to Graph icon with consistent styling */}
            {isAuthenticated && !isLandingPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/ontology-builder' })}
                className="h-12 w-12 hover:bg-foreground/10"
                title="Go to Ontology Builder"
              >
                <OntologyBuilderIcon className="h-6 w-6 text-foreground/80 dark:text-foreground/90" />
                <span className="sr-only">Ontology Builder</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle with increased size */}
            {!isLandingPage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-12 w-12">
                    <Sun className="h-6 w-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-6 w-6 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')} className="text-sm">Light</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')} className="text-sm">Dark</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')} className="text-sm">System</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Hamburger menu with increased size - only show when authenticated */}
            {isAuthenticated && !isLandingPage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-12 w-12">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => navigate({ to: '/graph' })}
                    className="text-sm"
                  >
                    Graph
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate({ to: '/ontology-builder' })}
                    className="text-sm"
                  >
                    Ontology Builder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Account icon with increased size - only show when authenticated */}
            {isAuthenticated && !isLandingPage && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAccountSettings(true)}
                className="h-12 w-12 rounded-full"
              >
                <User className="h-6 w-6" />
                <span className="sr-only">Account settings</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Account Settings Dialog */}
      <AccountSettingsDialog
        open={showAccountSettings}
        onOpenChange={setShowAccountSettings}
      />
    </>
  );
}

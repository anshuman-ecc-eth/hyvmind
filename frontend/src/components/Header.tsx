import { Moon, Sun, Plus, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useState, useEffect } from 'react';
import CreateNodeDialog from './CreateNodeDialog';
import ProfileSettingsModal from './ProfileSettingsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { clearTreeCache } from '../hooks/useQueries';

interface HeaderProps {
  currentView: 'graph' | 'tree' | 'terminal' | 'swarms' | 'buzz' | 'collectibles';
  onViewChange: (view: 'graph' | 'tree' | 'terminal' | 'swarms' | 'buzz' | 'collectibles') => void;
  isAuthenticated: boolean;
  isLandingPage: boolean;
}

export default function Header({ currentView, onViewChange, isAuthenticated, isLandingPage }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { login, clear, loginStatus } = useInternetIdentity();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await clear();
    // Clear tree cache on logout
    clearTreeCache();
    queryClient.clear();
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'User is already authenticated') {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  // Use resolvedTheme for logo selection to handle system theme correctly
  const currentTheme = mounted ? resolvedTheme : 'dark';

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and App Name */}
          <div className="flex items-center gap-3">
            <img
              src={currentTheme === 'dark' ? '/assets/hyvmind_logo white, transparent.png' : '/assets/hyvmind_logo black, transparent.png'}
              alt="Hyvmind Logo"
              className="h-8 w-auto opacity-100"
              style={{ opacity: 1 }}
            />
            <span className="text-sm font-medium text-foreground">hyvmind</span>
          </div>

          {/* Navigation Tabs (only for authenticated users) */}
          {isAuthenticated && (
            <nav className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={() => onViewChange('graph')}
                className={`${
                  currentView === 'graph'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Graph
              </Button>
              <Button
                variant="ghost"
                onClick={() => onViewChange('tree')}
                className={`${
                  currentView === 'tree'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                List
              </Button>
              <Button
                variant="ghost"
                onClick={() => onViewChange('terminal')}
                className={`${
                  currentView === 'terminal'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Terminal
              </Button>
              <Button
                variant="ghost"
                onClick={() => onViewChange('swarms')}
                className={`${
                  currentView === 'swarms'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Swarms
              </Button>
              <Button
                variant="ghost"
                onClick={() => onViewChange('collectibles')}
                className={`${
                  currentView === 'collectibles'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Collectibles
              </Button>
              <Button
                variant="ghost"
                onClick={() => onViewChange('buzz')}
                className={`${
                  currentView === 'buzz'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Leaderboard
              </Button>
            </nav>
          )}

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CreateNodeDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCreateDialogOpen(true)}
                          className="hover:bg-accent hover:text-accent-foreground"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      }
                      open={createDialogOpen}
                      onOpenChange={setCreateDialogOpen}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Node</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Theme Toggle - Now visible on landing page and for authenticated users */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            {/* Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-accent hover:text-accent-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover text-popover-foreground border border-border">
                {!isAuthenticated ? (
                  <>
                    <DropdownMenuItem
                      onClick={handleLogin}
                      disabled={loginStatus === 'logging-in'}
                      className="cursor-pointer"
                    >
                      {loginStatus === 'logging-in' ? 'Logging in...' : 'Login'}
                    </DropdownMenuItem>
                    {isLandingPage && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => window.open('https://app.cg/c/hyvmind/', '_blank')}
                          className="cursor-pointer"
                        >
                          Join Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open('https://x.com/hyvmind_app', '_blank')}
                          className="cursor-pointer"
                        >
                          Keep Track
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open('https://nodes.desci.com/dpid/969', '_blank')}
                          className="cursor-pointer"
                        >
                          See Whitepaper
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => setProfileSettingsOpen(true)}
                      className="cursor-pointer"
                    >
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      Logout
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Profile Settings Modal */}
      {profileSettingsOpen && (
        <ProfileSettingsModal
          open={profileSettingsOpen}
          onOpenChange={setProfileSettingsOpen}
        />
      )}
    </header>
  );
}

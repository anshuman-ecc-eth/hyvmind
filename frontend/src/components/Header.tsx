/**
 * Copyright (c) Anshuman Singh, 2026.
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * This work is licensed under the Creative Commons Attribution-ShareAlike 4.0 
 * International License. To view a copy of this license, visit 
 * http://creativecommons.org/licenses/by-sa/4.0/
 */
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Network, TreePine, Moon, Sun, Users, Menu, ExternalLink, BookOpen, Zap, Plus, LogOut, Settings, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import CreateNodeDialog from './CreateNodeDialog';
import ProfileSettingsModal from './ProfileSettingsModal';
import SearchModal from './SearchModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ViewType = 'graph' | 'tree' | 'membership' | 'ontologies' | 'buzz';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function Header({ currentView, onViewChange }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const buttonText =
    loginStatus === 'logging-in'
      ? 'Logging in...'
      : isAuthenticated
        ? 'Logout'
        : 'Login';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: unknown) {
        console.error('Login error:', error);
        if (error instanceof Error && error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLearnMore = () => {
    window.open('https://desci.ng/paper/hyvmind-a-research-to-earn-dapp-for-tokenising-annotation', '_blank');
  };

  const handleJoinCommunity = () => {
    window.open('https://telegram.me/+YbeQY2mzwfFlMGU1', '_blank');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <img 
                src="/assets/hyvmind_logo white, transparent.png" 
                alt="Hyvmind" 
                className="h-10 w-auto"
              />
            ) : (
              <img 
                src="/assets/hyvmind_logo black, transparent.png" 
                alt="Hyvmind" 
                className="h-10 w-auto"
              />
            )}
            <span className="text-sm font-semibold tracking-tight text-foreground">
              hyvmind
            </span>
          </div>
          
          {isAuthenticated && (
            <nav className="flex gap-2">
              <Button
                variant={currentView === 'graph' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('graph')}
                className={currentView === 'graph' ? 'bg-foreground text-background hover:bg-foreground/90' : 'hover:bg-accent hover:text-accent-foreground'}
              >
                <Network className="mr-2 h-4 w-4" />
                Graph
              </Button>
              <Button
                variant={currentView === 'tree' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('tree')}
                className={currentView === 'tree' ? 'bg-foreground text-background hover:bg-foreground/90' : 'hover:bg-accent hover:text-accent-foreground'}
              >
                <TreePine className="mr-2 h-4 w-4" />
                Tree
              </Button>
              <Button
                variant={currentView === 'membership' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('membership')}
                className={currentView === 'membership' ? 'bg-foreground text-background hover:bg-foreground/90' : 'hover:bg-accent hover:text-accent-foreground'}
              >
                <Users className="mr-2 h-4 w-4" />
                Swarms
              </Button>
              <Button
                variant={currentView === 'ontologies' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('ontologies')}
                className={currentView === 'ontologies' ? 'bg-foreground text-background hover:bg-foreground/90' : 'hover:bg-accent hover:text-accent-foreground'}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Ontologies
              </Button>
              <Button
                variant={currentView === 'buzz' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('buzz')}
                className={currentView === 'buzz' ? 'bg-foreground text-background hover:bg-foreground/90' : 'hover:bg-accent hover:text-accent-foreground'}
              >
                <Zap className="mr-2 h-4 w-4" />
                BUZZ
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CreateNodeDialog 
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="hover:bg-accent hover:text-accent-foreground"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create Node</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSearchModalOpen(true)}
                      className="hover:bg-accent hover:text-accent-foreground"
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Search</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hover:bg-muted"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {!isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu"
                  className="hover:bg-muted"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleAuth}
                  disabled={disabled}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  {buttonText}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLearnMore}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Learn More
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleJoinCommunity}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Join Community
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Menu"
                  className="hover:bg-muted"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setProfileSettingsOpen(true)}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleAuth}
                  disabled={disabled}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {buttonText}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {isAuthenticated && (
        <>
          <ProfileSettingsModal 
            open={profileSettingsOpen} 
            onOpenChange={setProfileSettingsOpen} 
          />
          <SearchModal 
            open={searchModalOpen} 
            onOpenChange={setSearchModalOpen} 
          />
        </>
      )}
    </header>
  );
}

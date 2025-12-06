import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LandingPage() {
  const { login, loginStatus, identity } = useInternetIdentity();
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [displayedText, setDisplayedText] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [beePosition, setBeePosition] = useState({ x: 0, y: 0 });
  const [isOnHive, setIsOnHive] = useState(false);
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullText = 'welcome to hyvmind';

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  // Typing animation effect
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 80);

    return () => clearInterval(typingInterval);
  }, []);

  // Bee animation on cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setIsMoving(true);
      setIsOnHive(false);
      setBeePosition({ x: e.clientX, y: e.clientY });

      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }

      movementTimeoutRef.current = setTimeout(() => {
        setIsMoving(false);
        setIsOnHive(true);
      }, 800);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current);
      }
    };
  }, []);

  const handleLogin = () => {
    login();
  };

  const handleExplore = () => {
    window.open('https://app.cg/c/staram/', '_blank');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6 relative overflow-hidden transition-colors duration-300 font-alegreya">
      {/* Theme toggle button - positioned in top-right corner */}
      <div className="fixed top-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-gray-900">
            <DropdownMenuItem onClick={() => setTheme('light')} className="text-sm">Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="text-sm">Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="text-sm">System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bee animation */}
      {isMoving && (
        <div
          className="fixed pointer-events-none z-50 transition-all duration-300 ease-out"
          style={{
            left: `${beePosition.x - 16}px`,
            top: `${beePosition.y - 16}px`,
          }}
        >
          <img
            src="/assets/generated/animated-bee-transparent.dim_64x64.png"
            alt=""
            className="w-8 h-8 bee-flying"
          />
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-6 max-w-4xl w-full">
        <div className="mb-2 relative w-20 h-20 md:w-24 md:h-24">
          {/* Light mode logo - black transparent version */}
          <img 
            src="/assets/hyvmind_logo black, transparent.png"
            alt="Hyvmind Logo" 
            className="absolute inset-0 w-full h-full object-contain opacity-90 dark:hidden"
          />
          {/* Dark mode logo - white transparent version */}
          <img 
            src="/assets/hyvmind_logo white, transparent.png"
            alt="Hyvmind Logo" 
            className="absolute inset-0 w-full h-full object-contain hidden dark:block opacity-90"
          />
          {/* Bee perched on hive */}
          {isOnHive && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <img
                src="/assets/generated/animated-bee-transparent.dim_64x64.png"
                alt=""
                className="w-6 h-6 animate-fade-in"
              />
            </div>
          )}
        </div>

        <h1 className="text-xl md:text-2xl font-light tracking-wide text-gray-900 dark:text-gray-100 text-center min-h-[2rem] flex items-center transition-colors duration-300">
          {displayedText}
          <span className="typing-cursor ml-1">|</span>
        </h1>

        <div className="flex flex-col items-center gap-3 mt-2">
          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            size="lg"
            className="min-w-[160px] font-light tracking-wide transition-all hover:scale-105 text-sm"
          >
            {isLoggingIn ? 'Logging in...' : 'Get Started'}
          </Button>

          <Button
            onClick={handleExplore}
            variant="outline"
            size="lg"
            className="min-w-[160px] font-light tracking-wide transition-all hover:scale-105 text-sm"
          >
            Explore
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { clearTreeCache } from "../hooks/useQueries";
import CreateNodeDialog from "./CreateNodeDialog";
import ProfileSettingsModal from "./ProfileSettingsModal";

interface HeaderProps {
  currentView:
    | "graph"
    | "tree"
    | "terminal"
    | "swarms"
    | "buzz"
    | "collectibles";
  onViewChange: (
    view: "graph" | "tree" | "terminal" | "swarms" | "buzz" | "collectibles",
  ) => void;
  isAuthenticated: boolean;
  isLandingPage: boolean;
}

export default function Header({
  currentView,
  onViewChange,
  isAuthenticated,
  isLandingPage: _isLandingPage,
}: HeaderProps) {
  const { login, clear, loginStatus } = useInternetIdentity();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await clear();
    clearTreeCache();
    queryClient.clear();
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message === "User is already authenticated") {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  const navItems: {
    key: "graph" | "tree" | "terminal" | "swarms" | "collectibles" | "buzz";
    label: string;
  }[] = [
    { key: "graph", label: "graph" },
    { key: "tree", label: "list" },
    { key: "terminal", label: "terminal" },
    { key: "swarms", label: "swarms" },
    { key: "collectibles", label: "collectibles" },
    { key: "buzz", label: "leaderboard" },
  ];

  return (
    <header className="border-b border-dashed border-border bg-background font-mono">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Image Logo */}
          <div className="flex items-center">
            <img
              src="/assets/uploads/megrim_transparent-019d290a-12e2-7228-bb6e-8eff24087d7a-1.png"
              alt="hyvmind"
              className="h-5 object-contain"
            />
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            {/* Create Node button for authenticated users */}
            {isAuthenticated && (
              <CreateNodeDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="font-mono text-xs hover:bg-accent hover:text-accent-foreground border border-dashed border-transparent hover:border-border"
                    data-ocid="header.open_modal_button"
                  >
                    [+]
                  </Button>
                }
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              />
            )}

            {/* Login button for unauthenticated users — left of hamburger */}
            {!isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
                disabled={loginStatus === "logging-in"}
                className="font-mono text-xs hover:bg-accent hover:text-accent-foreground border border-dashed border-transparent hover:border-border"
                data-ocid="header.login.button"
              >
                {loginStatus === "logging-in" ? "> logging in..." : "> login"}
              </Button>
            )}

            {/* Hamburger Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs hover:bg-accent hover:text-accent-foreground border border-dashed border-transparent hover:border-border"
                  data-ocid="header.open_modal_button"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover text-popover-foreground border border-dashed border-border font-mono min-w-[180px] rounded-none"
                data-ocid="header.dropdown_menu"
              >
                {!isAuthenticated ? (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open("https://app.cg/c/hyvmind/", "_blank")
                      }
                      className="font-mono text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      join chat
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open("https://x.com/hyvmind_app", "_blank")
                      }
                      className="font-mono text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      keep track
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(
                          "https://nodes.desci.com/dpid/969",
                          "_blank",
                        )
                      }
                      className="font-mono text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      see whitepaper
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    {navItems.map((item) => (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => onViewChange(item.key)}
                        className={`font-mono text-xs cursor-pointer ${
                          currentView === item.key
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-ocid={`header.${item.key}.link`}
                      >
                        {currentView === item.key
                          ? `> [${item.label}]`
                          : `[${item.label}]`}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onClick={() => setProfileSettingsOpen(true)}
                      className="font-mono text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                      data-ocid="header.settings.link"
                    >
                      settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="font-mono text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                      data-ocid="header.logout.button"
                    >
                      logout
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

import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TABS = [
  { id: "notes", label: "Notes", ocid: "sidebar.tab.notes" },
  { id: "graphs", label: "Graphs", ocid: "sidebar.tab.graphs" },
  { id: "chat", label: "Chat", ocid: "sidebar.tab.chat" },
  { id: "public", label: "Public", ocid: "sidebar.tab.public" },
  { id: "settings", label: "Settings", ocid: "sidebar.tab.settings" },
  { id: "terminal", label: "Terminal", ocid: "sidebar.tab.terminal" },
] as const;

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <div
      className={`flex flex-col h-full border-r border-border bg-background transition-all duration-200 ${
        collapsed ? "w-10" : "w-32"
      }`}
    >
      <div className="flex flex-col flex-1 pt-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              variant="ghost"
              key={tab.id}
              data-ocid={tab.ocid}
              onClick={() => onTabChange(tab.id)}
              className={`w-full py-3 px-2 ${
                isActive
                  ? "bg-accent text-accent-foreground border-l-2 border-primary"
                  : "text-muted-foreground"
              }`}
            >
              {collapsed ? (
                <span className="text-xs font-medium uppercase select-none">
                  {tab.label[0]}
                </span>
              ) : (
                <span className="text-xs font-medium select-none">
                  {tab.label}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        data-ocid="sidebar.toggle-collapse"
        onClick={onToggleCollapse}
        className="p-2 w-full text-center border-t border-border"
      >
        {collapsed ? "»" : "«"}
      </Button>
    </div>
  );
}

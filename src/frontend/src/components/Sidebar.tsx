interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TABS = [
  { id: "sources", label: "sources", ocid: "sidebar.tab.sources" },
  { id: "chat", label: "chat", ocid: "sidebar.tab.chat" },
  { id: "public", label: "public", ocid: "sidebar.tab.public" },
  { id: "settings", label: "settings", ocid: "sidebar.tab.settings" },
  { id: "terminal", label: "terminal", ocid: "sidebar.tab.terminal" },
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
            <button
              type="button"
              key={tab.id}
              data-ocid={tab.ocid}
              onClick={() => onTabChange(tab.id)}
              className={`w-full py-3 px-2 flex items-center justify-center transition-colors duration-150 ${
                isActive
                  ? "bg-accent text-accent-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
            </button>
          );
        })}
      </div>

      <button
        type="button"
        data-ocid="sidebar.toggle-collapse"
        onClick={onToggleCollapse}
        className="p-2 w-full text-center text-muted-foreground hover:text-foreground border-t border-border transition-colors duration-150"
      >
        {collapsed ? "»" : "«"}
      </button>
    </div>
  );
}

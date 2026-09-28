import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetMembers } from "../hooks/useQueries";

export default function MembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members = [], isLoading } = useGetMembers(open);

  const sorted = [...members].sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const keyed = (() => {
    const seen = new Map<string, number>();
    return sorted.map((member) => {
      const count = seen.get(member.name) ?? 0;
      seen.set(member.name, count + 1);
      return { member, key: `${member.name}#${count}` };
    });
  })();

  const onlineCount = members.filter((m) => m.online).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">Members</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {members.length} {members.length === 1 ? "member" : "members"}{" "}
            &middot; {onlineCount} online
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh]">
          {isLoading && (
            <p className="text-xs text-muted-foreground/40 py-4">loading...</p>
          )}
          {!isLoading && keyed.length === 0 && (
            <p className="text-xs text-muted-foreground/40 py-4">
              no members yet
            </p>
          )}
          <div className="divide-y divide-dashed divide-border">
            {keyed.map(({ member, key }) => (
              <div key={key} className="flex items-center gap-2 px-1 py-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    member.online ? "bg-green-500" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="text-xs text-foreground truncate">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

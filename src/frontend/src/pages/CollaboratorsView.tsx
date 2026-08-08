import { useEffect } from "react";
import AppPageHeader from "../components/AppPageHeader";

interface Collaborator {
  name: string;
  logo: string;
  url: string;
}

const PARTNERS: Collaborator[] = [
  {
    name: "Desci Asia",
    logo: "/assets/collaborators/Desci%20Asia.png",
    url: "https://desciasia.org/",
  },
  {
    name: "Desci India",
    logo: "/assets/collaborators/Desci%20India.png",
    url: "https://desciindia.org/",
  },
  {
    name: "Symbiosis Law School, Nagpur",
    logo: "/assets/collaborators/symbiosis-lsn.png",
    url: "https://slsnagpur.edu.in/",
  },
];

interface CollaboratorsViewProps {
  onClose: () => void;
}

export default function CollaboratorsView({ onClose }: CollaboratorsViewProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <AppPageHeader
        title="Collaborators"
        onClose={onClose}
        closeOcid="collaborators.close.button"
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {PARTNERS.map((partner) => (
              <a
                key={partner.name}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border border-dashed border-border bg-card p-4 transition-colors hover:bg-accent/50"
              >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    loading="lazy"
                    className="h-full w-full object-contain grayscale opacity-70 transition hover:grayscale-0 hover:opacity-100"
                  />
                </div>
                <span className="font-mono text-xs leading-tight">
                  {partner.name}
                </span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

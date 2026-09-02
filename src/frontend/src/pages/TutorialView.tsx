import { Actor, AnonymousIdentity, HttpAgent } from "@icp-sdk/core/agent";
import { useEffect, useState } from "react";
import AppPageHeader from "../components/AppPageHeader";
import { loadConfig } from "../config";
import { idlFactory } from "../declarations/backend.did";

interface Step {
  number: number;
  reverse: boolean;
  text: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    reverse: false,
    text: "Hyvmind is a space for sharing and publishing notes. Start by collecting some Buzz. You'll need it later.",
  },
  {
    number: 2,
    reverse: true,
    text: "Create a fresh top-level folder or import existing notes from your device.",
  },
  {
    number: 3,
    reverse: false,
    text: "Hyvmind follows a four-folder hierarchy. The top-level folder is called a Curation. Think of it as a broad category or area of law.",
  },
  {
    number: 4,
    reverse: true,
    text: "The second level is called a Swarm. Use it for statutes, caselaws, reports or general themes.",
  },
  {
    number: 5,
    reverse: false,
    text: "The third level is called a Location. Use it for important paragraphs, sections, orders, chapters etc.",
  },
  {
    number: 6,
    reverse: true,
    text: "The fourth level is both important and subjective. It's called a Law Token. Use it to store the most important pieces of legal language in that Location. (e.g. 'equality before the law', 'securitisation' etc.)",
  },
  {
    number: 7,
    reverse: false,
    text: "Write your interpretations inside the fourth folder.",
  },
  {
    number: 8,
    reverse: true,
    text: "If you're an Obsidian user, download the Hyvmind plugin for direct uploads.",
  },
  {
    number: 9,
    reverse: false,
    text: "The Notes tab has a built-in markdown editor. Use it to write fresh notes, edit existing ones or update metadata.",
  },
  {
    number: 10,
    reverse: true,
    text: "You can also use the editor to add internal cross-references (by typing '{@').",
  },
  {
    number: 11,
    reverse: false,
    text: "Attach sources and attributes to any folder by creating _sources.md and _attributes.md files. Sources and attributes of a parent folder are automatically applied to subfolders.",
  },
  {
    number: 12,
    reverse: true,
    text: "When you're done making Notes, right-click the Curation folder and convert it into a Graph.",
  },
  {
    number: 13,
    reverse: false,
    text: "Go to the Graphs tab to preview each node and connection. (Note: Graphs don't have to be complete, just accurate.)",
  },
  {
    number: 14,
    reverse: true,
    text: "When you're happy with a graph, publish it so others can save and extend it. Note: publishing costs Buzz.",
  },
  {
    number: 15,
    reverse: false,
    text: "Go to the Public page to see what others have published. When someone saves your work, you'll earn Trust.",
  },
];

interface TutorialViewProps {
  onClose: () => void;
}

export default function TutorialView({ onClose }: TutorialViewProps) {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const { backend_canister_id } = await loadConfig();
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      const agent = await HttpAgent.create({
        identity: new AnonymousIdentity(),
        host: isLocal ? undefined : "https://icp-api.io",
        shouldFetchRootKey: isLocal,
      });
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: backend_canister_id,
      });
      await actor.submitTutorialQuestion(
        name.trim(),
        question.trim(),
        contact.trim() ? [contact.trim()] : [],
      );
      setFeedback({
        type: "success",
        text: "Thanks! Your question has been submitted.",
      });
      setName("");
      setContact("");
      setQuestion("");
    } catch {
      setFeedback({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <AppPageHeader title="Tutorial" onClose={onClose} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6">
          <div className="py-16 text-center">
            <p className="text-lg leading-relaxed text-muted-foreground">
              A step by step walkthrough.
              <br />
              From Buzz to Trust.
            </p>
          </div>

          <div>
            {STEPS.map((step) => (
              <div
                key={step.number}
                className={`flex flex-col gap-6 border-b border-dashed border-border py-10 md:flex-row md:gap-12 ${
                  step.reverse ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-3 font-heading text-[0.7rem] font-medium tracking-[0.1em] text-muted-foreground">
                    STEP {step.number}
                  </div>
                  <p className="text-base leading-[1.7] text-foreground">
                    {step.text}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <video
                    src={`/tutorial-videos/${step.number}.mp4`}
                    muted
                    playsInline
                    loop
                    preload="none"
                    onClick={(event) => {
                      event.currentTarget.muted = !event.currentTarget.muted;
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.currentTarget.muted = !event.currentTarget.muted;
                      }
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.play().catch(() => {});
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.pause();
                    }}
                    className="block w-full cursor-pointer border border-dashed border-border bg-muted outline-none [&::-webkit-media-controls]:hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="py-10 text-center">
            <button
              type="button"
              onClick={() => setQuestionsOpen((open) => !open)}
              className="cursor-pointer border border-dashed border-border bg-transparent px-5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-muted-foreground"
            >
              Got Questions?
            </button>
            {questionsOpen && (
              <form
                onSubmit={handleSubmit}
                className="mx-auto mt-5 w-full max-w-[400px] text-left"
              >
                <div className="mb-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Name *"
                    required
                    className="w-full border border-dashed border-border bg-muted px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-muted-foreground"
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    placeholder="Contact (optional)"
                    className="w-full border border-dashed border-border bg-muted px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-muted-foreground"
                  />
                </div>
                <div className="mb-3">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Your question *"
                    required
                    rows={2}
                    className="min-h-[60px] w-full resize-y border border-dashed border-border bg-muted px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-muted-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer border border-dashed border-border bg-transparent px-5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground hover:border-muted-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  Send
                </button>
                {feedback && (
                  <div
                    className={`mt-3 font-mono text-xs ${
                      feedback.type === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
              </form>
            )}
          </div>

          <footer className="py-8 text-center font-mono text-xs text-muted-foreground">
            <a href="/" className="no-underline hover:underline">
              hyvmind.app
            </a>{" "}
            &middot; Tutorial
          </footer>
        </div>
      </main>
    </div>
  );
}

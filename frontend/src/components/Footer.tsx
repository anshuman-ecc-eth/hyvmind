export default function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-background py-6">
      <div className="container text-center text-sm text-muted-foreground">
        <p>
          © 2025 Hyvmind. Built with{' '}
          <a 
            href="https://caffeine.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

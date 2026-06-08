interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-brand-bg/90 backdrop-blur-sm border-b border-brand-border">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-text tracking-tight">
          BuildCityBulk
        </span>
        <button
          onClick={onLoginClick}
          className="inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-h transition-colors"
        >
          Login
        </button>
      </nav>
    </header>
  );
}

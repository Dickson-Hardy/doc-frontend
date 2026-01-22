import cmdaLogo from '@/assets/cmda-logo.png';
import conferenceMascot from '@/assets/conference-mascot.png';

const Header = () => {
  return (
    <header className="w-full bg-card shadow-card border-b border-border/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* CMDA Logo */}
          <div className="flex items-center gap-3">
            <img 
              src={cmdaLogo} 
              alt="CMDA Nigeria Logo" 
              className="h-14 w-auto md:h-16"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-display font-bold text-foreground">
                CMDA Nigeria
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Christian Medical & Dental Association
              </p>
            </div>
          </div>

          {/* Conference Mascot */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right">
              <p className="text-sm font-semibold text-primary">
                National Conference 2026
              </p>
              <p className="text-xs text-muted-foreground">
                30th July – 2nd August
              </p>
            </div>
            <img 
              src={conferenceMascot} 
              alt="Conference Theme: Pursuing Excellence" 
              className="h-12 w-auto md:h-14"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

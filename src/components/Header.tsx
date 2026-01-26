import cmdaLogo from '@/assets/cmda-logo.png';

const Header = () => {
  return (
    <header className="w-full bg-card shadow-card border-b border-border/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          {/* CMDA Logo */}
          <img 
            src={cmdaLogo} 
            alt="CMDA Nigeria Logo" 
            className="h-14 w-auto md:h-16 object-contain"
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
      </div>
    </header>
  );
};

export default Header;

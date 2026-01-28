import cmdaLogo from '@/assets/cmda-logo.png';

const Header = () => {
  return (
    <header className="w-full bg-card shadow-card border-b border-border/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Logo + Text */}
          <div className="flex items-center gap-4">
            <img 
              src={cmdaLogo}
              alt="CMDA Nigeria Logo" 
              className="h-12 w-auto md:h-14 lg:h-16 object-contain flex-shrink-0"
            />
            
            <div className="flex flex-col justify-center">
              <h1 className="text-[10px] md:text-xs lg:text-sm font-bold text-foreground leading-tight uppercase tracking-wide">
                Christian Medical And
              </h1>
              <h2 className="text-[9px] md:text-xs lg:text-sm font-bold text-foreground leading-tight uppercase tracking-wide">
                Dental Association
              </h2>
              <h3 className="text-[9px] md:text-xs lg:text-sm font-bold text-foreground leading-tight uppercase tracking-wide">
                Of Nigeria
              </h3>
              <p className="text-[8px] md:text-[10px] lg:text-xs text-muted-foreground leading-tight mt-0.5">
                (CMDA Nigeria)
              </p>
            </div>
          </div>
          
          {/* Right Logo */}
          <img 
            src="/cmda-logo-hq.png"
            alt="CMDA Nigeria Logo" 
            className="h-14 w-auto md:h-14 lg:h-16 object-contain flex-shrink-0"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-display font-semibold mb-4">
              CMDA Nigeria
            </h3>
            <p className="text-background/70 text-sm leading-relaxed">
              Christian Medical and Dental Association of Nigeria, uniting healthcare 
              professionals in faith, excellence, and service.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-display font-semibold mb-4">
              Conference Details
            </h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li>📅 30th July – 2nd August, 2026</li>
              <li>📍 Covenant University, Ota</li>
              <li>🎯 Theme: Pursuing Excellence</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-display font-semibold mb-4">
              Contact Us
            </h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li>
                <a href="mailto:conference@cmdanigeria.org" className="hover:text-accent transition-colors">
                  conference@cmdanigeria.org
                </a>
              </li>
              <li>
                <a href="tel:+2348012345678" className="hover:text-accent transition-colors">
                  +234 801 234 5678
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-background/10 text-center">
          <p className="text-sm text-background/50">
            © 2026 CMDA Nigeria. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

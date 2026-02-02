import { Calendar, MapPin, Users, CreditCard } from 'lucide-react';
import conferenceBanner from '@/assets/conference-banner.jpg';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative text-primary-foreground overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={conferenceBanner} 
          alt="CMDA Nigeria Doctors Conference" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient opacity-90" />
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 backdrop-blur-sm text-accent-foreground text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            Registration Now Open
          </p>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight">
            Doctors National{' '}
            <span className="gradient-text">Conference 2026</span>
          </h1>

          <p className="text-base md:text-lg text-accent font-display font-medium tracking-wide uppercase mb-3">
            Excellence for Impact
          </p>
          
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join over 500 Christian medical professionals for four transformative days of fellowship, learning, and spiritual renewal as we unite to advance healthcare with compassion and integrity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm md:text-base mb-8">
            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Calendar className="w-5 h-5 text-accent" />
              <span>30th July – 2nd August, 2026</span>
            </div>
            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <MapPin className="w-5 h-5 text-accent" />
              <span>Covenant University, Ota</span>
            </div>
            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <Users className="w-5 h-5 text-accent" />
              <span>500+ Expected Delegates</span>
            </div>
          </div>

          {/* Resume Payment Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/resume-payment')}
              variant="outline"
              className="bg-white/10 backdrop-blur-sm border-white/30 hover:bg-white/20 text-white gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Already Registered? Complete Payment
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import RegistrationForm from '@/components/RegistrationForm';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <RegistrationForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

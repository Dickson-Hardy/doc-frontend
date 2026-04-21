import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RegistrationFormData, PriceBreakdown } from '@/types/registration';
import { calculatePrice } from '@/lib/pricing';
import { registrationApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import StepIndicator from '@/components/StepIndicator';
import PriceSummary from '@/components/PriceSummary';
import DeadlineNotice from '@/components/DeadlineNotice';
import {
  EmailLookupStep,
  PersonalInfoStep,
  CMDAInfoStep,
  CategoryStep,
  SpouseDetailsStep,
  LogisticsStep,
  AccommodationStep,
  AbstractStep,
  ReviewStep,
} from '@/components/form-steps';
import { ArrowLeft, ArrowRight, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const steps = [
  { id: 0, title: 'Email Lookup', description: 'Find your profile' },
  { id: 1, title: 'Personal Info', description: 'Basic details' },
  { id: 2, title: 'CMDA Info', description: 'Membership' },
  { id: 3, title: 'Category', description: 'Registration type' },
  { id: 4, title: 'Logistics', description: 'Arrival & stay' },
  { id: 5, title: 'Accommodation', description: 'Room selection' },
  { id: 6, title: 'Abstracts', description: 'Presentations' },
  { id: 7, title: 'Review', description: 'Confirm details' },
];

// Zod schema for form validation
const registrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First name is required'),
  otherNames: z.string().optional(),
  age: z.coerce.number().min(18, 'Must be at least 18 years old').max(100, 'Please enter a valid age'),
  sex: z.enum(['male', 'female'], { required_error: 'Please select your sex' }),
  phone: z.string().min(1, 'Phone number is required'),
  chapter: z.string().min(1, 'Chapter is required'),
  currentLeadershipPost: z.string().optional(),
  previousLeadershipPost: z.string().optional(),
  category: z.enum(['student', 'junior-doctor', 'senior-doctor', 'doctor-with-spouse'], { required_error: 'Please select a category' }),
  chapterOfGraduation: z.string().optional(),
  spouseSurname: z.string().optional(),
  spouseFirstName: z.string().optional(),
  spouseOtherNames: z.string().optional(),
  spouseEmail: z.string().email().optional().or(z.literal('')),
  dateOfArrival: z.date({ required_error: 'Please select your arrival date' }),
  accommodationType: z.enum(['covenant-guest-house', 'pg-hostel', 'camp-a', 'temperance', 'student-free']).optional(),
  covenantRoomType: z.enum(['standard', 'elite', 'mini-suite']).optional(),
  temperanceRoomType: z.enum(['executive-chalet', 'sapphire']).optional(),
  roomSharing: z.enum(['shared', 'private']).optional(),
  roommateName: z.string().optional(),
  hasAbstract: z.boolean(),
  presentationTitle: z.string().optional(),
  abstractFileUrl: z.string().optional(),
  abstractFile: z.any().optional(),
}).superRefine((data, ctx) => {
  // If doctor-with-spouse, spouse details are required
  if (data.category === 'doctor-with-spouse') {
    if (!data.spouseSurname || !data.spouseFirstName || !data.spouseEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Spouse details are required for Doctor with Spouse package',
        path: ['spouseSurname'],
      });
    }
  }

  // If abstract is selected, both title and uploaded file URL are required
  if (data.hasAbstract) {
    if (!data.presentationTitle?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Presentation title is required',
        path: ['presentationTitle'],
      });
    }

    if (!data.abstractFileUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please upload your abstract file',
        path: ['abstractFileUrl'],
      });
    }
  }
});

const RegistrationForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberFound, setMemberFound] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: '',
      surname: '',
      firstName: '',
      otherNames: '',
      phone: '',
      chapter: '',
      currentLeadershipPost: '',
      previousLeadershipPost: '',
      hasAbstract: undefined, // User must make explicit choice
      presentationTitle: '',
      abstractFileUrl: '',
    },
    mode: 'onChange',
  });

  const { watch, trigger, handleSubmit } = form;
  const category = watch('category');

  // Calculate price based on category
  const priceBreakdown: PriceBreakdown | null = useMemo(() => {
    if (!category) return null;
    return calculatePrice(category);
  }, [category]);

  // Determine if we need to show spouse details step
  const showSpouseStep = category === 'doctor-with-spouse';
  
  // Dynamically adjust steps based on category
  const activeSteps = useMemo(() => {
    if (!showSpouseStep) {
      return steps.filter(step => step.id !== 3.5);
    }
    // Insert spouse step after category step
    const stepsWithSpouse = [...steps];
    const categoryIndex = stepsWithSpouse.findIndex(s => s.id === 3);
    if (categoryIndex !== -1 && !stepsWithSpouse.find(s => s.id === 3.5)) {
      stepsWithSpouse.splice(categoryIndex + 1, 0, {
        id: 3.5,
        title: 'Spouse Details',
        description: 'Partner information'
      });
    }
    return stepsWithSpouse;
  }, [showSpouseStep]);

  const handleMemberFound = () => {
    setMemberFound(true);
    setCurrentStep(1);
  };

  // Validate current step before proceeding
  const validateStep = async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['email'];
        break;
      case 1:
        fieldsToValidate = ['surname', 'firstName', 'age', 'sex', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['chapter'];
        break;
      case 3:
        fieldsToValidate = ['category'];
        if (category === 'junior-doctor' || category === 'senior-doctor' || category === 'doctor-with-spouse') {
          fieldsToValidate.push('chapterOfGraduation');
        }
        break;
      case 3.5:
        fieldsToValidate = ['spouseSurname', 'spouseFirstName', 'spouseEmail'];
        break;
      case 4:
        fieldsToValidate = ['dateOfArrival'];
        break;
      case 5:
        // Accommodation step - validate based on selection
        const accommodationType = watch('accommodationType');
        if (!accommodationType) {
          toast({
            title: 'Selection Required',
            description: 'Please select an accommodation option.',
            variant: 'destructive',
          });
          return false;
        }
        
        // Validate room type for covenant and temperance
        if (accommodationType === 'covenant-guest-house' && !watch('covenantRoomType')) {
          toast({
            title: 'Room Type Required',
            description: 'Please select a room type for Covenant Guest House.',
            variant: 'destructive',
          });
          return false;
        }
        if (accommodationType === 'temperance' && !watch('temperanceRoomType')) {
          toast({
            title: 'Room Type Required',
            description: 'Please select a room type for Temperance.',
            variant: 'destructive',
          });
          return false;
        }
        
        // Validate room sharing for non-student, non-camp-a, and non-no-accommodation options
        if (accommodationType !== 'student-free' && accommodationType !== 'camp-a' && accommodationType !== 'no-accommodation' && !watch('roomSharing')) {
          toast({
            title: 'Room Sharing Required',
            description: 'Please indicate if you want to share a room.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 6:
        // For abstract step, hasAbstract must be explicitly set (true or false)
        // No other validation needed - both yes and no are valid
        const hasAbstractValue = watch('hasAbstract');
        if (hasAbstractValue === undefined || hasAbstractValue === null) {
          toast({
            title: 'Selection Required',
            description: 'Please select whether you have an abstract to submit.',
            variant: 'destructive',
          });
          return false;
        }

        if (hasAbstractValue === true) {
          const title = watch('presentationTitle');
          const abstractFileUrl = watch('abstractFileUrl');

          if (!title || !title.trim()) {
            toast({
              title: 'Presentation Title Required',
              description: 'Please enter your presentation title.',
              variant: 'destructive',
            });
            return false;
          }

          if (!abstractFileUrl || !abstractFileUrl.trim()) {
            toast({
              title: 'Abstract File Required',
              description: 'Please upload your abstract file before continuing.',
              variant: 'destructive',
            });
            return false;
          }
        }

        return true; // Valid if choice is made
    }

    const isValid = await trigger(fieldsToValidate);
    return isValid;
  };

  const handleNext = async () => {
    if (currentStep === 0 && !memberFound) {
      toast({
        title: 'Email Lookup Required',
        description: 'Please lookup your email first to continue.',
        variant: 'destructive',
      });
      return;
    }

    const isValid = await validateStep();
    if (isValid) {
      const nextStepId = activeSteps[activeSteps.findIndex(s => s.id === currentStep) + 1]?.id;
      if (nextStepId !== undefined) {
        setCurrentStep(nextStepId);
      }
    }
  };

  const handlePrevious = () => {
    const prevStepId = activeSteps[activeSteps.findIndex(s => s.id === currentStep) - 1]?.id;
    if (prevStepId !== undefined) {
      setCurrentStep(prevStepId);
    }
  };

  const handlePayment = async (registrationData: RegistrationFormData, registrationId: string, paymentReference: string) => {
    if (!priceBreakdown) return;

    const response = await registrationApi.initializePayment({
      email: registrationData.email,
      amount: priceBreakdown.total,
      reference: paymentReference,
      metadata: {
        custom_fields: [
          {
            display_name: 'Registration ID',
            variable_name: 'registration_id',
            value: registrationId,
          },
          {
            display_name: 'Full Name',
            variable_name: 'full_name',
            value: `${registrationData.firstName} ${registrationData.surname}`,
          },
          {
            display_name: 'Category',
            variable_name: 'category',
            value: priceBreakdown.categoryLabel,
          },
        ],
      },
    });

    const authorizationUrl = response?.data?.authorization_url;
    if (!authorizationUrl) {
      throw new Error('Payment initialization failed: no authorization URL returned');
    }

    window.location.href = authorizationUrl;
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    
    try {
      // Submit registration to backend
      const response = await registrationApi.submit(data);
      
      toast({
        title: 'Registration Submitted!',
        description: 'Redirecting to payment...',
      });

      // Initialize payment with reference from backend
      await handlePayment(data, response.registrationId, response.reference);
      
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <EmailLookupStep form={form} onMemberFound={handleMemberFound} />;
      case 1:
        return <PersonalInfoStep form={form} />;
      case 2:
        return <CMDAInfoStep form={form} />;
      case 3:
        return <CategoryStep form={form} />;
      case 3.5:
        return <SpouseDetailsStep form={form} />;
      case 4:
        return <LogisticsStep form={form} />;
      case 5:
        return <AccommodationStep form={form} />;
      case 6:
        return <AbstractStep form={form} />;
      case 7:
        return <ReviewStep form={form} totalAmount={priceBreakdown?.total || 0} />;
      default:
        return null;
    }
  };

  const currentStepIndex = activeSteps.findIndex(s => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === activeSteps.length - 1;

  return (
    <section id="registration" className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            Conference Registration
          </h2>
          <p className="text-muted-foreground mb-4">
            Complete the form below to register for the CMDA Nigeria Doctors National Conference 2026
          </p>
          
          {/* Resume Payment Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={() => navigate('/resume-payment')}
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <CreditCard className="w-4 h-4" />
              Already Registered? Complete Payment
            </Button>
          </div>
        </div>

        <DeadlineNotice />

        {currentStep > 0 && <StepIndicator steps={activeSteps.filter(s => s.id > 0)} currentStep={currentStep} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Fixed height container to prevent form jumping */}
              <div className="min-h-[500px]">
                {renderStep()}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>

                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || !priceBreakdown}
                    className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {currentStep > 0 && <PriceSummary priceBreakdown={priceBreakdown} />}
              
              <div className="mt-6 form-section">
                <h4 className="font-semibold text-foreground mb-3">Need Help?</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Contact the registration team if you have any questions.
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Email: </span>
                  <a href="mailto:conference@cmdanigeria.org" className="text-primary hover:underline">
                    conference@cmdanigeria.org
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegistrationForm;

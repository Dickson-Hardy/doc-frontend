import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { memberApi } from '@/services/api';

interface EmailLookupStepProps {
  form: UseFormReturn<RegistrationFormData>;
  onMemberFound: () => void;
}

const EmailLookupStep = ({ form, onMemberFound }: EmailLookupStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const [isLooking, setIsLooking] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const email = watch('email');

  const handleLookup = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLooking(true);
    setErrorMessage('');
    setLookupStatus('idle');

    try {
      const memberData = await memberApi.lookupByEmail(email);

      if (memberData) {
        // Auto-populate form with member data
        setValue('surname', memberData.surname);
        setValue('firstName', memberData.firstName);
        setValue('otherNames', memberData.otherNames || '');
        setValue('age', memberData.age);
        setValue('sex', memberData.sex);
        setValue('phone', memberData.phone);
        setValue('chapter', memberData.chapter);
        setValue('isCmdaMember', memberData.isCmdaMember);
        setValue('currentLeadershipPost', memberData.currentLeadershipPost || '');
        setValue('previousLeadershipPost', memberData.previousLeadershipPost || '');
        setValue('category', memberData.category);
        setValue('chapterOfGraduation', memberData.chapterOfGraduation || '');
        setValue('yearsInPractice', memberData.yearsInPractice);

        setLookupStatus('found');
        
        // Auto-proceed after 1.5 seconds
        setTimeout(() => {
          onMemberFound();
        }, 1500);
      } else {
        setLookupStatus('not-found');
        setErrorMessage('You must be a registered CMDA member to attend this conference.');
      }
    } catch (error) {
      setErrorMessage('Failed to lookup member. Please try again.');
      console.error('Lookup error:', error);
    } finally {
      setIsLooking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  return (
    <div className="form-section animate-scale-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
          Welcome to Conference Registration
        </h2>
        <p className="text-muted-foreground">
          Enter your email address to retrieve your member information
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <p className="font-semibold mb-1">CMDA Members Only</p>
          <p className="text-sm">
            This conference is exclusively for registered CMDA members. 
            If you're not a member yet, please{' '}
            <a 
              href="https://cmdanigeria.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-900"
            >
              register at cmdanigeria.net
            </a>
            {' '}first.
          </p>
        </AlertDescription>
      </Alert>

      <div className="max-w-md mx-auto space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              placeholder="Enter your registered email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address'
                }
              })}
              onKeyPress={handleKeyPress}
              disabled={isLooking || lookupStatus === 'found'}
              className="bg-background flex-1"
            />
            <Button
              type="button"
              onClick={handleLookup}
              disabled={isLooking || lookupStatus === 'found' || !email}
              className="gap-2"
            >
              {isLooking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking up...
                </>
              ) : lookupStatus === 'found' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Found
                </>
              ) : (
                'Lookup'
              )}
            </Button>
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {lookupStatus === 'found' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Member found! Loading your information...
            </AlertDescription>
          </Alert>
        )}

        {lookupStatus === 'not-found' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p className="font-semibold">Email not found in our member database.</p>
              <p>
                You need to be a registered CMDA member to attend this conference. 
                Please register as a member first.
              </p>
              <Button
                type="button"
                variant="default"
                className="w-full mt-2"
                onClick={() => window.open('https://cmdanigeria.net', '_blank')}
              >
                Register as CMDA Member
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && lookupStatus === 'idle' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Not a CMDA member yet?{' '}
            <a 
              href="https://cmdanigeria.net" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Register here to become a member
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailLookupStep;

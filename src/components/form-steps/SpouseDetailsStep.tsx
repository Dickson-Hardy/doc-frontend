import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Info } from 'lucide-react';

interface SpouseDetailsStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const SpouseDetailsStep = ({ form }: SpouseDetailsStepProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">
            Spouse Information
          </h3>
          <p className="text-sm text-muted-foreground">
            Please provide your spouse's details
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The Doctor with Spouse package includes accommodation and meals for both you and your spouse throughout the conference.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="spouseSurname" className="text-foreground">
            Spouse Surname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="spouseSurname"
            placeholder="Enter spouse's surname"
            {...register('spouseSurname', { 
              required: 'Spouse surname is required' 
            })}
            className="bg-background"
          />
          {errors.spouseSurname && (
            <p className="text-sm text-destructive">{errors.spouseSurname.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="spouseFirstName" className="text-foreground">
            Spouse First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="spouseFirstName"
            placeholder="Enter spouse's first name"
            {...register('spouseFirstName', { 
              required: 'Spouse first name is required' 
            })}
            className="bg-background"
          />
          {errors.spouseFirstName && (
            <p className="text-sm text-destructive">{errors.spouseFirstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="spouseOtherNames" className="text-foreground">
            Spouse Other Names
          </Label>
          <Input
            id="spouseOtherNames"
            placeholder="Enter spouse's other names (optional)"
            {...register('spouseOtherNames')}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="spouseEmail" className="text-foreground">
            Spouse Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="spouseEmail"
            type="email"
            placeholder="Enter spouse's email"
            {...register('spouseEmail', { 
              required: 'Spouse email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
            })}
            className="bg-background"
          />
          {errors.spouseEmail && (
            <p className="text-sm text-destructive">{errors.spouseEmail.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpouseDetailsStep;

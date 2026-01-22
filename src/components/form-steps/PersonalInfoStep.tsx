import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PersonalInfoStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const PersonalInfoStep = ({ form }: PersonalInfoStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const sex = watch('sex');

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
        Personal Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="surname" className="text-foreground">
            Surname <span className="text-destructive">*</span>
          </Label>
          <Input
            id="surname"
            placeholder="Enter your surname"
            {...register('surname', { required: 'Surname is required' })}
            className="bg-background"
          />
          {errors.surname && (
            <p className="text-sm text-destructive">{errors.surname.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-foreground">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            placeholder="Enter your first name"
            {...register('firstName', { required: 'First name is required' })}
            className="bg-background"
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="otherNames" className="text-foreground">
            Other Names
          </Label>
          <Input
            id="otherNames"
            placeholder="Enter other names (optional)"
            {...register('otherNames')}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="text-foreground">
            Age <span className="text-destructive">*</span>
          </Label>
          <Input
            id="age"
            type="number"
            min={18}
            max={100}
            placeholder="Enter your age"
            {...register('age', { 
              required: 'Age is required',
              min: { value: 18, message: 'Must be at least 18 years old' },
              max: { value: 100, message: 'Please enter a valid age' }
            })}
            className="bg-background"
          />
          {errors.age && (
            <p className="text-sm text-destructive">{errors.age.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sex" className="text-foreground">
            Sex <span className="text-destructive">*</span>
          </Label>
          <Select value={sex} onValueChange={(value) => setValue('sex', value as 'male' | 'female')}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select your sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.sex && (
            <p className="text-sm text-destructive">{errors.sex.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
            })}
            className="bg-background"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="phone" className="text-foreground">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your phone number (e.g., 08012345678)"
            {...register('phone', { 
              required: 'Phone number is required',
              pattern: {
                value: /^[0-9+\-\s()]+$/,
                message: 'Please enter a valid phone number'
              }
            })}
            className="bg-background"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoStep;

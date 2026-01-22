import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData, Category, YearsInPractice } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Stethoscope, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const categoryOptions = [
  { 
    value: 'student' as Category, 
    label: 'Student', 
    description: 'Medical/Dental students',
    icon: GraduationCap,
    price: '₦11,000'
  },
  { 
    value: 'doctor' as Category, 
    label: 'Doctor', 
    description: 'Qualified medical practitioners',
    icon: Stethoscope,
    price: 'From ₦30,000'
  },
  { 
    value: 'doctor-with-spouse' as Category, 
    label: 'Doctor with Spouse', 
    description: 'Doctor attending with spouse',
    icon: Users,
    price: '₦85,000'
  },
];

const CategoryStep = ({ form }: CategoryStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const category = watch('category');
  const yearsInPractice = watch('yearsInPractice');

  const showDoctorFields = category === 'doctor' || category === 'doctor-with-spouse';

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
        Category & Professional Details
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-foreground">
            Registration Category <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Your category has been pre-selected based on your member profile. You can change it if needed.
          </p>
          <RadioGroup
            value={category}
            onValueChange={(value) => setValue('category', value as Category)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      'flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all',
                      category === option.value
                        ? 'border-primary bg-primary/5 shadow-card'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn(
                      'w-10 h-10 mb-3',
                      category === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="font-semibold text-foreground">{option.label}</span>
                    <span className="text-sm text-muted-foreground text-center mt-1">
                      {option.description}
                    </span>
                    <span className={cn(
                      'mt-3 px-3 py-1 rounded-full text-sm font-medium',
                      category === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {option.price}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>

        {showDoctorFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="chapterOfGraduation" className="text-foreground">
                Chapter of Graduation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="chapterOfGraduation"
                placeholder="Enter your chapter of graduation"
                {...register('chapterOfGraduation', { 
                  required: showDoctorFields ? 'Chapter of graduation is required' : false 
                })}
                className="bg-background"
              />
              {errors.chapterOfGraduation && (
                <p className="text-sm text-destructive">{errors.chapterOfGraduation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsInPractice" className="text-foreground">
                Years in Practice <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={yearsInPractice} 
                onValueChange={(value) => setValue('yearsInPractice', value as YearsInPractice)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select years in practice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less-than-5">Less than 5 years (₦30,000)</SelectItem>
                  <SelectItem value="5-and-above">5 years and above (₦50,000)</SelectItem>
                </SelectContent>
              </Select>
              {errors.yearsInPractice && (
                <p className="text-sm text-destructive">{errors.yearsInPractice.message}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryStep;

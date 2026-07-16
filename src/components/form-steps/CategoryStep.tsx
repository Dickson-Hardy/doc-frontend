import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData, Category } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GraduationCap, Stethoscope, Users, Monitor } from 'lucide-react';
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
    value: 'junior-doctor' as Category, 
    label: 'Junior Doctor', 
    description: '0-5 years in practice',
    icon: Stethoscope,
    price: '₦30,000'
  },
  { 
    value: 'senior-doctor' as Category, 
    label: 'Senior Doctor', 
    description: '5+ years in practice',
    icon: Stethoscope,
    price: '₦50,000'
  },
  { 
    value: 'doctor-with-spouse' as Category, 
    label: 'Doctor with Spouse', 
    description: 'Doctor attending with spouse',
    icon: Users,
    price: '₦85,000'
  },
];

const virtualCategoryOptions = [
  { 
    value: 'virtual-student' as Category, 
    label: 'Virtual - Student', 
    description: 'Student attending online',
    icon: Monitor,
    price: '₦11,000'
  },
  { 
    value: 'virtual-junior-doctor' as Category, 
    label: 'Virtual - Junior Doctor', 
    description: 'Junior doctor attending online',
    icon: Monitor,
    price: '₦30,000'
  },
  { 
    value: 'virtual-senior-doctor' as Category, 
    label: 'Virtual - Senior Doctor', 
    description: 'Senior doctor attending online',
    icon: Monitor,
    price: '₦50,000'
  },
];

const CategoryStep = ({ form }: CategoryStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const category = watch('category');

  const showDoctorFields = category === 'junior-doctor' || category === 'senior-doctor' || category === 'doctor-with-spouse' || category === 'virtual-junior-doctor' || category === 'virtual-senior-doctor';
  const isVirtual = category?.startsWith('virtual-');

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
        Category & Professional Details
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-foreground">
            Participation Mode <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Choose to attend in-person at Covenant University or join virtually online.
          </p>
        </div>

        {/* In-Person Options */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold text-base">
            In-Person Attendance
          </Label>
          <RadioGroup
            value={category}
            onValueChange={(value) => setValue('category', value as Category)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
        </div>

        {/* Virtual Options */}
        <div className="space-y-3 pt-4 border-t border-border">
          <Label className="text-foreground font-semibold text-base">
            Virtual Attendance
          </Label>
          <p className="text-sm text-muted-foreground">
            Join the conference online from anywhere. A meeting link will be sent before the event.
          </p>
          <RadioGroup
            value={category}
            onValueChange={(value) => setValue('category', value as Category)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {virtualCategoryOptions.map((option) => {
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
                      'flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer transition-all',
                      category === option.value
                        ? 'border-green-500 bg-green-50 shadow-card'
                        : 'border-border hover:border-green-500/50 hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn(
                      'w-8 h-8 mb-2',
                      category === option.value ? 'text-green-600' : 'text-muted-foreground'
                    )} />
                    <span className="font-semibold text-foreground text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {option.description}
                    </span>
                    <span className={cn(
                      'mt-2 px-3 py-1 rounded-full text-sm font-medium',
                      category === option.value
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {option.price}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}

        {showDoctorFields && (
          <div className="grid grid-cols-1 gap-6 pt-4 border-t border-border animate-fade-in">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryStep;

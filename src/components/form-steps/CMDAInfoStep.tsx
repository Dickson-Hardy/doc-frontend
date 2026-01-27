import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CMDAInfoStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const CMDAInfoStep = ({ form }: CMDAInfoStepProps) => {
  const { register, formState: { errors } } = form;

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
        CMDA Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="chapter" className="text-foreground">
            Chapter <span className="text-destructive">*</span>
          </Label>
          <Input
            id="chapter"
            placeholder="Enter your CMDA chapter"
            {...register('chapter', { required: 'Chapter is required' })}
            className="bg-background"
          />
          {errors.chapter && (
            <p className="text-sm text-destructive">{errors.chapter.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentLeadershipPost" className="text-foreground">
            Current Leadership Post
          </Label>
          <Input
            id="currentLeadershipPost"
            placeholder="Enter current leadership post (optional)"
            {...register('currentLeadershipPost')}
            className="bg-background"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="previousLeadershipPost" className="text-foreground">
            Previous CMDA Leadership Post(s)
          </Label>
          <Textarea
            id="previousLeadershipPost"
            placeholder="Enter previous leadership positions (optional)"
            rows={3}
            {...register('previousLeadershipPost')}
            className="bg-background resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default CMDAInfoStep;

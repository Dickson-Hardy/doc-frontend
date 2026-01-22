import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CMDAInfoStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const CMDAInfoStep = ({ form }: CMDAInfoStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const isCmdaMember = watch('isCmdaMember');

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

        <div className="space-y-3">
          <Label className="text-foreground">
            Are you a registered CMDA member? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={isCmdaMember === true ? 'yes' : isCmdaMember === false ? 'no' : ''}
            onValueChange={(value) => setValue('isCmdaMember', value === 'yes')}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="member-yes" />
              <Label htmlFor="member-yes" className="font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="member-no" />
              <Label htmlFor="member-no" className="font-normal cursor-pointer">No</Label>
            </div>
          </RadioGroup>
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

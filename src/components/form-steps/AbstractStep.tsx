import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUpload } from '@/components/ui/file-upload';
import { type UploadResult } from '@/lib/blob-upload';

interface AbstractStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const AbstractStep = ({ form }: AbstractStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const hasAbstract = watch('hasAbstract');

  const handleUploadComplete = (result: UploadResult) => {
    setValue('abstractFileUrl', result.url, { shouldValidate: true });
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setValue('abstractFileUrl', '', { shouldValidate: true });
  };

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">6</span>
        Academic Contribution
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-foreground">
            Do you have any Abstracts / Presentations to submit? <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            value={hasAbstract === true ? 'yes' : hasAbstract === false ? 'no' : ''}
            onValueChange={(value) => {
              const selectedHasAbstract = value === 'yes';
              setValue('hasAbstract', selectedHasAbstract, { shouldValidate: true });

              if (!selectedHasAbstract) {
                setValue('presentationTitle', '', { shouldValidate: true });
                setValue('abstractFileUrl', '', { shouldValidate: true });
              }
            }}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="abstract-yes" />
              <Label htmlFor="abstract-yes" className="font-normal cursor-pointer">
                Yes, I have a presentation
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="abstract-no" />
              <Label htmlFor="abstract-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
          {errors.hasAbstract && (
            <p className="text-sm text-destructive">Please select whether you have an abstract to submit</p>
          )}
        </div>

        {hasAbstract && (
          <div className="grid grid-cols-1 gap-6 pt-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="presentationTitle" className="text-foreground">
                Presentation Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="presentationTitle"
                placeholder="Enter the title of your presentation"
                {...register('presentationTitle', {
                  required: hasAbstract ? 'Presentation title is required' : false
                })}
                className="bg-background"
              />
              {errors.presentationTitle && (
                <p className="text-sm text-destructive">{errors.presentationTitle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">
                Upload Abstract <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Upload your abstract or presentation file. Supported formats: PDF, DOC, DOCX (max 3MB)
              </p>
              <FileUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                accept=".pdf,.doc,.docx"
                maxSize={3 * 1024 * 1024} // 3MB
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbstractStep;

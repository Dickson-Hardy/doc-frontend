import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText } from 'lucide-react';
import { useState, useCallback } from 'react';

interface AbstractStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const AbstractStep = ({ form }: AbstractStepProps) => {
  const { register, formState: { errors }, setValue, watch } = form;
  const hasAbstract = watch('hasAbstract');
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue('abstractFile', file);
      setFileName(file.name);
    }
  }, [setValue]);

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</span>
        Academic Contribution
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-foreground">
            Do you have any Abstracts / Presentations to submit?
          </Label>
          <RadioGroup
            value={hasAbstract === true ? 'yes' : hasAbstract === false ? 'no' : ''}
            onValueChange={(value) => setValue('hasAbstract', value === 'yes')}
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
        </div>

        {hasAbstract && (
          <div className="grid grid-cols-1 gap-6 pt-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="presentationTitle" className="text-foreground">
                Presentation Title
              </Label>
              <Input
                id="presentationTitle"
                placeholder="Enter the title of your presentation"
                {...register('presentationTitle')}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abstractFile" className="text-foreground">
                Upload Abstract (PDF/DOC)
              </Label>
              <div className="relative">
                <input
                  type="file"
                  id="abstractFile"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <label
                  htmlFor="abstractFile"
                  className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  {fileName ? (
                    <div className="flex items-center gap-3 text-foreground">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">{fileName}</p>
                        <p className="text-sm text-muted-foreground">Click to change file</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-foreground font-medium">Click to upload abstract</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF or DOC files (max 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbstractStep;

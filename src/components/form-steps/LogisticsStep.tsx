import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData, AccommodationOption } from '@/types/registration';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Building, Home, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LogisticsStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const accommodationOptions = [
  { value: 'on-campus' as AccommodationOption, label: 'On-campus', description: 'Stay within the university premises', icon: Building },
  { value: 'off-campus' as AccommodationOption, label: 'Off-campus', description: 'Arrange your own accommodation', icon: Home },
  { value: 'no-accommodation' as AccommodationOption, label: 'No accommodation', description: 'Not requiring accommodation', icon: X },
];

const LogisticsStep = ({ form }: LogisticsStepProps) => {
  const { formState: { errors }, setValue, watch } = form;
  const dateOfArrival = watch('dateOfArrival');
  const accommodationOption = watch('accommodationOption');

  // Conference dates
  const conferenceStart = new Date('2026-07-30');
  const conferenceEnd = new Date('2026-08-02');

  return (
    <div className="form-section animate-scale-in">
      <h2 className="text-xl font-display font-semibold text-foreground mb-6 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
        Conference Logistics
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-foreground">
            Date of Arrival <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal bg-background',
                  !dateOfArrival && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateOfArrival ? format(dateOfArrival, 'PPP') : 'Pick your arrival date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateOfArrival}
                onSelect={(date) => date && setValue('dateOfArrival', date)}
                disabled={(date) =>
                  date < new Date('2026-07-28') || date > conferenceEnd
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Conference runs from July 30 – August 2, 2026
          </p>
          {errors.dateOfArrival && (
            <p className="text-sm text-destructive">{errors.dateOfArrival.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">
            Accommodation Option <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={accommodationOption} 
            onValueChange={(value) => setValue('accommodationOption', value as AccommodationOption)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select accommodation preference" />
            </SelectTrigger>
            <SelectContent>
              {accommodationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accommodationOption && (
            <p className="text-sm text-destructive">{errors.accommodationOption.message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticsStep;

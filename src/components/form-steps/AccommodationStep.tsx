import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface AccommodationStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

const AccommodationStep = ({ form }: AccommodationStepProps) => {
  const { watch, setValue, register, formState: { errors } } = form;
  const category = watch('category');
  const accommodationType = watch('accommodationType');
  const roomSharing = watch('roomSharing');
  const covenantRoomType = watch('covenantRoomType');
  const temperanceRoomType = watch('temperanceRoomType');

  // Show student accommodation option only for students
  const isStudent = category === 'student';

  return (
    <div className="form-section space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Accommodation Selection</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred accommodation option for the conference
        </p>
      </div>

      {/* Accommodation Type Selection */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">
          Accommodation Options <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          onValueChange={(value) => setValue('accommodationType', value as any)}
          value={accommodationType || ''}
          className="space-y-3"
        >
          {/* Option 1: Covenant Guest House */}
          <Card className="p-4 hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="covenant-guest-house" id="covenant" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="covenant" className="font-semibold text-foreground cursor-pointer">
                    Option 1: Closest to Venue (Opposite Conference Hall)
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">Covenant Guest House</p>
                </div>
              </div>
              {accommodationType === 'covenant-guest-house' && (
                <div className="ml-7 space-y-2">
                  <RadioGroup 
                    onValueChange={(value) => setValue('covenantRoomType', value as any)} 
                    value={covenantRoomType || ''} 
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="covenant-standard" />
                      <label htmlFor="covenant-standard" className="text-sm cursor-pointer">
                        Standard Room – ₦20,000 / night
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="elite" id="covenant-elite" />
                      <label htmlFor="covenant-elite" className="text-sm cursor-pointer">
                        Elite Room – ₦30,000 / night
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mini-suite" id="covenant-suite" />
                      <label htmlFor="covenant-suite" className="text-sm cursor-pointer">
                        Mini Suite – ₦45,000 / night
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </Card>

          {/* Option 2: PG Hostel */}
          <Card className="p-4 hover:border-primary transition-colors">
            <div className="flex items-start gap-3">
              <RadioGroupItem value="pg-hostel" id="pg-hostel" className="mt-1" />
              <div className="flex-1">
                <label htmlFor="pg-hostel" className="font-semibold text-foreground cursor-pointer">
                  Option 2: Near Venue (5–7 minutes walk)
                </label>
                <p className="text-sm text-muted-foreground mt-1">PG Hostel – Approx. 500m</p>
                <p className="text-sm text-foreground mt-1">Standard Room – ₦15,000 / night</p>
              </div>
            </div>
          </Card>

          {/* Option 3: Camp A */}
          <Card className="p-4 hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="camp-a" id="camp-a" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="camp-a" className="font-semibold text-foreground cursor-pointer">
                    Option 3: Budget Option (10–15 minutes walk)
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">Camp A – Approx. 1km</p>
                  <p className="text-sm text-foreground mt-1">Standard Bed – ₦9,500 / night</p>
                </div>
              </div>
              {accommodationType === 'camp-a' && (
                <div className="ml-7 space-y-3">
                  <Label className="text-sm font-semibold">Room Pairing Preference (Optional)</Label>
                  <Input
                    placeholder="Enter full name of person you want to share with"
                    {...register('roommateName')}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have someone you want to share with, enter their full name. If not, leave blank and we will pair you.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Option 4: Temperance */}
          <Card className="p-4 hover:border-primary transition-colors">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="temperance" id="temperance" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="temperance" className="font-semibold text-foreground cursor-pointer">
                    Option 4: Premium & Quiet (Short drive)
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">Temperance (Bells University Guest House) – Approx. 3km</p>
                </div>
              </div>
              {accommodationType === 'temperance' && (
                <div className="ml-7 space-y-2">
                  <RadioGroup 
                    onValueChange={(value) => setValue('temperanceRoomType', value as any)} 
                    value={temperanceRoomType || ''} 
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="executive-chalet" id="temp-chalet" />
                      <label htmlFor="temp-chalet" className="text-sm cursor-pointer">
                        Executive Chalet – ₦25,000 / night
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sapphire" id="temp-sapphire" />
                      <label htmlFor="temp-sapphire" className="text-sm cursor-pointer">
                        Sapphire Room – ₦40,000 / night
                      </label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          </Card>

          {/* Option 5: Student Accommodation (Only for students) */}
          {isStudent && (
            <Card className="p-4 hover:border-primary transition-colors border-green-200 bg-green-50">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="student-free" id="student-free" className="mt-1" />
                <div className="flex-1">
                  <label htmlFor="student-free" className="font-semibold text-foreground cursor-pointer">
                    Option 5: Students Only
                  </label>
                  <p className="text-sm text-green-700 font-medium mt-1">Free Student Accommodation</p>
                </div>
              </div>
            </Card>
          )}
        </RadioGroup>
        {errors.accommodationType && (
          <p className="text-sm text-destructive">{errors.accommodationType.message}</p>
        )}
      </div>

      {/* Room Sharing Option (Not for student free accommodation or camp-a) */}
      {accommodationType && accommodationType !== 'student-free' && accommodationType !== 'camp-a' && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Room Sharing <span className="text-destructive">*</span>
          </Label>
          <RadioGroup
            onValueChange={(value) => setValue('roomSharing', value as any)}
            value={roomSharing || ''}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shared" id="shared" />
              <label htmlFor="shared" className="text-sm cursor-pointer">
                Yes, I want to share a room
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="private" />
              <label htmlFor="private" className="text-sm cursor-pointer">
                No, I want a private room
              </label>
            </div>
          </RadioGroup>
          {errors.roomSharing && (
            <p className="text-sm text-destructive">{errors.roomSharing.message}</p>
          )}

          {/* Shared Room Price Guide */}
          {roomSharing === 'shared' && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-2">Shared Room Pricing (Per Person)</p>
                  <div className="text-sm text-blue-800 space-y-1">
                    {accommodationType === 'covenant-guest-house' && (
                      <>
                        <p>• Standard Room: ₦10,000 per person</p>
                        <p>• Elite Room: ₦15,000 per person</p>
                        <p>• Mini Suite: ₦22,500 per person</p>
                      </>
                    )}
                    {accommodationType === 'pg-hostel' && (
                      <p>• Standard Room: ₦7,500 per person</p>
                    )}
                    {accommodationType === 'temperance' && (
                      <>
                        <p>• Executive Chalet: ₦12,500 per person</p>
                        <p>• Sapphire Room: ₦20,000 per person</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Room Pairing Preference */}
          {roomSharing === 'shared' && (
            <div className="space-y-2">
              <Label htmlFor="roommateName">Room Pairing Preference (Optional)</Label>
              <Input
                id="roommateName"
                placeholder="Enter full name of person you want to share with"
                {...register('roommateName')}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                If you have someone you want to share with, enter their full name. If not, leave blank and we will pair you.
              </p>
              {errors.roommateName && (
                <p className="text-sm text-destructive">{errors.roommateName.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Important Notice */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex gap-2">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 space-y-2">
            <p className="font-semibold">Important Information:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Accommodation is allocated on a first-come, first-served basis.</li>
              <li>Room sharing is optional and pairing will be done where applicable.</li>
              {isStudent && <li>Students who select the Student Accommodation option will be provided free accommodation.</li>}
              <li>Accommodation fees cover per night stay only.</li>
              <li>Final confirmation will be sent after registration review.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccommodationStep;

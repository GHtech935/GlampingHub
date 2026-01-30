import { useState } from "react"
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { usePathname, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface MyDetailsSectionProps {
  register: UseFormRegister<any>
  errors: FieldErrors
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
  locale: string
  isLoggedIn?: boolean
}

export function GlampingMyDetailsSection({
  register,
  errors,
  watch,
  setValue,
  locale,
  isLoggedIn = false,
}: MyDetailsSectionProps) {
  const [showPassword, setShowPassword] = useState(false)
  const t = useTranslations('booking')
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Build return URL with current pathname and all search params
  const returnUrl = `${pathname}?${searchParams.toString()}`
  const loginUrl = `/login?returnUrl=${encodeURIComponent(returnUrl)}`

  // Get current email for logged-in display
  const currentEmail = watch('email')

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Primary header */}
      <div className="bg-primary text-white px-6 py-3">
        <h2 className="text-lg font-semibold">{t('myDetails')}</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Login notification */}
        {isLoggedIn ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="text-green-700 text-sm">
              <span className="font-medium">
                {locale === 'vi' ? 'Đã đăng nhập với ' : 'Logged in as '}
              </span>
              <span className="font-semibold">{currentEmail}</span>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-start gap-2">
            <div className="text-green-700 text-sm">
              <span className="font-medium">{t('existingUser')} </span>
              <Link href={loginUrl} className="text-green-800 underline hover:no-underline">
                {t('logIn')}
              </Link>
            </div>
          </div>
        )}

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="required">
            {t('email')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder={t('emailPlaceholder')}
            className={`${errors.email ? "border-red-500" : ""} ${isLoggedIn ? "bg-gray-100 cursor-not-allowed" : ""}`}
            disabled={isLoggedIn}
          />
          {errors.email && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email.message as string}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('emailConfirmation')}
          </p>
        </div>

        {/* First Name and Last Name in one row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">
              {t('firstName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              {...register("firstName")}
              className={`${errors.firstName ? "border-red-500" : ""} ${isLoggedIn ? "bg-gray-100 cursor-not-allowed" : ""}`}
              disabled={isLoggedIn}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.firstName.message as string}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">
              {t('lastName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              {...register("lastName")}
              className={`${errors.lastName ? "border-red-500" : ""} ${isLoggedIn ? "bg-gray-100 cursor-not-allowed" : ""}`}
              disabled={isLoggedIn}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.lastName.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Country and Mobile phone in one row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Country of residence */}
          <div className="space-y-2">
            <Label htmlFor="country">
              {t('country')} <span className="text-red-500">*</span>
            </Label>
            <Select
              defaultValue="Vietnam"
              onValueChange={(value) => setValue("country", value)}
            >
              <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vietnam">Vietnam</SelectItem>
                <SelectItem value="Thailand">Thailand</SelectItem>
                <SelectItem value="Singapore">Singapore</SelectItem>
                <SelectItem value="Malaysia">Malaysia</SelectItem>
                <SelectItem value="Indonesia">Indonesia</SelectItem>
                <SelectItem value="Philippines">Philippines</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.country.message as string}
              </p>
            )}
          </div>

          {/* Mobile phone number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              {t('phone')} <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Select
                defaultValue="+84"
                onValueChange={(value) => setValue("phoneCountryCode", value)}
              >
                <SelectTrigger className="w-[100px] flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+84">🇻🇳 +84</SelectItem>
                  <SelectItem value="+66">🇹🇭 +66</SelectItem>
                  <SelectItem value="+65">🇸🇬 +65</SelectItem>
                  <SelectItem value="+60">🇲🇾 +60</SelectItem>
                  <SelectItem value="+62">🇮🇩 +62</SelectItem>
                  <SelectItem value="+63">🇵🇭 +63</SelectItem>
                  <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  <SelectItem value="+1">🇺🇸 +1</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="phoneNumber"
                type="tel"
                {...register("phoneNumber")}
                placeholder="912 345 678"
                className={`flex-1 min-w-0 ${errors.phoneNumber ? "border-red-500" : ""}`}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.phoneNumber.message as string}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('phoneHelper')}
            </p>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">
            {t('dateOfBirth')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...register("dateOfBirth")}
            className={errors.dateOfBirth ? "border-red-500" : ""}
          />
          {errors.dateOfBirth && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.dateOfBirth.message as string}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('dateOfBirthHelper')}
          </p>
        </div>

        {/* Social Media URL */}
        <div className="space-y-2">
          <Label htmlFor="socialMediaUrl">
            {t('socialMediaUrl')}
          </Label>
          <Input
            id="socialMediaUrl"
            type="text"
            {...register("socialMediaUrl")}
            placeholder="https://facebook.com/yourprofile hoặc https://instagram.com/yourprofile"
            className={errors.socialMediaUrl ? "border-red-500" : ""}
          />
          {errors.socialMediaUrl && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.socialMediaUrl.message as string}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('socialMediaUrlHelper')}
          </p>
        </div>

        {/* Photo Consent */}
        <div className="space-y-2">
          <Label htmlFor="photoConsent">
            {t('photoConsent')}
          </Label>
          <Select
            defaultValue="true"
            onValueChange={(value) => setValue("photoConsent", value === "true")}
          >
            <SelectTrigger className={errors.photoConsent ? "border-red-500" : ""}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t('photoConsentOptions.agree')}</SelectItem>
              <SelectItem value="false">{t('photoConsentOptions.disagree')}</SelectItem>
            </SelectContent>
          </Select>
          {errors.photoConsent && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.photoConsent.message as string}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('photoConsentHelper')}
          </p>
        </div>

        {/* Referral Source */}
        <div className="space-y-2">
          <Label>
            {t('referralSource')}
          </Label>
          <div className="space-y-2">
            {[
              { value: 'facebook', label: t('referralSourceOptions.facebook') },
              { value: 'instagram', label: t('referralSourceOptions.instagram') },
              { value: 'tiktok', label: t('referralSourceOptions.tiktok') },
              { value: 'referral', label: t('referralSourceOptions.referral') },
              { value: 'returning', label: t('referralSourceOptions.returning') },
              { value: 'panorama', label: t('referralSourceOptions.panorama') },
              { value: 'google', label: t('referralSourceOptions.google') },
              { value: 'other', label: t('referralSourceOptions.other') },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`referralSource-${option.value}`}
                  value={option.value}
                  {...register("referralSource")}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <Label htmlFor={`referralSource-${option.value}`} className="font-normal cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
            {watch('referralSource') === 'other' && (
              <Input
                type="text"
                placeholder="Khác..."
                className="mt-2"
              />
            )}
          </div>
          {errors.referralSource && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.referralSource.message as string}
            </p>
          )}
        </div>

        {/* Password (optional account creation) - only show when not logged in */}
        {!isLoggedIn && (
          <div className="mt-6 pt-6 border-t">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-sm text-blue-600 hover:underline"
              >
                {showPassword ? t('hidePasswordButton') : t('addPasswordButton')}
              </button>

              {showPassword && (
                <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                  <p className="text-sm text-muted-foreground">
                    {t('createAccountDescription')}
                  </p>
                  <Label htmlFor="createPassword">{t('passwordLabel')}</Label>
                  <Input
                    id="createPassword"
                    type="password"
                    {...register("createPassword")}
                    placeholder={t('passwordPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('passwordRequirement')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

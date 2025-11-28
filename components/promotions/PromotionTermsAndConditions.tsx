import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PromotionTermsAndConditionsProps {
  termsAndConditions?: string | null;
}

export function PromotionTermsAndConditions({
  termsAndConditions,
}: PromotionTermsAndConditionsProps) {
  // Don't render if no terms provided
  if (!termsAndConditions) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms & Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
            {termsAndConditions}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

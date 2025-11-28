import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PromotionProgramSummaryProps {
  name: string;
  summaryTitle?: string | null;
  summaryBody?: string | null;
  headlineBenefit?: string | null;
  summaryBullets?: string[];
  startDate?: string | null;
  endDate?: string | null;
  pdfUrl?: string | null;
}

export function PromotionProgramSummary({
  name,
  summaryTitle,
  summaryBody,
  headlineBenefit,
  summaryBullets,
  startDate,
  endDate,
  pdfUrl,
}: PromotionProgramSummaryProps) {
  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;
  const formattedEndDate = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <Card className="relative shadow-md border-2">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 pointer-events-none rounded-lg" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {summaryTitle || name}
              </h2>
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                Market Promo
              </Badge>
            </div>
            {formattedStartDate && formattedEndDate && (
              <p className="text-base font-medium text-blue-700 dark:text-blue-400">
                Valid through {formattedEndDate}
              </p>
            )}
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
            >
              View PDF →
            </a>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {headlineBenefit && (
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 leading-tight">
            {headlineBenefit}
          </div>
        )}

        {summaryBody && (
          <p className="text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">{summaryBody}</p>
        )}

        {summaryBullets && summaryBullets.length > 0 && (
          <ul className="space-y-3 list-none">
            {summaryBullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3 text-base text-neutral-700 dark:text-neutral-300">
                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                <span className="flex-1">{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

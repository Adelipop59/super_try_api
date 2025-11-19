'use client';

import { Session } from '@/lib/api/sessions';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';

interface SessionTimelineProps {
  session: Session;
}

const steps = [
  { key: 'appliedAt', label: 'Application', status: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] },
  { key: 'acceptedAt', label: 'Acceptée', status: ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] },
  { key: 'purchaseProofUrl', label: 'Achat soumis', status: ['IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] },
  { key: 'submittedAt', label: 'Test soumis', status: ['SUBMITTED', 'COMPLETED'] },
  { key: 'completedAt', label: 'Terminée', status: ['COMPLETED'] },
];

export function SessionTimeline({ session }: SessionTimelineProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isStepCompleted = (step: typeof steps[0]) => {
    return step.status.includes(session.status);
  };

  const getStepValue = (step: typeof steps[0]) => {
    const value = session[step.key as keyof Session];
    return value;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Timeline</h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const completed = isStepCompleted(step);
            const value = getStepValue(step);
            const isRejected = session.status === 'REJECTED' && index === 1;
            const isCancelled = session.status === 'CANCELLED';

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className="relative z-10">
                  {isRejected || (isCancelled && index > 0) ? (
                    <XCircle className="h-8 w-8 text-red-500 fill-red-50" />
                  ) : completed ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500 fill-green-50" />
                  ) : (
                    <Circle className="h-8 w-8 text-gray-300" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className={`font-medium ${completed ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                  {value && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {typeof value === 'string' && value.includes('T')
                        ? formatDate(value)
                        : value === true
                        ? 'Complété'
                        : ''}
                    </div>
                  )}
                  {isRejected && (
                    <div className="text-sm text-red-600 mt-1">
                      Session refusée
                    </div>
                  )}
                  {isCancelled && index === 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      Session annulée
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status badges */}
        {session.status === 'DISPUTED' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-900">Litige en cours</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Un litige a été ouvert pour cette session. L'équipe support examine la situation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

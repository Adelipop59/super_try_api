'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Campaign } from '@/lib/api/campaigns';

interface CampaignCardProps {
  campaign: Campaign;
  variant?: 'public' | 'user' | 'pro';
  onApply?: (campaignId: string) => void;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente de paiement',
  ACTIVE: 'Active',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

export function CampaignCard({ campaign, variant = 'public', onApply }: CampaignCardProps) {
  const statusColor = statusColors[campaign.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  const statusLabel = statusLabels[campaign.status as keyof typeof statusLabels] || campaign.status;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const bonus = campaign.offers?.[0]?.bonus || 0;
  const slotsLeft = campaign.availableSlots;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{campaign.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {campaign.description}
            </CardDescription>
          </div>
          {variant === 'pro' && (
            <Badge className={statusColor}>{statusLabel}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Début:</span>
            <span className="font-medium">{formatDate(campaign.startDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fin:</span>
            <span className="font-medium">{formatDate(campaign.endDate)}</span>
          </div>
          {bonus > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bonus:</span>
              <span className="font-semibold text-green-600">+{bonus}€</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Places restantes:</span>
            <Badge variant={slotsLeft > 5 ? 'default' : 'destructive'}>
              {slotsLeft}/{campaign.totalSlots}
            </Badge>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {variant === 'public' || variant === 'user' ? (
          <>
            <Link
              href={`/campaigns/${campaign.id}`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                Voir détails
              </Button>
            </Link>
            {campaign.status === 'ACTIVE' && slotsLeft > 0 && variant === 'user' && (
              <Button
                variant="default"
                onClick={() => onApply?.(campaign.id)}
                className="flex-1"
              >
                Postuler
              </Button>
            )}
          </>
        ) : (
          <>
            <Link
              href={`/pro/campaigns/${campaign.id}`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                Gérer
              </Button>
            </Link>
            {campaign.status === 'DRAFT' && (
              <Link
                href={`/pro/campaigns/${campaign.id}/edit`}
                className="flex-1"
              >
                <Button variant="default" className="w-full">
                  Éditer
                </Button>
              </Link>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}

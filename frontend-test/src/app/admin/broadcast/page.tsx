'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendBroadcast } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Send, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';

type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

export default function BroadcastPage() {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  // Form state
  const [target, setTarget] = useState<'ALL' | 'USER' | 'PRO' | 'CUSTOM'>('ALL');
  const [userIds, setUserIds] = useState('');
  const [type, setType] = useState('INFO');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<NotificationChannel[]>(['IN_APP']);

  const handleChannelToggle = (channel: NotificationChannel) => {
    if (channels.includes(channel)) {
      setChannels(channels.filter(c => c !== channel));
    } else {
      setChannels([...channels, channel]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Le titre et le message sont requis');
      return;
    }

    if (channels.length === 0) {
      toast.error('Sélectionnez au moins un canal');
      return;
    }

    const targetUserIds = userIds.trim()
      ? userIds.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;

    if (!confirm(`Êtes-vous sûr d'envoyer ce message à ${target === 'ALL' ? 'tous les utilisateurs' : target === 'USER' ? 'tous les testeurs' : 'tous les vendeurs'} ?`)) {
      return;
    }

    setSending(true);
    try {
      const recipients: 'ALL' | 'USER' | 'PRO' | 'ADMIN' | string[] =
        target === 'CUSTOM' && targetUserIds && targetUserIds.length > 0
          ? targetUserIds
          : (target as 'ALL' | 'USER' | 'PRO');

      await sendBroadcast({
        recipients,
        type: type || 'INFO',
        title: title.trim(),
        message: message.trim(),
        channels: channels.length > 0 ? channels : ['IN_APP'],
      });

      toast.success('Message envoyé avec succès !');

      // Reset form
      setTitle('');
      setMessage('');
      setUserIds('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push('/admin')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au dashboard
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Diffusion de notifications</h1>
        <p className="text-muted-foreground">
          Envoyez des notifications à tous les utilisateurs ou à un groupe spécifique
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Nouvelle diffusion
          </CardTitle>
          <CardDescription>
            Remplissez le formulaire pour envoyer une notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-6">
            {/* Target */}
            <div className="space-y-2">
              <Label htmlFor="target">Destinataires *</Label>
              <Select value={target} onValueChange={(value: any) => setTarget(value)}>
                <SelectTrigger id="target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tous les utilisateurs
                    </div>
                  </SelectItem>
                  <SelectItem value="USER">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tous les testeurs (USER)
                    </div>
                  </SelectItem>
                  <SelectItem value="PRO">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tous les vendeurs (PRO)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User IDs (optional) */}
            <div className="space-y-2">
              <Label htmlFor="userIds">IDs utilisateurs spécifiques (optionnel)</Label>
              <Input
                id="userIds"
                placeholder="user-id-1, user-id-2, user-id-3..."
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Séparez les IDs par des virgules. Laissez vide pour cibler le groupe sélectionné ci-dessus.
              </p>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de notification *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Information</SelectItem>
                  <SelectItem value="SUCCESS">Succès</SelectItem>
                  <SelectItem value="WARNING">Avertissement</SelectItem>
                  <SelectItem value="ERROR">Erreur</SelectItem>
                  <SelectItem value="ANNOUNCEMENT">Annonce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Nouvelle fonctionnalité disponible"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Écrivez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length} caractères
              </p>
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label>Canaux de diffusion *</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-in-app"
                    checked={channels.includes('IN_APP')}
                    onCheckedChange={() => handleChannelToggle('IN_APP')}
                  />
                  <label
                    htmlFor="channel-in-app"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    In-App (notification dans l'application)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-email"
                    checked={channels.includes('EMAIL')}
                    onCheckedChange={() => handleChannelToggle('EMAIL')}
                  />
                  <label
                    htmlFor="channel-email"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Email
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-sms"
                    checked={channels.includes('SMS')}
                    onCheckedChange={() => handleChannelToggle('SMS')}
                  />
                  <label
                    htmlFor="channel-sms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    SMS
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="channel-push"
                    checked={channels.includes('PUSH')}
                    onCheckedChange={() => handleChannelToggle('PUSH')}
                  />
                  <label
                    htmlFor="channel-push"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Push notification
                  </label>
                </div>
              </div>
            </div>

            {/* Preview */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-sm">Aperçu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="font-semibold mb-1">{title || 'Titre de la notification'}</div>
                  <div className="text-sm text-muted-foreground">
                    {message || 'Votre message apparaîtra ici...'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin')}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={sending} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Envoi...' : 'Envoyer la notification'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="mt-6 border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-900">
            <strong>Attention :</strong> Les notifications broadcast sont envoyées immédiatement à tous les destinataires sélectionnés. Assurez-vous de vérifier votre message avant l'envoi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

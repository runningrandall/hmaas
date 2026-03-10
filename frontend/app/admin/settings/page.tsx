'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { integrationsApi, StripeKeys } from '@/lib/api/integrations';

const MASKED_VALUE = '********';

export default function SettingsPage() {
    const [stripeKeys, setStripeKeys] = useState<StripeKeys>({ stripePublicKey: null, stripeSecretKey: null });
    const [stripeForm, setStripeForm] = useState({ stripePublicKey: '', stripeSecretKey: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSecretKey, setShowSecretKey] = useState(false);

    const isConfigured = stripeKeys.stripePublicKey === MASKED_VALUE;

    const loadStripeKeys = useCallback(async () => {
        setLoading(true);
        try {
            const keys = await integrationsApi.getStripeKeys();
            setStripeKeys(keys);
            setError('');
        } catch {
            setError('Failed to load Stripe integration status.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStripeKeys();
    }, [loadStripeKeys]);

    const handleSaveStripeKeys = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess('');
        setError('');
        try {
            await integrationsApi.setStripeKeys(stripeForm);
            setSuccess('Stripe keys saved successfully.');
            setEditing(false);
            setStripeForm({ stripePublicKey: '', stripeSecretKey: '' });
            setShowSecretKey(false);
            await loadStripeKeys();
        } catch {
            setError('Failed to save Stripe keys. Ensure keys start with pk_ and sk_ respectively.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setStripeForm({ stripePublicKey: '', stripeSecretKey: '' });
        setShowSecretKey(false);
        setError('');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Settings
                </h1>
                <p className="text-muted-foreground">Configure organization settings and preferences.</p>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-md border border-emerald-500/20 text-sm">
                    {success}
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Stripe Integration</CardTitle>
                        <CardDescription>
                            Connect your Stripe account to enable payment processing for your organization.
                        </CardDescription>
                    </div>
                    {!editing && !loading && (
                        <Button variant="outline" onClick={() => setEditing(true)}>
                            {isConfigured ? 'Update Keys' : 'Configure'}
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading integration status...
                        </div>
                    ) : editing ? (
                        <form onSubmit={handleSaveStripeKeys}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="stripePublicKey">Publishable Key</Label>
                                    <Input
                                        id="stripePublicKey"
                                        value={stripeForm.stripePublicKey}
                                        onChange={(e) => setStripeForm({ ...stripeForm, stripePublicKey: e.target.value })}
                                        placeholder="pk_live_..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe publishable key (starts with pk_).
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="stripeSecretKey">Secret Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="stripeSecretKey"
                                            type={showSecretKey ? 'text' : 'password'}
                                            value={stripeForm.stripeSecretKey}
                                            onChange={(e) => setStripeForm({ ...stripeForm, stripeSecretKey: e.target.value })}
                                            placeholder="sk_live_..."
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecretKey(!showSecretKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Your Stripe secret key (starts with sk_). This value is encrypted and never displayed after saving.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Keys
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancel}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                                <span className="text-sm font-medium">
                                    {isConfigured ? 'Connected' : 'Not configured'}
                                </span>
                            </div>
                            {isConfigured && (
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Publishable Key: {MASKED_VALUE}</p>
                                    <p>Secret Key: {MASKED_VALUE}</p>
                                </div>
                            )}
                            {!isConfigured && (
                                <p className="text-sm text-muted-foreground">
                                    Add your Stripe API keys to enable payment processing for customers.
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

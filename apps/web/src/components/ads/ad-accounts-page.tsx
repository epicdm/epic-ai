"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface AdAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string | null;
  status: string;
  _count: {
    campaigns: number;
  };
}

const PLATFORMS = [
  { value: "META", label: "Meta (Facebook & Instagram)", color: "bg-blue-500" },
  { value: "GOOGLE", label: "Google Ads", color: "bg-red-500" },
  { value: "LINKEDIN", label: "LinkedIn Ads", color: "bg-blue-700" },
];

export function AdAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("META");
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  // Load accounts
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ads/accounts");
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Create account
  async function createAccount() {
    if (!accountName) return;
    setSaving(true);

    try {
      const res = await fetch("/api/ads/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          accountName,
          accountId: accountId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAccounts([{ ...data.account, _count: { campaigns: 0 } }, ...accounts]);
        setIsOpen(false);
        setAccountName("");
        setAccountId("");
      }
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setSaving(false);
    }
  }

  // Delete account
  async function deleteAccount(id: string) {
    if (!confirm("Delete this ad account? Campaigns will be preserved.")) return;

    try {
      await fetch(`/api/ads/accounts/${id}`, { method: "DELETE" });
      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad Accounts"
        description="Connect and manage your advertising accounts."
        actions={
          <Button  onClick={() => setIsOpen(true)}><Plus className="w-4 h-4" /> 
            Add Account
          </Button>
        }
      />

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const platformAccounts = accounts.filter((a) => a.platform === p.value);
          return (
            <Card key={p.value}>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${p.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{p.value.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {platformAccounts.length} account{platformAccounts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {platformAccounts.length === 0 ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPlatform(p.value);
                      setIsOpen(true);
                    }}
                  >
                    Connect {p.label.split(" ")[0]}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {platformAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{account.accountName}</p>
                          <p className="text-xs text-muted-foreground">
                            {account._count.campaigns} campaigns
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="secondary">
                            {account.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteAccount(account.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setPlatform(p.value);
                        setIsOpen(true);
                      }}
                    >
                      + Add Another
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ExternalLink className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Manual Tracking Mode</h3>
              <p className="text-sm text-muted-foreground">
                Full API integration with Meta, Google, and LinkedIn requires business verification
                and app review. For now, you can manually enter campaign metrics to track performance
                in Epic AI. We&apos;re working on automated sync!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Account Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Ad Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={platform} onValueChange={(v: string) => setPlatform(v)}>
              <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="My Business Ad Account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />

            <Input
              placeholder="act_123456789"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createAccount}
              disabled={saving || !accountName}
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

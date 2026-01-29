"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
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
  const { isOpen, onOpen, onClose } = useDisclosure();

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
        onClose();
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
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ad Accounts"
        description="Connect and manage your advertising accounts."
        actions={
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} onClick={onOpen}>
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
              <CardBody>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${p.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{p.value.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-sm text-default-500">
                      {platformAccounts.length} account{platformAccounts.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {platformAccounts.length === 0 ? (
                  <Button
                    variant="bordered"
                    className="w-full"
                    onClick={() => {
                      setPlatform(p.value);
                      onOpen();
                    }}
                  >
                    Connect {p.label.split(" ")[0]}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {platformAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-default-50"
                      >
                        <div>
                          <p className="text-sm font-medium">{account.accountName}</p>
                          <p className="text-xs text-default-400">
                            {account._count.campaigns} campaigns
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Chip size="sm" color="success" variant="flat">
                            {account.status}
                          </Chip>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onClick={() => deleteAccount(account.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="light"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setPlatform(p.value);
                        onOpen();
                      }}
                    >
                      + Add Another
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ExternalLink className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Manual Tracking Mode</h3>
              <p className="text-sm text-default-500">
                Full API integration with Meta, Google, and LinkedIn requires business verification
                and app review. For now, you can manually enter campaign metrics to track performance
                in Epic AI. We&apos;re working on automated sync!
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Add Account Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Add Ad Account</ModalHeader>
          <ModalBody className="space-y-4">
            <Select
              label="Platform"
              selectedKeys={[platform]}
              onSelectionChange={(keys) => setPlatform(Array.from(keys)[0] as string)}
            >
              {PLATFORMS.map((p) => (
                <SelectItem key={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </Select>

            <Input
              label="Account Name"
              placeholder="My Business Ad Account"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />

            <Input
              label="Account ID (optional)"
              placeholder="act_123456789"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              description="Find this in your ad platform settings"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={createAccount}
              isLoading={saving}
              isDisabled={!accountName}
            >
              Add Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

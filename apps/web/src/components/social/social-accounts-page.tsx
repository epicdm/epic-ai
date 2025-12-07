"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Button, Spinner } from "@heroui/react";
import Link from "next/link";

interface PostizStatus {
  postizAvailable: boolean;
  postizUrl: string;
}

export function SocialAccountsPage() {
  const [status, setStatus] = useState<PostizStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/social/status");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error("Error checking status:", err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/social" className="hover:text-gray-700">
              Social
            </Link>
            <span>/</span>
            <span>Accounts</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connected Accounts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your connected social media accounts.
          </p>
        </div>

        {status?.postizAvailable && (
          <Button
            as="a"
            href={`${status.postizUrl}/launches`}
            target="_blank"
            color="primary"
          >
            + Connect Account
          </Button>
        )}
      </div>

      {!status?.postizAvailable ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Social Media Engine Not Running
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please start the social media service to manage accounts.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔗</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your First Account
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Connect your social media accounts to start scheduling posts.
              Accounts are managed in the Social Manager.
            </p>
            <Button
              as="a"
              href={`${status.postizUrl}/launches`}
              target="_blank"
              color="primary"
              size="lg"
            >
              Open Social Manager →
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

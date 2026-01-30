"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface Props {
  brandId: string;
  brandName: string;
}

export function ContextSearchPage({ brandId, brandName }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    title: string | null;
    summary: string | null;
    contentType: string;
    importance: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/context/items?brandId=${brandId}&search=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Context</h1>
        <p className="text-muted-foreground">
          Search through all context items for {brandName}.
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Search Context</h3>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Search your context items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1"
            />
            <Button disabled={isSearching} onClick={handleSearch}>
              Search
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border border-default-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{item.title || "Untitled"}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {item.contentType}
                      </Badge>
                      <Badge variant="default">
                        Score: {item.importance}/10
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.summary || "No summary available"}
                  </p>
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term to find relevant context</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

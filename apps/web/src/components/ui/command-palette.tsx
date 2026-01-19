"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Modal, Button } from "@heroui/react";
import { Search, X, Home, FilePlus, BarChart2, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";

type CommandItem = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  action: () => void;
  category: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { track } = useAnalytics();

  const commands: CommandItem[] = [
    {
      id: "dashboard",
      title: "Go to Dashboard",
      icon: <Home className="w-4 h-4" />,
      action: () => router.push("/dashboard"),
      category: "Navigation"
    },
    {
      id: "content",
      title: "Create Content",
      icon: <FilePlus className="w-4 h-4" />,
      action: () => router.push("/content/new"),
      category: "Actions"
    },
    {
      id: "analytics",
      title: "View Analytics",
      icon: <BarChart2 className="w-4 h-4" />,
      action: () => router.push("/analytics"),
      category: "Navigation"
    },
    {
      id: "settings",
      title: "Open Settings",
      icon: <Settings className="w-4 h-4" />,
      action: () => router.push("/settings"),
      category: "Navigation"
    }
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredCommands = commands.filter((cmd) => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} size="xl">
      <CommandPrimitive className="overflow-hidden rounded-lg border shadow-md">
        <div className="flex items-center px-3 border-b">
          <Search className="w-5 h-5 mr-2 text-muted-foreground" />
          <CommandPrimitive.Input 
            value={search}
            onValueChange={setSearch}
            className="flex-1 py-3 outline-none"
            placeholder="Type a command or search..."
          />
          <Button 
            isIconOnly 
            variant="light" 
            size="sm" 
            onPress={() => setOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <CommandPrimitive.List className="max-h-[300px] overflow-y-auto">
          {filteredCommands.map((cmd) => (
            <CommandPrimitive.Item 
              key={cmd.id}
              onSelect={() => {
                cmd.action();
                track("command_palette_action", { command: cmd.id });
                setOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-default-100"
            >
              <div className="flex items-center">
                {cmd.icon}
                <span className="ml-2">{cmd.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {cmd.category}
                </span>
              </div>
            </CommandPrimitive.Item>
          ))}
        </CommandPrimitive.List>
      </CommandPrimitive>
    </Modal>
  );
}

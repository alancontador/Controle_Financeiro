import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { ChevronRight, ChevronDown, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
  parent_category_id: string | null;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface HierarchicalCategorySelectorProps {
  categories: Category[];
  value?: string;
  onValueChange: (value: string | undefined) => void;
  type: "income" | "expense";
  placeholder?: string;
  className?: string;
}

export function HierarchicalCategorySelector({
  categories,
  value,
  onValueChange,
  type,
  placeholder = "Selecione uma categoria",
  className,
}: HierarchicalCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Filter categories by type
  const filteredByType = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Build tree structure
  const categoryTree = useMemo(() => {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // First pass: create all nodes
    filteredByType.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    filteredByType.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_category_id && map.has(cat.parent_category_id)) {
        map.get(cat.parent_category_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort
    const sortNodes = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, [filteredByType]);

  // Filter tree by search
  const searchFilteredTree = useMemo(() => {
    if (!search) return categoryTree;

    const searchLower = search.toLowerCase();

    const filterNode = (node: CategoryNode): CategoryNode | null => {
      const matchesSelf = node.name.toLowerCase().includes(searchLower);
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is CategoryNode => n !== null);

      if (matchesSelf || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return categoryTree
      .map(filterNode)
      .filter((n): n is CategoryNode => n !== null);
  }, [categoryTree, search]);

  // Get selected category info
  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === value);
  }, [categories, value]);

  // Get full path for display
  const getPath = (categoryId: string): string[] => {
    const paths: string[] = [];
    let current = categories.find((c) => c.id === categoryId);
    while (current) {
      paths.unshift(current.name);
      current = current.parent_category_id
        ? categories.find((c) => c.id === current!.parent_category_id)
        : undefined;
    }
    return paths;
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (id: string) => {
    onValueChange(id);
    setOpen(false);
    setSearch("");
  };

  // Expand all on search
  useMemo(() => {
    if (search) {
      const allIds = new Set(filteredByType.map((c) => c.id));
      setExpandedNodes(allIds);
    }
  }, [search, filteredByType]);

  const renderNode = (node: CategoryNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || !!search;
    const isSelected = value === node.id;
    const IconComponent = (LucideIcons as any)[node.icon] || LucideIcons.Tag;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
            isSelected
              ? "bg-primary/20 text-primary"
              : "hover:bg-secondary/80",
            level > 0 && "ml-4"
          )}
          onClick={() => handleSelect(node.id)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 p-0"
              onClick={(e) => toggleExpand(node.id, e)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}

          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${node.color}20` }}
          >
            <IconComponent className="w-3.5 h-3.5" style={{ color: node.color }} />
          </div>

          <span className="flex-1 truncate text-sm">{node.name}</span>

          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-border/50 ml-4 pl-1">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const SelectedIcon = selectedCategory
    ? (LucideIcons as any)[selectedCategory.icon] || LucideIcons.Tag
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal bg-secondary/50 border-border/50",
            !selectedCategory && "text-muted-foreground",
            className
          )}
        >
          {selectedCategory ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedCategory.color }}
              />
              {getPath(selectedCategory.id).length > 1 ? (
                <span className="truncate">
                  <span className="text-muted-foreground">
                    {getPath(selectedCategory.id).slice(0, -1).join(" > ")} &gt;{" "}
                  </span>
                  {selectedCategory.name}
                </span>
              ) : (
                selectedCategory.name
              )}
            </span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-popover border-border" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-secondary/50"
            />
          </div>
        </div>

        <ScrollArea className="h-64 p-2">
          {searchFilteredTree.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhuma categoria encontrada
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Option to clear selection */}
              {value && (
                <div
                  className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-secondary/80 text-muted-foreground mb-2 border-b border-border pb-2"
                  onClick={() => {
                    onValueChange(undefined);
                    setOpen(false);
                  }}
                >
                  <div className="w-5" />
                  <LucideIcons.X className="w-4 h-4" />
                  <span className="text-sm">Remover categoria</span>
                </div>
              )}
              {searchFilteredTree.map((node) => renderNode(node))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

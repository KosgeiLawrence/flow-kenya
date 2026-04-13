import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  initialCount?: number;
  stepCount?: number;
  className?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

export function CompactList<T>({
  items,
  renderItem,
  initialCount = 5,
  stepCount = 10,
  className,
  emptyMessage = "No items yet",
  maxHeight = "max-h-80",
}: CompactListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleCount;
  const canShowMore = visibleCount < items.length;
  const canCollapse = visibleCount > initialCount;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("space-y-2 overflow-y-auto", maxHeight)}>
        {visibleItems.map((item, i) => (
          <React.Fragment key={i}>{renderItem(item, i)}</React.Fragment>
        ))}
      </div>
      {(canShowMore || canCollapse) && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {canShowMore && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setVisibleCount(prev => Math.min(prev + stepCount, items.length))}
            >
              <ChevronDown className="w-3 h-3" />
              Show more ({remaining} remaining)
            </Button>
          )}
          {canCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setVisibleCount(initialCount)}
            >
              <ChevronUp className="w-3 h-3" />
              Collapse
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

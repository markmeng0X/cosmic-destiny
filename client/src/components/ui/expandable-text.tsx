import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./button";

interface ExpandableTextProps {
  text: string;
  maxHeight?: number;
  className?: string;
  "data-testid"?: string;
  expandLabel?: string;
  collapseLabel?: string;
}

export function ExpandableText({
  text,
  maxHeight = 80,
  className = "",
  "data-testid": testId,
  expandLabel = "View all",
  collapseLabel = "Collapse",
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const isOverflowing = contentRef.current.scrollHeight > maxHeight;
        setShowButton(isOverflowing);
        if (!isOverflowing) {
          setIsExpanded(false);
        }
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, maxHeight]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`text-sm text-muted-foreground whitespace-pre-wrap break-words transition-all duration-300 ease-in-out ${className}`}
        style={{
          maxHeight: isExpanded ? `${contentRef.current?.scrollHeight || 1000}px` : `${maxHeight}px`,
          overflow: "hidden",
        }}
        data-testid={testId}
      >
        {text}
      </div>
      
      {showButton && !isExpanded && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none"
          aria-hidden="true"
        />
      )}
      
      {showButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 h-7 px-2 text-xs text-purple-400 hover:text-purple-300"
          data-testid={testId ? `${testId}-toggle` : "button-expand-toggle"}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              {collapseLabel}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              {expandLabel}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

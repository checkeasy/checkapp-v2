import { X, Book, Users, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface HelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSheet = ({ isOpen, onClose }: HelpSheetProps) => {
  const helpItems = [
    {
      id: "tutorial",
      icon: Book,
      title: "Tutoriel",
      description: "Parcours guidé pour bien commencer",
      action: () => {
        // TODO: Launch tutorial or open /help/tutorial
        console.log("Tutorial clicked");
        onClose();
      }
    },
    {
      id: "use-cases", 
      icon: Users,
      title: "Cas d'usage",
      description: "Bonnes pratiques et exemples",
      action: () => {
        // TODO: Open /help/use-cases
        console.log("Use cases clicked");
        onClose();
      }
    },
    {
      id: "faq",
      icon: MessageCircle, 
      title: "FAQ",
      description: "Questions fréquentes",
      action: () => {
        // TODO: Open /help/faq
        console.log("FAQ clicked");
        onClose();
      }
    }
  ];

  const handleItemClick = (item: typeof helpItems[0]) => {
    // Analytics tracking
    console.log(`help_${item.id.replace('-', '')}_clicked`);
    item.action();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-2xl border-0 p-0"
      >
        {/* Handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted" />
        
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Aide</SheetTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="px-6 pb-safe">
          <div className="space-y-1">
            {helpItems.map((item, index) => (
              <div key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors rounded-lg group"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-secondary" />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground">
                      {item.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
                
                {index < helpItems.length - 1 && (
                  <Separator className="ml-14 mr-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
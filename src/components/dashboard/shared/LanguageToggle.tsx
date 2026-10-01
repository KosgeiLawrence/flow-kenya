import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

const LanguageToggle = () => {
  const { t } = useTranslation();
  const { i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "en" ? "sw" : "en");
  };

  return (
    <div className="space-y-1">
      <ThemeToggle showLabel className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLang}
        className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label="Switch language"
      >
        <Globe className="w-4 h-4" />
        {i18n.language === "en" ? "Swahili" : "English"}
      </Button>
    </div>
  );
};

export default LanguageToggle;

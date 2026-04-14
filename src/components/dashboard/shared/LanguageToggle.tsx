import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "en" ? "sw" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLang}
      className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      {i18n.language === "en" ? "Swahili" : "English"}
    </Button>
  );
};

export default LanguageToggle;

import { icons } from "lucide-react";
import { Recycle } from "lucide-react";

// Map kebab-case icon names from DB to PascalCase Lucide component names
const kebabToPascal = (name: string) =>
  name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());

interface MaterialIconProps {
  iconName?: string | null;
  className?: string;
}

const MaterialIcon = ({ iconName, className = "w-5 h-5" }: MaterialIconProps) => {
  if (!iconName) return <Recycle className={className} />;

  const pascalName = kebabToPascal(iconName);
  const LucideIcon = (icons as Record<string, any>)[pascalName];

  if (!LucideIcon) return <Recycle className={className} />;

  return <LucideIcon className={className} />;
};

export default MaterialIcon;

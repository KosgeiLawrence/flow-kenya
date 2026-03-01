import { motion } from "framer-motion";
import { Recycle, Building2, Factory, Heart, Briefcase, Landmark, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "waste_picker" | "aggregator" | "recycler" | "ngo" | "corporate" | "county_government";

interface RoleSelectorProps {
  selected: AppRole | null;
  onSelect: (role: AppRole) => void;
}

const roles: { value: AppRole; label: string; labelSw: string; icon: React.ElementType; description: string }[] = [
  { value: "waste_picker", label: "Waste Picker", labelSw: "Mkusanyaji Taka", icon: Recycle, description: "Collect recyclable materials from communities" },
  { value: "aggregator", label: "Aggregator", labelSw: "Mkusanyaji Mkuu", icon: Building2, description: "Aggregate materials from waste pickers" },
  { value: "recycler", label: "Recycler", labelSw: "Msindikaji", icon: Factory, description: "Process and recycle collected materials" },
  { value: "ngo", label: "NGO", labelSw: "Shirika", icon: Heart, description: "Support communities and track impact" },
  { value: "corporate", label: "Corporate", labelSw: "Kampuni", icon: Briefcase, description: "EPR compliance and sustainability tracking" },
  { value: "county_government", label: "County Government", labelSw: "Serikali ya Kaunti", icon: Landmark, description: "Waste flow monitoring and regulation" },
];

const RoleSelector = ({ selected, onSelect }: RoleSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {roles.map((role, i) => {
        const Icon = role.icon;
        const isSelected = selected === role.value;
        return (
          <motion.button
            key={role.value}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(role.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
              isSelected
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-foreground">{role.label}</span>
            <span className="text-xs text-muted-foreground leading-tight">{role.description}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default RoleSelector;

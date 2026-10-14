import {
  Anchor, BookOpen, Brain, Briefcase, Brush, Calculator, Calendar, Camera, Circle, Code, Coffee, Compass,
  Cpu, Database, Dog, Dumbbell, Feather, FileText, Film, Flag, FlaskConical, Flame, Folder, Gamepad2, Gem,
  Globe, GraduationCap, Guitar, Hammer, Headphones, Heart, Home, Languages, Laptop, Leaf, Lightbulb, Mail,
  Map, Mic, Mountain, Music, Newspaper, Palette, PenTool, Pencil, Plane, Puzzle, Rocket, ShoppingCart,
  Smartphone, Sparkles, Sprout, Star, Target, Terminal, Trophy, Users, Utensils, Wallet, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";

export const TAG_COLORS = [
  "#f26b5b", "#fb923c", "#f5c542", "#a3d64a", "#4cc79b", "#2dc5c1",
  "#4fb3ef", "#6b8cf5", "#9b87f5", "#c77ddf", "#ee6fa8", "#a8a29e",
];

export const TAG_ICONS: Record<string, LucideIcon> = {
  circle: Circle, code: Code, terminal: Terminal, laptop: Laptop, cpu: Cpu, database: Database,
  briefcase: Briefcase, mail: Mail, calendar: Calendar, "file-text": FileText, folder: Folder, wallet: Wallet,
  "book-open": BookOpen, "graduation-cap": GraduationCap, brain: Brain, languages: Languages,
  calculator: Calculator, "flask-conical": FlaskConical, lightbulb: Lightbulb, pencil: Pencil,
  "pen-tool": PenTool, palette: Palette, brush: Brush, camera: Camera, film: Film, music: Music,
  guitar: Guitar, mic: Mic, headphones: Headphones, newspaper: Newspaper, feather: Feather,
  dumbbell: Dumbbell, heart: Heart, leaf: Leaf, sprout: Sprout, mountain: Mountain, coffee: Coffee,
  utensils: Utensils, home: Home, dog: Dog, users: Users, "shopping-cart": ShoppingCart, plane: Plane,
  globe: Globe, map: Map, compass: Compass, anchor: Anchor, "gamepad-2": Gamepad2, puzzle: Puzzle,
  hammer: Hammer, wrench: Wrench, smartphone: Smartphone, rocket: Rocket, target: Target, trophy: Trophy,
  star: Star, flag: Flag, flame: Flame, zap: Zap, gem: Gem, sparkles: Sparkles,
};

export function TagIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = TAG_ICONS[name] ?? Circle;
  return <Icon size={size} className={className} />;
}

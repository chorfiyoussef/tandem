"use client";

/**
 * Tandem's icon set: Phosphor, the closest web family to SF Symbols
 * (consistent optical size, rounded terminals, outline + filled weights).
 * Every icon the app uses is re-exported from here under a stable name so the
 * family can be swapped in one place. Chevrons, checks and glyph-like marks
 * use the bold weight to match Apple's medium symbol weight at small sizes.
 */
import { forwardRef } from "react";
import {
  ArrowDown, ArrowElbowDownRight, ArrowUp, ArrowUpLeft, BookOpen, Briefcase, CalendarBlank, CalendarDots, CaretDown,
  CaretLeft, CaretRight, CaretUp, CaretUpDown, ChartBar, ChatCircle, Check, CheckCircle, CheckSquare, Checks, Circle,
  CircleHalf, CircleNotch, Code, Coffee, Compass, Copy, DotsSixVertical, DotsThree, DownloadSimple, EnvelopeSimple, Eye,
  EyeSlash, File, Flask, Folder, GearSix, Globe, Hash, Heart, House, Image, Info, Kanban, Leaf, Lightbulb, Link,
  ListBullets, Lock, MagnifyingGlass, Megaphone, Monitor, Moon, Palette, Paperclip, PencilSimple, Plus, PushPin,
  PushPinSlash, Rocket, Shapes, SidebarSimple, SignOut, SlidersHorizontal, SquaresFour, Stack, Sun, Tag, Target, Trash,
  Tray, User, UserPlus, Users, Warning, Wrench, X, XCircle,
  type Icon, type IconProps, type IconWeight,
} from "@phosphor-icons/react";

export type { IconProps };

function withWeight(Base: Icon, weight: IconWeight): Icon {
  const C = forwardRef<SVGSVGElement, IconProps>(function WeightedIcon(props, ref) {
    return <Base ref={ref} weight={weight} {...props} />;
  });
  C.displayName = `${Base.displayName ?? "Icon"}-${weight}`;
  return C as Icon;
}

// Glyph-like marks: bold reads closer to SF Symbols at 12–16px.
export const CheckIcon = withWeight(Check, "bold");
export const CheckCheckIcon = withWeight(Checks, "bold");
export const XIcon = withWeight(X, "bold");
export const PlusIcon = withWeight(Plus, "bold");
export const ChevronDownIcon = withWeight(CaretDown, "bold");
export const ChevronUpIcon = withWeight(CaretUp, "bold");
export const ChevronLeftIcon = withWeight(CaretLeft, "bold");
export const ChevronRightIcon = withWeight(CaretRight, "bold");
export const ChevronsUpDownIcon = withWeight(CaretUpDown, "bold");
export const MoreHorizontalIcon = withWeight(DotsThree, "bold");
export const GripVerticalIcon = withWeight(DotsSixVertical, "bold");
export const ArrowUpIcon = withWeight(ArrowUp, "bold");
export const ArrowDownIcon = withWeight(ArrowDown, "bold");
export const ArrowUpLeftIcon = withWeight(ArrowUpLeft, "bold");
export const CornerDownRightIcon = withWeight(ArrowElbowDownRight, "bold");
export const CircleIcon = withWeight(Circle, "fill");

// Regular-weight symbols
export const HomeIcon = House;
export const HomeFilledIcon = withWeight(House, "fill");
export const InboxIcon = Tray;
export const InboxFilledIcon = withWeight(Tray, "fill");
export const SearchIcon = MagnifyingGlass;
export const PanelLeftIcon = SidebarSimple;
export const PanelLeftCloseIcon = SidebarSimple;
export const SettingsIcon = GearSix;
export const PinIcon = PushPin;
export const PinFilledIcon = withWeight(PushPin, "fill");
export const UnpinIcon = PushPinSlash;
export const Trash2Icon = Trash;
export const PencilIcon = PencilSimple;
export const ListIcon = ListBullets;
export const LockIcon = Lock;
export const SlidersHorizontalIcon = SlidersHorizontal;
export const LogOutIcon = SignOut;
export const MonitorIcon = Monitor;
export const MoonIcon = Moon;
export const SunIcon = Sun;
export const SunMoonIcon = CircleHalf;
export const UserIcon = User;
export const UserPlusIcon = UserPlus;
export const UsersIcon = Users;
export const CalendarIcon = CalendarBlank;
export const CalendarDaysIcon = CalendarDots;
export const KanbanIcon = Kanban;
export const TagIcon = Tag;
export const ShapesIcon = Shapes;
export const CopyIcon = Copy;
export const LinkIcon = Link;
export const EyeIcon = Eye;
export const EyeOffIcon = EyeSlash;
export const MessageSquareIcon = ChatCircle;
export const CheckSquareIcon = CheckSquare;
export const PaperclipIcon = Paperclip;
export const FileIcon = File;
export const ImageIcon = Image;
export const DownloadIcon = DownloadSimple;
export const MailIcon = EnvelopeSimple;
export const InfoIcon = Info;
export const CircleCheckIcon = CheckCircle;
export const TriangleAlertIcon = Warning;
export const OctagonXIcon = XCircle;
export const Loader2Icon = CircleNotch;

/** Icons a space can pick. Names are stored in the database. */
export const SPACE_ICONS: Record<string, Icon> = {
  "squares-four": SquaresFour,
  folder: Folder,
  layers: Stack,
  rocket: Rocket,
  target: Target,
  lightbulb: Lightbulb,
  "chart-bar": ChartBar,
  palette: Palette,
  code: Code,
  wrench: Wrench,
  megaphone: Megaphone,
  briefcase: Briefcase,
  "book-open": BookOpen,
  heart: Heart,
  "flask-conical": Flask,
  users: Users,
  compass: Compass,
  globe: Globe,
  leaf: Leaf,
  coffee: Coffee,
};
export const SPACE_ICON_FALLBACK = Hash;

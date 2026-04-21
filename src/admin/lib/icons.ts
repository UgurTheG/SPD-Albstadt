export const ICON_LIST = [
    'GraduationCap', 'Home', 'Leaf', 'Bus', 'Briefcase', 'Users', 'Heart', 'Shield', 'Building', 'Building2',
    'TreePine', 'Sun', 'Zap', 'Lightbulb', 'BookOpen', 'Scale', 'Globe', 'Handshake', 'Baby', 'Hospital',
    'Church', 'School', 'Factory', 'Landmark', 'Library', 'Train', 'Bike', 'Car', 'Wifi', 'Phone',
    'Mail', 'MapPin', 'Calendar', 'Clock', 'Star', 'Award', 'Flag', 'ThumbsUp', 'MessageSquare', 'Megaphone',
    'Newspaper', 'FileText', 'BarChart', 'TrendingUp', 'Coins', 'Wallet', 'Accessibility', 'UserCheck',
    'UsersRound', 'Target', 'Compass', 'Map', 'Mountain', 'Waves', 'Recycle', 'Wind', 'Droplets',
    'Umbrella', 'Hammer', 'Wrench', 'Truck', 'ShieldCheck', 'Vote', 'CircleDot',
    'Trees', 'Flower2', 'Sprout', 'Apple', 'Music', 'Palette', 'Drama', 'Dumbbell', 'Stethoscope',
    'Siren', 'ShieldAlert', 'Dog', 'Cat', 'Coffee', 'UtensilsCrossed', 'Store', 'ShoppingBag', 'Banknote',
    'PiggyBank', 'HandCoins', 'Receipt', 'ClipboardList', 'PenTool', 'Mic', 'Radio', 'Tv', 'Monitor',
    'Smartphone', 'Network', 'Cloud', 'Lock', 'Eye', 'Hand', 'Footprints', 'PersonStanding',
    'Gem', 'Ribbon', 'Trophy', 'Medal', 'Crown', 'Rocket', 'Flame', 'Sparkles',
]

const ICON_ALIASES: Record<string, string> = {
    'home': 'house',
    'bar-chart': 'chart-bar',
    'train': 'train-front',
}

export function iconToKebab(name: string): string {
    const kebab = name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([a-zA-Z])(\d)/g, '$1-$2')
        .toLowerCase()
    return ICON_ALIASES[kebab] || kebab
}

const cache: Record<string, string | null> = {}

export async function loadIconSvg(iconName: string): Promise<string | null> {
    if (iconName in cache) return cache[iconName]
    try {
        const res = await fetch(`https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${iconToKebab(iconName)}.svg`)
        if (!res.ok) {
            cache[iconName] = null;
            return null
        }
        const svg = await res.text()
        cache[iconName] = svg
        return svg
    } catch {
        cache[iconName] = null;
        return null
    }
}


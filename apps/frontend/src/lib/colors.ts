import colorConfig from '@/config/colors.json';

export type ColorTheme = {
  name: string;
  colors: {
    primary: string;
    "primary-dark": string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
};

export type ColorConfig = {
  themes: Record<string, ColorTheme>;
  currentTheme: string;
};

export function getColorConfig(): ColorConfig {
  return colorConfig as ColorConfig;
}

export function getCurrentTheme(): ColorTheme {
  const config = getColorConfig();
  return config.themes[config.currentTheme];
}

export function getThemeByName(themeName: string): ColorTheme | null {
  const config = getColorConfig();
  return config.themes[themeName] || null;
}

export function getAllThemes(): Record<string, ColorTheme> {
  const config = getColorConfig();
  return config.themes;
}

export function getThemeNames(): string[] {
  const config = getColorConfig();
  return Object.keys(config.themes);
}

// Apply CSS variables to the root element
export function applyTheme(theme: ColorTheme) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  console.log('Applying theme:', theme.name, theme.colors);
  
  // Set primary color variables
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--primary-dark', theme.colors["primary-dark"]);
  root.style.setProperty('--secondary', theme.colors.secondary);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--background', theme.colors.background);
  root.style.setProperty('--foreground', theme.colors.foreground);
  root.style.setProperty('--muted', theme.colors.muted);
  
  // Set derived colors
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--secondary-foreground', theme.colors.foreground);
  root.style.setProperty('--accent-foreground', '0 0% 100%');
  root.style.setProperty('--muted-foreground', theme.colors.muted);
  
  // Card and popover colors
  root.style.setProperty('--card', theme.colors.background);
  root.style.setProperty('--card-foreground', theme.colors.foreground);
  root.style.setProperty('--popover', theme.colors.background);
  root.style.setProperty('--popover-foreground', theme.colors.foreground);
  
  // Borders and inputs
  root.style.setProperty('--border', theme.colors.secondary);
  root.style.setProperty('--input', theme.colors.secondary);
  root.style.setProperty('--ring', theme.colors.primary);
  
  // Keep destructive colors unchanged
  root.style.setProperty('--destructive', '0 84% 60%');
  root.style.setProperty('--destructive-foreground', '0 0% 100%');
  
  console.log('Applied CSS variables:', {
    primary: root.style.getPropertyValue('--primary'),
    secondary: root.style.getPropertyValue('--secondary'),
    accent: root.style.getPropertyValue('--accent')
  });
}

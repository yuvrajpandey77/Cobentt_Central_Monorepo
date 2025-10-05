import { useTheme as useNextTheme } from "next-themes";

// Returns the active theme, resolving "system" to the current system theme.
export const useTheme = (): "light" | "dark" | undefined => {
    const { theme, systemTheme } = useNextTheme();
    if (theme === "dark" || theme === "light") {
        return theme;
    }
    return systemTheme as "light" | "dark" | undefined;
};



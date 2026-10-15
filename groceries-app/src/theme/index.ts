import { colors } from './colors'


export type Theme = {
colors: typeof colors & {
text: string
background: string
muted: string
border: string
card: string
surface: string
textSecondary: string
}
radii: { xs: number; sm: number; md: number; lg: number; full: number }
spacing: { xs: number; sm: number; md: number; lg: number; xl: number }
typography: { h1: number; h2: number; h3: number; body: number; small: number }
}


export const lightTheme: Theme = {
colors: {
...colors,
text: colors.gray800,
background: colors.white,
muted: colors.gray100,
border: colors.gray300,
card: colors.white,
surface: colors.white,
textSecondary: colors.gray600,
},
radii: { xs: 4, sm: 6, md: 10, lg: 14, full: 999 },
spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
typography: { h1: 26, h2: 22, h3: 18, body: 16, small: 13 },
}
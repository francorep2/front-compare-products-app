import React, { createContext, useContext, useMemo } from 'react'
import { lightTheme, type Theme } from '../theme'


const ThemeCtx = createContext<Theme>(lightTheme)
export const useTheme = () => useContext(ThemeCtx)


export function ThemeProvider({ children }: { children: React.ReactNode }) {
const value = useMemo(() => lightTheme, [])
return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}
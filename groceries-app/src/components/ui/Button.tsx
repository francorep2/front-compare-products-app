import { ActivityIndicator, Pressable, TextStyle, ViewStyle } from 'react-native'
import { useTheme } from '../../providers/theme'
import { Text } from './Text'


interface ButtonProps {
title: string
onPress?: () => void
variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
loading?: boolean
style?: ViewStyle
textStyle?: TextStyle
}


export function Button({ title, onPress, variant = 'primary', loading, style, textStyle }: ButtonProps) {
const { colors, radii, spacing } = useTheme()
const bg = {
primary: colors.primary,
secondary: colors.secondary,
tertiary: colors.tertiary,
ghost: 'transparent',
}[variant]
const fg = variant === 'ghost' ? colors.primary : colors.white


return (
<Pressable onPress={onPress} style={[{ backgroundColor: bg, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.7 : 1 }, style]} disabled={loading}>
{loading ? <ActivityIndicator color={fg} /> : <Text style={[{ color: fg, fontWeight: '700' }, textStyle]}>{title}</Text>}
</Pressable>
)
}
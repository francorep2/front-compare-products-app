import { View } from 'react-native';
import { useTheme } from '../../providers/theme';
import { Text } from './Text';


export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary'|'secondary'|'tertiary'|'success'|'warning'|'error' }) {
const { colors, radii, spacing } = useTheme()
const bg = { primary: colors.primary, secondary: colors.secondary, tertiary: colors.tertiary, success: colors.success, warning: colors.warning, error: colors.error }[tone]
return (
<View style={{ backgroundColor: bg, borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start' }}>
<Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{label}</Text>
</View>
)
}
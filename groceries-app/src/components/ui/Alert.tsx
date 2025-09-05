import { View } from 'react-native';
import { useTheme } from '../../providers/theme';
import { Text } from './Text';


export function Alert({ title, message, tone = 'info' }: { title?: string; message: string; tone?: 'info'|'success'|'warning'|'error' }) {
const { colors, radii, spacing } = useTheme()
const map = {
info: { bg: colors.gray100, fg: colors.gray800, border: colors.gray300 },
success: { bg: '#eaffdd', fg: colors.gray800, border: '#c5f7a3' },
warning: { bg: '#FFF6CF', fg: colors.gray800, border: colors.warning },
error: { bg: '#FFE1E1', fg: colors.gray800, border: colors.error },
}[tone]
return (
<View style={{ backgroundColor: map.bg, borderColor: map.border, borderWidth: 1, borderRadius: radii.sm, padding: spacing.md }}>
{title ? <Text variant='h3' style={{ fontWeight: '700', color: map.fg, marginBottom: 4 }}>{title}</Text> : null}
<Text style={{ color: map.fg }}>{message}</Text>
</View>
)
}
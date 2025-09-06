import { TextInput, TextInputProps } from 'react-native'
import { useTheme } from '../../providers/theme'


export function Input(props: TextInputProps) {
const { colors, radii, spacing } = useTheme()
return (
<TextInput
{...props}
scrollEnabled={false}
placeholderTextColor={colors.gray500}
style={[{ borderColor: colors.border, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, color: colors.text, backgroundColor: colors.white }, props.style]}
/>
)
}
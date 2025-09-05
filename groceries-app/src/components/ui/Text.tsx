import { Text as RNText, TextProps } from 'react-native';
import { useTheme } from '../../providers/theme';


export function Text(props: TextProps & { variant?: 'h1'|'h2'|'h3'|'body'|'small'; color?: string }) {
const { colors, typography } = useTheme()
const { variant = 'body', style, color, ...rest } = props
const size = typography[variant]
return <RNText {...rest} style={[{ fontSize: size, color: color ?? colors.text }, style]} />
}
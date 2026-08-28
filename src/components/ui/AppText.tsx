import { Text, type TextProps } from 'react-native';
import { type } from '../../theme/tokens';

export type TextVariant = keyof typeof type;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

/** Themed text — always use this instead of the raw <Text>. */
export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[type[variant], color ? { color } : null, style]} />;
}

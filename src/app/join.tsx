import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Deep-link target: restaurantapp://join?restaurant=123&table=12&session=abc123
 * Validates params and lands the guest on the welcome screen. In production the
 * session token would be verified server-side before the session is joined.
 */
export default function JoinRoute() {
  const params = useLocalSearchParams<{ restaurant?: string; table?: string; session?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/welcome',
        params: { restaurant: params.restaurant ?? '123', table: params.table ?? '12', session: params.session ?? 'abc123' },
      }}
    />
  );
}

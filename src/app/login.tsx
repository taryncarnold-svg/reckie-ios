import { makeRedirectUri } from 'expo-auth-session';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Colors, Fonts, Radii } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const redirectTo = makeRedirectUri();

/** Same fallback order the web app uses in complete-auth-handoff.ts. */
const OTP_TYPES = ['email', 'magiclink', 'signup'] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    setSending(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
      setCode('');
    }
  };

  const verifyCode = async () => {
    const token = code.replace(/\D/g, '');
    if (token.length < 6 || verifying) return;
    // Supabase OTP length is configurable (this project sends 8 digits) — accept 6-8.
    setVerifying(true);
    setError(null);

    // The Reckie magic-link email template includes a 6-digit code ({{ .Token }}).
    // Verifying it directly avoids the email link, which is hardcoded to myreckie.com.
    let lastError = 'That code didn’t work. Codes expire — try requesting a new one.';
    for (const type of OTP_TYPES) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type,
      });
      if (!verifyError) return; // session lands via onAuthStateChange
      lastError = verifyError.message;
    }
    setVerifying(false);
    setError(lastError);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Onboarding entrance (DESIGN.md §5): the oxblood panel. */}
      <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
        <Text style={styles.wordmark}>
          Reckie<Text style={styles.wordmarkDot}>.</Text>
        </Text>
        <View style={styles.heroBottom}>
          <Text style={styles.eyebrow}>FROM PEOPLE YOU ACTUALLY KNOW</Text>
          <Text style={styles.headline}>Put your name{'\n'}on it.</Text>
          <Text style={styles.tagline}>
            The restaurants, films, and records you vouch for — passed hand to hand.
          </Text>
        </View>
      </View>

      {sent ? (
        <View style={styles.form}>
          <Text style={styles.sentHeading}>Check your email</Text>
          <Text style={styles.sentBody}>
            We sent a code to {email.trim()}. Enter it below to sign in.
          </Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="12345678"
            placeholderTextColor={Colors.muted}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={8}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={verifyCode}
          />
          <PressableScale
            style={styles.button}
            haptic="medium"
            onPress={verifyCode}
            disabled={verifying || code.replace(/\D/g, '').length < 6}>
            {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </PressableScale>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale
            style={styles.secondaryButton}
            haptic="selection"
            onPress={() => {
              setSent(false);
              setError(null);
            }}>
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </PressableScale>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={sendMagicLink}
          />
          <PressableScale style={styles.button} haptic="medium" onPress={sendMagicLink} disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send magic link</Text>
            )}
          </PressableScale>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.devHint}>Link redirects to {redirectTo}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hero: {
    flex: 1,
    backgroundColor: Colors.oxblood,
    paddingHorizontal: 28,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: '#fff',
  },
  wordmarkDot: {
    color: Colors.marigold,
  },
  heroBottom: {
    gap: 12,
  },
  eyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 11.5,
    letterSpacing: 1.8,
    color: Colors.marigold,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
    color: '#fff',
  },
  tagline: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.78)',
    maxWidth: 300,
  },
  form: {
    gap: 12,
    paddingHorizontal: 28,
  },
  input: {
    backgroundColor: Colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    borderRadius: Radii.input,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: Fonts.sans,
    fontSize: 16,
    color: Colors.ink,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 5,
    fontVariant: ['tabular-nums'],
  },
  button: {
    backgroundColor: Colors.ink,
    borderRadius: Radii.button,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    fontFamily: Fonts.sansSemiBold,
    color: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontFamily: Fonts.sansMedium,
    color: Colors.oxblood,
    fontSize: 15,
  },
  sentHeading: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.ink,
  },
  sentBody: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.ink2,
  },
  error: {
    fontFamily: Fonts.sans,
    color: Colors.oxblood,
    fontSize: 13,
  },
  devHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.ink3,
    textAlign: 'center',
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { makeRedirectUri } from 'expo-auth-session';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
const OTP_TYPES = ['email', 'magiclink', 'signup'] as const;

type AuthMode = 'phone' | 'email';

const DEMO_CARDS = [
  {
    id: 'yours',
    mine: true,
    tall: true,
    label: 'Your reckie',
    title: 'Tomorrow, and Tomorrow, and Tomorrow',
    note: '"Couldn\'t put it down."',
    meta: 'Gabrielle Zevin · Novel',
    colors: ['#3A6E78', '#1C3A42'] as const,
    marker: '✓',
    markerLabel: 'Yours',
  },
  {
    id: 'dad',
    mine: false,
    tall: false,
    label: "Dad's reckie",
    title: 'Sushi Noz',
    note: '"Best sushi I\'ve had in LA."',
    meta: 'Google 4.8 · Los Angeles',
    colors: ['#C9A88E', '#8A6A4E'] as const,
    marker: '✦',
    markerLabel: 'Save',
  },
  {
    id: 'cam',
    mine: false,
    tall: true,
    label: "Cam's reckie",
    title: 'Severance',
    note: '"Watch with no spoilers."',
    meta: '97% RT · Apple TV+',
    colors: ['#4A465E', '#1F1D2E'] as const,
    marker: '✦',
    markerLabel: 'Save',
  },
] as const;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('email');
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
    setVerifying(true);
    setError(null);
    let lastError = 'That code didn’t work. Codes expire — try requesting a new one.';
    for (const type of OTP_TYPES) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type,
      });
      if (!verifyError) return;
      lastError = verifyError.message;
    }
    setVerifying(false);
    setError(lastError);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>
          Reckie<Text style={styles.wordmarkDot}>.</Text>
        </Text>

        {sent ? (
          <View style={styles.verifyBlock}>
            <Text style={styles.sentHeading}>Check your email</Text>
            <Text style={styles.sentBody}>We sent a code to {email.trim()}.</Text>
            <TextInput
              style={[styles.field, styles.codeInput]}
              placeholder="12345678"
              placeholderTextColor={Colors.ink3}
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
              style={styles.cta}
              haptic="medium"
              onPress={verifyCode}
              disabled={verifying || code.replace(/\D/g, '').length < 6}>
              {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Sign in</Text>}
            </PressableScale>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PressableScale
              style={styles.linkBtn}
              haptic="selection"
              onPress={() => {
                setSent(false);
                setError(null);
              }}>
              <Text style={styles.linkText}>Use a different email</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.title}>Your favorite people's favorite stuff.</Text>
              <Text style={styles.sub}>
                Keep, organize, and share everything you and your people swear by.
              </Text>
            </View>

            <View style={styles.cards}>
              {DEMO_CARDS.map((card) => (
                <View key={card.id} style={[styles.rc, card.mine && styles.rcMine, card.tall && styles.rcTall]}>
                  <LinearGradient colors={[...card.colors]} style={[styles.rcImg, card.tall && styles.rcImgTall]} />
                  <View style={styles.rcMeat}>
                    <Text style={[styles.rcLabel, card.mine && styles.rcLabelMine]}>{card.label}</Text>
                    <Text style={styles.rcName} numberOfLines={2}>
                      {card.title}
                    </Text>
                    <Text style={styles.rcNote} numberOfLines={1}>
                      {card.note}
                    </Text>
                    <Text style={styles.rcMeta} numberOfLines={1}>
                      {card.meta}
                    </Text>
                  </View>
                  <View style={styles.rcSave}>
                    <View style={[styles.rcSaveBtn, card.mine && styles.rcSaveBtnMine]}>
                      <Text style={[styles.rcSaveIcon, card.mine && styles.rcSaveIconMine]}>{card.marker}</Text>
                    </View>
                    <Text style={[styles.rcSaveLbl, card.mine && styles.rcSaveLblMine]}>{card.markerLabel}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.foot}>
              <View style={styles.toggle}>
                <PressableScale
                  style={[styles.toggleOpt, authMode === 'phone' && styles.toggleOptOn]}
                  haptic="selection"
                  onPress={() => setAuthMode('phone')}>
                  <Text style={[styles.toggleText, authMode === 'phone' && styles.toggleTextOn]}>Phone</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.toggleOpt, authMode === 'email' && styles.toggleOptOn]}
                  haptic="selection"
                  onPress={() => setAuthMode('email')}>
                  <Text style={[styles.toggleText, authMode === 'email' && styles.toggleTextOn]}>Email</Text>
                </PressableScale>
              </View>

              {authMode === 'email' ? (
                <TextInput
                  style={styles.field}
                  placeholder="you@example.com"
                  placeholderTextColor="#B5AFA4"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={sendMagicLink}
                />
              ) : (
                <View style={styles.field}>
                  <Text style={styles.fieldPrefix}>🇺🇸 +1</Text>
                  <Text style={styles.fieldPlaceholder}>(555) 123-4567</Text>
                </View>
              )}

              <PressableScale
                style={styles.cta}
                haptic="medium"
                onPress={authMode === 'email' ? sendMagicLink : undefined}
                disabled={authMode === 'phone' || sending || !email.trim()}>
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>
                    {authMode === 'email' ? 'Get started' : 'Phone sign-in coming soon'}
                  </Text>
                )}
              </PressableScale>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.reassure}>
                {authMode === 'email'
                  ? 'We’ll email a code to verify. Use the address your people know you by.'
                  : 'We’ll text a code to verify. Use the number your people have for you so they can find you.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    flexGrow: 1,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 23,
    letterSpacing: -0.4,
    color: Colors.ink,
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 26,
  },
  wordmarkDot: {
    color: Colors.oxblood,
  },
  head: {
    paddingHorizontal: 26,
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.displayMedium,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 34,
    color: Colors.ink,
    marginBottom: 12,
  },
  sub: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.ink2,
  },
  cards: {
    paddingHorizontal: 20,
    gap: 11,
    marginBottom: 24,
  },
  rc: {
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line2,
    borderRadius: Radii.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  rcMine: {
    borderColor: '#E8D5BC',
    backgroundColor: Colors.paper2,
  },
  rcTall: {},
  rcImg: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  rcImgTall: {
    width: 50,
    height: 70,
  },
  rcMeat: {
    flex: 1,
    minWidth: 0,
  },
  rcLabel: {
    fontFamily: Fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.65,
    textTransform: 'uppercase',
    color: Colors.oxblood,
    marginBottom: 3,
  },
  rcLabelMine: {
    color: Colors.marigoldDeep,
  },
  rcName: {
    fontFamily: Fonts.display,
    fontSize: 17,
    letterSpacing: -0.15,
    lineHeight: 19,
    color: Colors.ink,
    marginBottom: 3,
  },
  rcNote: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 16,
    marginBottom: 2,
  },
  rcMeta: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: Colors.ink3,
  },
  rcSave: {
    alignItems: 'center',
    gap: 2,
  },
  rcSaveBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.oxbloodSoft,
    borderWidth: 1,
    borderColor: Colors.oxbloodLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcSaveBtnMine: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  rcSaveIcon: {
    fontSize: 16,
    color: Colors.oxblood,
  },
  rcSaveIconMine: {
    color: '#fff',
  },
  rcSaveLbl: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 9.5,
    color: Colors.oxblood,
  },
  rcSaveLblMine: {
    color: Colors.ink2,
  },
  foot: {
    paddingHorizontal: 24,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#F1ECE3',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  toggleOpt: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  toggleOptOn: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13.5,
    color: Colors.ink3,
  },
  toggleTextOn: {
    color: Colors.ink,
  },
  field: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0DBD0',
    borderRadius: Radii.button,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.ink,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldPrefix: {
    fontFamily: Fonts.sansMedium,
    color: Colors.ink3,
  },
  fieldPlaceholder: {
    fontFamily: Fonts.sans,
    color: '#B5AFA4',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 5,
    fontVariant: ['tabular-nums'],
  },
  cta: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: Colors.ink,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15.5,
    color: '#fff',
  },
  reassure: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.ink3,
    textAlign: 'center',
    marginTop: 12,
  },
  verifyBlock: {
    paddingHorizontal: 24,
    gap: 12,
  },
  sentHeading: {
    fontFamily: Fonts.displayMedium,
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
    textAlign: 'center',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.oxblood,
  },
});

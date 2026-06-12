import type { TextInputProps } from 'react-native';

/** Notes, bios — full iOS writing aids including double-space → period. */
export const NOTE_INPUT_PROPS: TextInputProps = {
  autoCorrect: true,
  spellCheck: true,
  autoCapitalize: 'sentences',
  keyboardType: 'default',
  textContentType: 'none',
};

export const SEARCH_INPUT_PROPS: TextInputProps = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none',
  keyboardType: 'default',
};

export const EMAIL_INPUT_PROPS: TextInputProps = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none',
  keyboardType: 'email-address',
  textContentType: 'emailAddress',
  autoComplete: 'email',
};

export const OTP_INPUT_PROPS: TextInputProps = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none',
  keyboardType: 'number-pad',
  textContentType: 'oneTimeCode',
  autoComplete: 'one-time-code',
};

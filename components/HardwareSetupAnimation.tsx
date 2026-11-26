/**
 * How a NeuraiHW (LilyGO T-Display-S3, ESP32-S3) creates its wallet: the
 * board drawn with simple lines and, on its 320 × 170 screen, the firmware's
 * own screens (texts, colours, sizes and positions from ESP32-testing's
 * `src/ui/screens`): "Add wallet" → Create, the phrase length, the dice that
 * gather randomness while Select is pressed at random moments, then "REVIEW
 * SEED" with the words. It stops on the words, the steps beside it ticked, and
 * a note appears: those words are the backup. The Select button lights up as
 * it is pressed. With "reduce motion" on it shows the words straight away.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

import loc from '../loc';
import { ConnectNoticeCard } from './ConnectUI';
import Icon from './Icon';
import { useSettingsPalette } from './settings/SettingsUI';

const NEURAI_LOGO = require('../img/addWallet/neurai.png');

// ─── The board (a viewBox of VB_W × VB_H) ────────────────────────────────────
const VB_W = 380;
const VB_H = 178;
/** The screen's active area on the board: 320 × 170 pixels. */
const LCD = { x: 76, y: 20, w: 260, h: (260 * 170) / 320 };
/** BOOT (top corner) is Down; the side button is Select. */
const BTN_DOWN = { x: 37, y: 35 };
const BTN_SELECT = { x: 37, y: 143 };

// ─── The firmware's palette (src/ui/Theme.h) ────────────────────────────────
const T = {
  BG: '#05070A',
  CARD: '#111722',
  CARD_2: '#1A2230',
  BORDER: '#243246',
  PRIMARY: '#2DD4BF',
  AMBER: '#F5B942',
  SEL_FG: '#F97316',
  SEL_BG: '#3A1C06',
  TEXT: '#F2F5F7',
  DIM: '#8597A6',
  GREEN: '#22C55E',
};

/** Illustration only: words of the BIP39 list, not anyone's wallet. */
const SAMPLE_WORDS = ['ocean', 'maple', 'tiger', 'velvet', 'cabin', 'orbit', 'lemon', 'harbor'];
const PRESSES = 40;
/** Pips lit for faces 1..6, index row * 3 + col: GenerateSeedScreen's kFaceMask, as lists. */
const FACE_PIPS = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const PIP_CELLS = [6, 17, 28];

// How long each screen stays before its button is pressed (ms), and the dice's pace.
const MENU_MS = 2300;
const DICE_MS = 4400;
const DICE_FRAME_MS = 90;

// ─── Firmware screens, at 320 × 170 ─────────────────────────────────────────

/** The firmware separates its hints with runs of spaces: keep them (non-breaking, never collapsed). */
const gap = (text: string) => text.replace(/ {2,}/g, run => '\u00a0'.repeat(run.length));

/** A big choice button (theme::choiceCard / paintChoiceCard). */
const ChoiceCard: React.FC<{ x: number; y: number; w: number; h: number; active: boolean; children: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  active,
  children,
}) => <View style={[lcd.card, { left: x, top: y, width: w, height: h }, active ? lcd.cardActive : lcd.cardIdle]}>{children}</View>;

/** WalletMethodScreen: "Add wallet", Create (selected) or Restore. */
const AddWalletScreen: React.FC = () => (
  <>
    <Image source={NEURAI_LOGO} style={lcd.logo} />
    <Text style={[lcd.t16, lcd.text, lcd.at60x16]}>Add wallet</Text>
    <Text style={[lcd.t12, lcd.dim, lcd.at60x36]}>Create a new seed or restore one</Text>
    <ChoiceCard x={18} y={60} w={138} h={88} active>
      <Icon name="add" type="material" size={30} color={T.SEL_FG} />
      <Text style={[lcd.t16, lcd.sel]}>Create</Text>
    </ChoiceCard>
    <ChoiceCard x={164} y={60} w={138} h={88} active={false}>
      <Icon name="refresh" type="material" size={28} color={T.TEXT} />
      <Text style={[lcd.t16, lcd.text]}>Restore</Text>
    </ChoiceCard>
    <Text style={[lcd.t12, lcd.dim, lcd.hint4]}>{gap('Down: switch     Select: choose')}</Text>
  </>
);

/** SeedWordCountScreen: "Create wallet", 12 (selected) or 24 words. */
const WordCountScreen: React.FC = () => (
  <>
    <Text style={[lcd.t20, lcd.primary, lcd.at16x14]}>Create wallet</Text>
    <Text style={[lcd.t12, lcd.dim, lcd.at16x42]}>Select recovery phrase length</Text>
    <ChoiceCard x={32} y={64} w={120} h={76} active>
      <Text style={[lcd.t28, lcd.sel]}>12</Text>
      <Text style={[lcd.t14, lcd.sel]}>words</Text>
    </ChoiceCard>
    <ChoiceCard x={168} y={64} w={120} h={76} active={false}>
      <Text style={[lcd.t28, lcd.text]}>24</Text>
      <Text style={[lcd.t14, lcd.dim]}>words</Text>
    </ChoiceCard>
    <Text style={[lcd.t12, lcd.dim, lcd.hint8]}>{gap('Down: switch     Select: next     Both: back')}</Text>
  </>
);

const Die: React.FC<{ x: number; y: number; face: number }> = ({ x, y, face }) => (
  <View style={[lcd.die, { left: x, top: y }]}>
    {FACE_PIPS[face].map(pip => (
      <View key={pip} style={[lcd.pip, { left: PIP_CELLS[pip % 3], top: PIP_CELLS[Math.floor(pip / 3)] }]} />
    ))}
  </View>
);

/** GenerateSeedScreen: eight tumbling dice, the presses gathered and the bar. */
const DiceScreen: React.FC<{ faces: number[]; presses: number }> = ({ faces, presses }) => (
  <>
    <Text style={[lcd.t20, lcd.primary, lcd.at12x8]}>Create wallet</Text>
    <Text style={[lcd.t16, lcd.text, lcd.counter]}>{`${presses} / ${PRESSES}`}</Text>
    {faces.map((face, i) => (
      <Die key={i} x={56 + (i % 4) * 56} y={i < 4 ? 40 : 92} face={face} />
    ))}
    <View style={lcd.barTrack}>
      <View style={[lcd.barFill, { width: `${(presses / PRESSES) * 100}%` }]} />
    </View>
    <Text style={[lcd.t12, lcd.dim, lcd.hint4]}>
      {presses >= PRESSES ? 'Generating seed...' : gap('Press SELECT at random moments   Both: back')}
    </Text>
  </>
);

/** SeedShowScreen, first page: eight words in two columns of four. */
const ReviewSeedScreen: React.FC = () => (
  <>
    <Text style={[lcd.t12, lcd.amber, lcd.at8x6]}>REVIEW SEED</Text>
    <Text style={[lcd.t12, lcd.dim, lcd.topRight6]}>12 words - Mainnet - Legacy</Text>
    {SAMPLE_WORDS.map((word, i) => (
      <Text key={word} style={[lcd.t14, lcd.text, lcd.word, { left: Math.floor(i / 4) * 152 + 16, top: 24 + (i % 4) * 25 }]}>
        {`${i + 1}. ${word}`}
      </Text>
    ))}
    <Text style={[lcd.t12, lcd.dim, lcd.at8x126]}>{gap('Btn 1: Next page   Btn 2: Cancel')}</Text>
    <Text style={[lcd.t12, lcd.dim, lcd.page]}>1/2</Text>
    <Text style={[lcd.t12, lcd.green, lcd.at64x140]}>Hold both to continue</Text>
    <View style={lcd.holdTrack} />
  </>
);

// ─── The animation ──────────────────────────────────────────────────────────

const randomFaces = () => Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 6));

const HardwareSetupAnimation: React.FC = () => {
  const p = useSettingsPalette();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [faces, setFaces] = useState(randomFaces);
  const [presses, setPresses] = useState(0);
  const select = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // One run of the sequence; `run` replays it.
  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      setStep(3);
      return;
    }
    setStep(0);
    setPresses(0);
    const flash = () => {
      select.value = withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 220 }));
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    // Add wallet → Select on Create; phrase length → Select on 12.
    at(MENU_MS - 250, flash);
    at(MENU_MS, () => setStep(1));
    at(2 * MENU_MS - 250, flash);
    at(2 * MENU_MS, () => setStep(2));
    // The dice: Select pressed now and then, each press counted.
    const pressEvery = (DICE_MS - 700) / PRESSES;
    for (let i = 1; i <= PRESSES; i++) {
      at(2 * MENU_MS + i * pressEvery, () => {
        setPresses(i);
        if (i % 3 === 0) flash();
      });
    }
    at(2 * MENU_MS + DICE_MS, () => setStep(3));
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, run, select]);

  // The dice tumble while they are on screen.
  useEffect(() => {
    if (step !== 2) return;
    const tumble = setInterval(() => setFaces(randomFaces()), DICE_FRAME_MS);
    return () => clearInterval(tumble);
  }, [step]);

  const selectLit = useAnimatedStyle(() => ({ opacity: select.value }));

  const boardW = Math.min(VB_W, width - 64);
  const k = boardW / VB_W;
  const done = step === 3;
  const labels = [
    loc.wallets.hw_backup_step_new,
    loc.wallets.hw_backup_step_words,
    loc.wallets.hw_backup_step_random,
    loc.wallets.hw_backup_step_show,
  ];
  const boardSize = { width: boardW, height: VB_H * k };
  const lcdBox = { left: LCD.x * k, top: LCD.y * k, width: LCD.w * k, height: LCD.h * k };
  const selectLight = { left: (BTN_SELECT.x - 9) * k, top: (BTN_SELECT.y - 9) * k, width: 18 * k, height: 18 * k, borderRadius: 9 * k };
  const screenScale = { transform: [{ scale: (LCD.w * k) / 320 }] };

  return (
    <View style={styles.root}>
      <View style={boardSize} accessible accessibilityRole="image" accessibilityLabel={loc.wallets.hw_backup_device_label}>
        <Svg width={boardW} height={VB_H * k} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {/* Board, screen glass and its flex cable. */}
          <Rect x={10} y={8} width={360} height={162} rx={12} fill={p.card} stroke={p.ink} strokeWidth={2.2} />
          <Rect x={60} y={14} width={286} height={150} rx={6} fill="none" stroke={p.mutedOnCard} strokeWidth={1.5} />
          <Rect x={64} y={20} width={7} height={138} rx={2} fill="none" stroke={p.mutedOnCard} strokeWidth={1.2} />
          <Rect x={LCD.x} y={LCD.y} width={LCD.w} height={LCD.h} rx={3} fill={T.BG} />
          {/* USB-C between the two buttons, on the left end: its long side along the board's edge. */}
          <Rect x={2} y={63} width={30} height={52} rx={10} fill={p.card} stroke={p.ink} strokeWidth={2} />
          <Rect x={10} y={72} width={13} height={34} rx={6.5} fill="none" stroke={p.ink} strokeWidth={1.5} />
          {[BTN_DOWN, BTN_SELECT].map(b => (
            <React.Fragment key={b.y}>
              <Rect x={b.x - 13} y={b.y - 13} width={26} height={26} rx={5} fill="none" stroke={p.ink} strokeWidth={1.8} />
              <Circle cx={b.x} cy={b.y} r={6} fill="none" stroke={p.ink} strokeWidth={1.5} />
            </React.Fragment>
          ))}
          {/* The maker on the right end; the pin header is under the screen, out of sight. */}
          <Circle cx={358} cy={26} r={5.5} fill="none" stroke={p.mutedOnCard} strokeWidth={1.4} />
          <SvgText x={358} y={92} fontSize={11} fontWeight="700" fill={p.mutedOnCard} textAnchor="middle" transform="rotate(90 358 92)">
            LILYGO
          </SvgText>
        </Svg>
        <Animated.View pointerEvents="none" style={[styles.light, selectLight, { backgroundColor: p.accent }, selectLit]} />
        <View style={[styles.lcd, lcdBox]}>
          <Animated.View
            key={`${run}-${step}`}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(120)}
            style={[lcd.screen, screenScale]}
          >
            {step === 0 ? (
              <AddWalletScreen />
            ) : step === 1 ? (
              <WordCountScreen />
            ) : step === 2 ? (
              <DiceScreen faces={faces} presses={presses} />
            ) : (
              <ReviewSeedScreen />
            )}
          </Animated.View>
        </View>
      </View>

      <View style={styles.steps}>
        {labels.map((label, index) => {
          const reached = index <= step;
          const current = index === step;
          return (
            <View key={label} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: reached ? p.accent : p.ground }]}>
                {index < step ? (
                  <Icon name="check" type="material" size={14} color={p.onAccent} />
                ) : (
                  <Text style={[styles.stepNumber, { color: reached ? p.onAccent : p.mutedOnCard }]}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepText, { color: reached ? p.ink : p.mutedOnCard }, current && styles.stepCurrent]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {done ? (
        <Animated.View entering={FadeInDown.duration(320)} style={styles.done}>
          <ConnectNoticeCard tone="warn" text={loc.wallets.hw_backup_words} testID="HardwareBackupWordsNote" />
          <Pressable
            onPress={() => setRun(n => n + 1)}
            accessibilityRole="button"
            testID="HardwareBackupReplay"
            style={({ pressed }) => [styles.replay, pressed && styles.dim]}
          >
            <Icon name="replay" type="material" size={18} color={p.accentText} />
            <Text style={[styles.replayText, { color: p.accentText }]}>{loc.wallets.hw_backup_replay}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default HardwareSetupAnimation;

const styles = StyleSheet.create({
  root: { alignItems: 'center', rowGap: 18 },
  light: { position: 'absolute' },
  lcd: { position: 'absolute', overflow: 'hidden', borderRadius: 3 },
  steps: { alignSelf: 'stretch', rowGap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14 },
  stepCurrent: { fontWeight: '700' },
  done: { alignSelf: 'stretch', rowGap: 6 },
  replay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 6, minHeight: 44 },
  replayText: { fontSize: 14, fontWeight: '600' },
  dim: { opacity: 0.6 },
});

/** The firmware's screens, laid out in its own 320 × 170 pixels. */
const lcd = StyleSheet.create({
  screen: { position: 'absolute', left: 0, top: 0, width: 320, height: 170, backgroundColor: T.BG, transformOrigin: 'top left' },
  logo: { position: 'absolute', left: 12, top: 10, width: 40, height: 40 },
  // Line heights of the firmware's Montserrat sizes, so stacked labels do not overlap.
  t12: { fontSize: 12, lineHeight: 14, fontWeight: '500' },
  t14: { fontSize: 14, lineHeight: 17, fontWeight: '500' },
  t16: { fontSize: 16, lineHeight: 19, fontWeight: '600' },
  t20: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  t28: { fontSize: 28, fontWeight: '600', lineHeight: 32 },
  text: { color: T.TEXT },
  dim: { color: T.DIM },
  sel: { color: T.SEL_FG },
  primary: { color: T.PRIMARY },
  amber: { color: T.AMBER },
  green: { color: T.GREEN },
  at60x16: { position: 'absolute', left: 60, top: 14 },
  at60x36: { position: 'absolute', left: 60, top: 35 },
  at16x14: { position: 'absolute', left: 16, top: 12 },
  at16x42: { position: 'absolute', left: 16, top: 41 },
  at12x8: { position: 'absolute', left: 12, top: 6 },
  at8x6: { position: 'absolute', left: 8, top: 5 },
  at8x126: { position: 'absolute', left: 8, top: 125 },
  at64x140: { position: 'absolute', left: 64, top: 139 },
  counter: { position: 'absolute', right: 12, top: 10 },
  topRight6: { position: 'absolute', right: 8, top: 5 },
  page: { position: 'absolute', right: 8, top: 125 },
  hint4: { position: 'absolute', left: 0, right: 0, bottom: 3, textAlign: 'center' },
  hint8: { position: 'absolute', left: 0, right: 0, bottom: 7, textAlign: 'center' },
  card: {
    position: 'absolute',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardActive: { backgroundColor: T.SEL_BG, borderColor: T.SEL_FG, borderWidth: 2 },
  cardIdle: { backgroundColor: T.CARD, borderColor: T.BORDER, borderWidth: 1 },
  die: { position: 'absolute', width: 40, height: 40, borderRadius: 7, backgroundColor: '#ffffff' },
  pip: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#000000' },
  barTrack: {
    position: 'absolute',
    left: 50,
    top: 138,
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.CARD_2,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: T.PRIMARY },
  word: { position: 'absolute' },
  holdTrack: { position: 'absolute', left: 64, top: 158, width: 244, height: 7, borderRadius: 4, backgroundColor: T.CARD_2 },
});

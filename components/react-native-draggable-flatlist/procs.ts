import Animated, { clockRunning, not, startClock, stopClock } from 'react-native-reanimated';
import { isWeb } from './constants';

const { set, cond, add, sub, block, eq, neq, and, divide, greaterThan, greaterOrEq, Value, spring, lessThan, lessOrEq, multiply } =
  Animated;

if (!Animated.proc) {
  throw new Error('Incompatible Reanimated version (proc not found)');
}

// clock procs don't seem to work in web, not sure if there's a perf benefit to web procs anyway?
const proc = isWeb ? <T>(cb: T) => cb : Animated.proc;

export const getIsAfterActive = proc((currentIndex: Animated.Node<number>, activeIndex: Animated.Node<number>) =>
  greaterThan(currentIndex, activeIndex),
);

export const hardReset = proc(
  (position: Animated.Value<number>, finished: Animated.Value<number>, time: Animated.Value<number>, toValue: Animated.Value<number>) =>
    block([set(position, 0), set(finished, 0), set(time, 0), set(toValue, 0)]),
);

/**
 * The in react-native-reanimated.d.ts definition of `proc` only has generics
 * for up to 10 arguments. We cast it to accept any params to avoid errors when
 * type-checking.
 */
type RetypedProc = (cb: (...params: any) => Animated.Node<number>) => typeof cb;

export const setupCell = proc(
  (
    currentIndex: Animated.Value<number>,
    size: Animated.Node<number>,
    offset: Animated.Node<number>,
    isAfterActive: Animated.Value<number>,
    prevToValue: Animated.Value<number>,
    prevSpacerIndex: Animated.Value<number>,
    activeIndex: Animated.Node<number>,
    activeCellSize: Animated.Node<number>,
    hoverOffset: Animated.Node<number>,
    spacerIndex: Animated.Value<number>,
    toValue: Animated.Value<number>,
    position: Animated.Value<number>,
    time: Animated.Value<number>,
    finished: Animated.Value<number>,
    runSpring: Animated.Node<number>,
    onFinished: Animated.Node<number>,
    isDraggingCell: Animated.Node<number>,
    placeholderOffset: Animated.Value<number>,
    prevIsDraggingCell: Animated.Value<number>,
    clock: Animated.Clock,
    disabled: Animated.Node<number>,
  ) =>
    block([
      cond(
        greaterThan(activeIndex, -1),
        [
          // Only update spacer if touch is not disabled.
          // Fixes android bugs where state would update with invalid touch values on touch end.
          cond(not(disabled), [
            // Determine whether this cell is after the active cell in the list
            set(isAfterActive, getIsAfterActive(currentIndex, activeIndex)),

            // Determining spacer index is hard to visualize, see diagram: https://i.imgur.com/jRPf5t3.jpg
            cond(
              isAfterActive,
              [
                cond(
                  and(
                    greaterOrEq(add(hoverOffset, activeCellSize), offset),
                    lessThan(add(hoverOffset, activeCellSize), add(offset, divide(size, 2))),
                  ),
                  set(spacerIndex, sub(currentIndex, 1)),
                ),
                cond(
                  and(
                    greaterOrEq(add(hoverOffset, activeCellSize), add(offset, divide(size, 2))),
                    lessThan(add(hoverOffset, activeCellSize), add(offset, size)),
                  ),
                  set(spacerIndex, currentIndex),
                ),
              ],
              cond(lessThan(currentIndex, activeIndex), [
                cond(
                  and(lessThan(hoverOffset, add(offset, size)), greaterOrEq(hoverOffset, add(offset, divide(size, 2)))),
                  set(spacerIndex, add(currentIndex, 1)),
                ),
                cond(
                  and(greaterOrEq(hoverOffset, offset), lessThan(hoverOffset, add(offset, divide(size, 2)))),
                  set(spacerIndex, currentIndex),
                ),
              ]),
            ),
            // Set placeholder offset
            cond(eq(spacerIndex, currentIndex), [
              set(placeholderOffset, cond(isAfterActive, add(sub(offset, activeCellSize), size), offset)),
            ]),
          ]),

          cond(
            eq(currentIndex, activeIndex),
            [
              // If this cell is the active cell
              cond(
                isDraggingCell,
                [
                  // Set its position to the drag position
                  set(position, sub(hoverOffset, offset)),
                ],
                [
                  // Active item, not pressed in

                  // Set value hovering element will snap to once released
                  cond(prevIsDraggingCell, [
                    set(toValue, sub(placeholderOffset, offset)),
                    // The clock starts automatically when toValue changes, however, we need to handle the
                    // case where the item should snap back to its original location and toValue doesn't change
                    cond(eq(prevToValue, toValue), [
                      cond(clockRunning(clock), stopClock(clock)),
                      set(time, 0),
                      set(finished, 0),
                      startClock(clock),
                    ]),
                  ]),
                ],
              ),
            ],
            [
              // Not the active item
              // Translate cell down if it is before active index and active cell has passed it.
              // Translate cell up if it is after the active index and active cell has passed it.
              set(
                toValue,
                cond(
                  cond(isAfterActive, lessOrEq(currentIndex, spacerIndex), greaterOrEq(currentIndex, spacerIndex)),
                  cond(isAfterActive, multiply(activeCellSize, -1), activeCellSize),
                  0,
                ),
              ),
            ],
          ),
          // If this cell should animate somewhere new, reset its state and start its clock
          cond(neq(toValue, prevToValue), [cond(clockRunning(clock), stopClock(clock)), set(time, 0), set(finished, 0), startClock(clock)]),

          cond(neq(prevSpacerIndex, spacerIndex), [
            cond(eq(spacerIndex, -1), [
              // Hard reset to prevent stale state bugs
              cond(clockRunning(clock), stopClock(clock)),
              hardReset(position, finished, time, toValue),
            ]),
          ]),
          cond(finished, [onFinished, set(time, 0), set(finished, 0)]),
          set(prevSpacerIndex, spacerIndex),
          set(prevToValue, toValue),
          set(prevIsDraggingCell, isDraggingCell),
          cond(clockRunning(clock), runSpring),
        ],
        [
          // // Reset the spacer index when drag ends
          cond(neq(spacerIndex, -1), set(spacerIndex, -1)),
          cond(neq(position, 0), set(position, 0)),
        ],
      ),
      position,
    ]),
);

const betterSpring = (proc as RetypedProc)(
  (
    finished: Animated.Value<number>,
    velocity: Animated.Value<number>,
    position: Animated.Value<number>,
    time: Animated.Value<number>,
    prevPosition: Animated.Value<number>,
    toValue: Animated.Value<number>,
    damping: Animated.Value<number>,
    mass: Animated.Value<number>,
    stiffness: Animated.Value<number>,
    overshootClamping: Animated.SpringConfig['overshootClamping'],
    restSpeedThreshold: Animated.Value<number>,
    restDisplacementThreshold: Animated.Value<number>,
    clock: Animated.Clock,
  ) =>
    spring(
      clock,
      {
        finished,
        velocity,
        position,
        time,
        // @ts-ignore -- https://github.com/software-mansion/react-native-reanimated/blob/master/src/animations/spring.js#L177
        prevPosition,
      },
      {
        toValue,
        damping,
        mass,
        stiffness,
        overshootClamping,
        restDisplacementThreshold,
        restSpeedThreshold,
      },
    ),
);

export function springFill(clock: Animated.Clock, state: Animated.SpringState, config: Animated.SpringConfig) {
  return betterSpring(
    state.finished,
    state.velocity,
    state.position,
    state.time,
    new Value(0),
    config.toValue,
    config.damping,
    config.mass,
    config.stiffness,
    config.overshootClamping,
    config.restSpeedThreshold,
    config.restDisplacementThreshold,
    clock,
  );
}

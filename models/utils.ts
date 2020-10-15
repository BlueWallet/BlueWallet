import { random, range, sortBy, findIndex, cloneDeep, orderBy, round } from 'lodash';

import { Utxo } from 'app/consts';

const BlueElectrum = require('../BlueElectrum');

interface Solution {
  utxos: Utxo[];
  negativeAmount: number;
}

const removeNotNeededUtxos = ({ utxos, negativeAmount }: Solution) => {
  const endIndex = utxos.length - 1;
  let nA = negativeAmount;
  let newUtxos = cloneDeep(utxos);

  for (let i = endIndex; i >= 0; i--) {
    const utxo = utxos[i];
    if (utxo.value <= -nA) {
      nA += utxo.value;
      newUtxos = [...newUtxos.slice(0, i), ...newUtxos.slice(i + 1)];
    }
  }
  return { utxos: newUtxos, negativeAmount: nA };
};

export const getUtxosFromMaxToMin = (utxos: Utxo[], amount: number): Utxo[] | null => {
  const sortedUtxos = sortBy(utxos, 'value');

  const solution: Solution = { utxos: [], negativeAmount: 0 };

  let am = amount;
  const endIndex = utxos.length - 1;

  for (let i = endIndex; i >= 0; i--) {
    const ux = sortedUtxos[i];
    am -= ux.value;

    solution.utxos.push(ux);

    if (am <= 0) {
      break;
    }
  }

  if (am > 0) {
    return null;
  }

  solution.negativeAmount = am;

  return removeNotNeededUtxos(solution).utxos;
};

export const getUtxosSolutionFromMinToMax = (utxos: Utxo[], amount: number): Solution | null => {
  const sortedUtxos = sortBy(utxos, 'value');
  const solution: Solution = { utxos: [], negativeAmount: 0 };

  let am = amount;
  for (let i = 0; i < sortedUtxos.length; i++) {
    const ux = sortedUtxos[i];
    am -= ux.value;

    solution.utxos.push(ux);

    if (am <= 0) {
      break;
    }
  }

  if (am > 0) {
    return null;
  }

  solution.negativeAmount = am;

  return removeNotNeededUtxos(solution);
};

export const getUtxosFromMinToMax = (utxos: Utxo[], amount: number): Utxo[] | null => {
  const sol = getUtxosSolutionFromMinToMax(utxos, amount);

  if (sol === null) {
    return null;
  }
  return sol.utxos;
};

export const getUtxosWithMinimumRest = (utxos: Utxo[], amount: number): Utxo[] | null => {
  const TRIALS = 100;

  const firstSolution = getUtxosSolutionFromMinToMax(utxos, amount);

  if (firstSolution === null) {
    return null;
  }

  if (firstSolution.negativeAmount === 0) {
    return firstSolution.utxos;
  }

  const upperTreshold = utxos.length - 1;
  const solutions: Solution[] = range(TRIALS).map(() => ({ utxos: [], negativeAmount: 0 }));

  for (let i = 0; i < TRIALS; i++) {
    let a = amount;

    while (a > 0) {
      const randomIndex = random(0, upperTreshold);
      const u = utxos[randomIndex];
      if (findIndex(solutions[i].utxos, u) !== -1) {
        continue;
      }
      a -= u.value;
      solutions[i].utxos.push(u);
    }

    solutions[i].negativeAmount = a;
    if (solutions[i].negativeAmount === 0) {
      return solutions[i].utxos;
    }

    solutions[i] = removeNotNeededUtxos(solutions[i]);
  }

  const [bestSolution] = orderBy([...solutions, firstSolution], ['negativeAmount'], ['desc']);

  return bestSolution.utxos;
};

export const splitChange = async (value: number): Promise<number[]> => {
  const dividers = [3, 2];
  const dustValueSatoshis: number = await BlueElectrum.getDustValue();

  if (dustValueSatoshis >= value) {
    return [];
  }

  for (let i = 0; i < dividers.length; i++) {
    const divider = dividers[i];
    const dividedValue = round(value / divider, 0);

    if (dividedValue > dustValueSatoshis) {
      return range(divider).map(() => dividedValue);
    }
  }

  return [value];
};

export const getUtxosAmount = (utxos: Utxo[]): number => utxos.reduce((a, { value }) => a + value, 0);

export const getFeeValue = ({
  utxosAmount,
  restValue,
  amountSend,
}: {
  utxosAmount: number;
  restValue: number;
  amountSend: number;
}) => utxosAmount - restValue - amountSend;

import assert from 'assert';

import {
  aggregateFlowOutputs,
  buildInputOutputData,
  computeBowtieLayout,
} from '../../components/txBowtieGraphUtils';

describe('txBowtieGraphUtils', () => {
  describe('buildInputOutputData', () => {
    it('returns null when tx is null', () => {
      assert.strictEqual(buildInputOutputData(null, null, null), null);
    });

    it('returns null when txFromElectrum has no vin', () => {
      const tx = { inputs: [{ value: 1000, txid: 'abc' }], outputs: [{ value: 900 }] };
      assert.strictEqual(buildInputOutputData(tx, { vin: [], vout: [{ value: 900 }] }, 100), null);
    });

    it('builds inputData and outputData with fee from Electrum vin/vout', () => {
      const txFromElectrum = {
        vin: [
          { value: 0.00001, txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
          { value: 0.000005, txid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
        ],
        vout: [{ value: 0.000014 }, { value: 1e-8 }],
      };
      const result = buildInputOutputData(null, txFromElectrum, 1000);
      assert.ok(result);
      assert.strictEqual(result!.inputData.length, 2);
      assert.strictEqual(result!.inputData[0].type, 'input');
      assert.strictEqual(result!.inputData[0].value, 1000);
      assert.strictEqual(result!.inputData[0].txid, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      assert.strictEqual(result!.inputData[1].value, 500);
      assert.strictEqual(result!.outputData.length, 3);
      assert.strictEqual(result!.outputData[0].type, 'fee');
      assert.strictEqual(result!.outputData[0].value, 1000);
      assert.strictEqual(result!.outputData[1].type, 'output');
      assert.strictEqual(result!.outputData[2].type, 'output');
      assert.ok(result!.totalValue >= 1500);
    });

    it('prefers txFromElectrum over tx when both provided', () => {
      const tx = {
        inputs: [{ value: 1, txid: 'x' }],
        outputs: [{ value: 1 }],
      };
      const txFromElectrum = {
        vin: [{ value: 1000, txid: 'abcdef0123456789' }],
        vout: [{ value: 900 }],
      };
      const result = buildInputOutputData(tx, txFromElectrum, 100);
      assert.ok(result);
      assert.strictEqual(result!.inputData[0].value, 1000);
      assert.strictEqual(result!.inputData[0].txid, 'abcdef0123456789');
      assert.strictEqual(result!.outputData.filter(o => o.type === 'fee').length, 1);
      assert.strictEqual(result!.outputData.filter(o => o.type === 'output').length, 1);
    });

    it('converts vin value in BTC (>= 1) to sats so largest coin shows correct amount', () => {
      const txFromElectrum = {
        vin: [
          { value: 2.27707956, txid: 'ad57d3d993a34b25366b815ede424f744493684b51f0214a47608ba6e2d4300d' },
        ],
        vout: [{ value: 0.00018 }, { value: 2.27689956 }],
      };
      const result = buildInputOutputData(null, txFromElectrum, 291734);
      assert.ok(result);
      assert.strictEqual(result!.inputData[0].value, 227707956);
    });
  });

  describe('computeBowtieLayout', () => {
    it('returns hasLine true and non-empty paths for 2 inputs, 2 outputs, fee', () => {
      const inputData = [
        { type: 'input' as const, value: 1000, txid: 'aaaaaa000000' },
        { type: 'input' as const, value: 500, txid: 'bbbbbb000000' },
      ];
      const outputData = [
        { type: 'fee' as const, value: 100 },
        { type: 'output' as const, value: 900 },
        { type: 'output' as const, value: 500 },
      ];
      const totalValue = 1500;
      const layout = computeBowtieLayout(inputData, outputData, totalValue, { width: 300, height: 180 });
      assert.strictEqual(layout.hasLine, true);
      assert.ok(layout.middle.path.startsWith('M '));
      assert.strictEqual(layout.inputs.length, 2);
      assert.strictEqual(layout.outputs.length, 3);
      layout.inputs.forEach((line, i) => {
        assert.ok(line.path.length > 0);
        assert.ok(line.strokeWidth > 0);
        assert.ok(typeof line.outerY === 'number');
        assert.ok(typeof line.thickness === 'number');
      });
      layout.outputs.forEach(line => {
        assert.ok(line.path.length > 0);
        assert.ok(line.strokeWidth > 0);
        assert.ok(typeof line.outerY === 'number');
        assert.ok(typeof line.thickness === 'number');
      });
      assert.ok(typeof layout.middle.outerY === 'number');
      assert.ok(typeof layout.middle.thickness === 'number');
    });

    it('returns hasLine false when inputData or outputData is empty', () => {
      const inputData = [{ type: 'input' as const, value: 1000, txid: 'aaaaaa' }];
      const outputData: typeof inputData = [];
      const layout = computeBowtieLayout(inputData, outputData, 1000, { width: 300, height: 180 });
      assert.strictEqual(layout.hasLine, false);
    });

    it('gives input and output sides comparable total thickness when sumInputs < sumOutputs', () => {
      const inputData = [{ type: 'input' as const, value: 500, txid: 'aaaaaa000000' }];
      const outputData = [
        { type: 'fee' as const, value: 100 },
        { type: 'output' as const, value: 900 },
        { type: 'output' as const, value: 500 },
      ];
      const totalValue = 1500;
      const layout = computeBowtieLayout(inputData, outputData, totalValue, { width: 300, height: 180 });
      assert.strictEqual(layout.hasLine, true);
      assert.strictEqual(layout.inputs.length, 1);
      assert.ok(layout.inputs[0].thickness > 0);
      const inputThicknessSum = layout.inputs.reduce((s, l) => s + l.thickness, 0);
      const outputThicknessSum = layout.outputs.reduce((s, l) => s + l.thickness, 0);
      assert.ok(
        Math.abs(inputThicknessSum - outputThicknessSum) < 20,
        `input total thickness ${inputThicknessSum} should be close to output total ${outputThicknessSum}`,
      );
    });
  });

  describe('aggregateFlowOutputs', () => {
    it('keeps fee and produces fee + change strands when all outputs are ours', () => {
      const rawOutputData = [
        { type: 'fee' as const, value: 500 },
        { type: 'output' as const, value: 1000, index: 0 },
        { type: 'output' as const, value: 2000, index: 1 },
      ];
      const result = aggregateFlowOutputs(
        rawOutputData,
        2,
        i => (i === 0 ? 1000 : 2000),
        () => true,
      );
      assert.strictEqual(result.outputData.length, 3);
      assert.strictEqual(result.outputData[0].type, 'fee');
      assert.strictEqual(result.outputData[0].value, 500);
      assert.strictEqual(result.outputData[1].type, 'output');
      assert.strictEqual(result.outputData[1].value, 1000);
      assert.strictEqual(result.outputData[2].type, 'output');
      assert.strictEqual(result.outputData[2].value, 2000);
      assert.deepStrictEqual(result.meta.types, ['fee', 'change', 'change']);
    });

    it('aggregates non-wallet outputs into one other strand with rest count', () => {
      const rawOutputData = [
        { type: 'fee' as const, value: 300 },
        { type: 'output' as const, value: 1000, index: 0 },
        { type: 'output' as const, value: 500, index: 1 },
        { type: 'output' as const, value: 200, index: 2 },
      ];
      const result = aggregateFlowOutputs(
        rawOutputData,
        3,
        i => (i === 0 ? 1000 : i === 1 ? 500 : 200),
        i => i === 0,
      );
      assert.strictEqual(result.outputData.length, 3);
      assert.strictEqual(result.outputData[0].type, 'fee');
      assert.strictEqual(result.outputData[0].value, 300);
      assert.strictEqual(result.outputData[1].type, 'output');
      assert.strictEqual(result.outputData[1].value, 1000);
      assert.strictEqual(result.outputData[2].type, 'output');
      assert.strictEqual(result.outputData[2].value, 700);
      assert.strictEqual(result.outputData[2].rest, 2);
      assert.deepStrictEqual(result.meta.types, ['fee', 'change', 'other']);
    });

    it('omits other strand when no non-wallet outputs', () => {
      const rawOutputData = [
        { type: 'fee' as const, value: 100 },
        { type: 'output' as const, value: 900, index: 0 },
      ];
      const result = aggregateFlowOutputs(rawOutputData, 1, () => 900, () => true);
      assert.strictEqual(result.outputData.length, 2);
      assert.deepStrictEqual(result.meta.types, ['fee', 'change']);
    });

    it('produces only other strand when no fee and all non-wallet', () => {
      const rawOutputData = [
        { type: 'output' as const, value: 100, index: 0 },
        { type: 'output' as const, value: 200, index: 1 },
      ];
      const result = aggregateFlowOutputs(
        rawOutputData,
        2,
        i => (i === 0 ? 100 : 200),
        () => false,
      );
      assert.strictEqual(result.outputData.length, 1);
      assert.strictEqual(result.outputData[0].type, 'output');
      assert.strictEqual(result.outputData[0].value, 300);
      assert.strictEqual(result.outputData[0].rest, 2);
      assert.deepStrictEqual(result.meta.types, ['other']);
    });
  });
});

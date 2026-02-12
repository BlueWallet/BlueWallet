import assert from 'assert';

import { buildInputOutputData, computeBowtieLayout } from '../../components/txBowtieGraphUtils';

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
        if (i === 0) assert.strictEqual(line.stroke, '#aaaaaa');
        if (i === 1) assert.strictEqual(line.stroke, '#bbbbbb');
      });
      layout.outputs.forEach(line => {
        assert.ok(line.path.length > 0);
        assert.ok(line.strokeWidth > 0);
      });
    });

    it('returns hasLine false when inputData or outputData is empty', () => {
      const inputData = [{ type: 'input' as const, value: 1000, txid: 'aaaaaa' }];
      const outputData: typeof inputData = [];
      const layout = computeBowtieLayout(inputData, outputData, 1000, { width: 300, height: 180 });
      assert.strictEqual(layout.hasLine, false);
    });
  });
});

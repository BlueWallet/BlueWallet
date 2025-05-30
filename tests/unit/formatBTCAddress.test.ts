import assert from 'assert'
import { formatBTCAddress } from '../../helpers/formatBTCAddress'


describe('formatBTCAddress', () => {
  it('correctly formats a Bech32 address', () => {
    const input = 'bc1q3vjvgqhsz6yah54ezz54vmqre8n3yl6s8uetxr'
    const expected = `bc1q 3vjv gqhs z6ya h54e zz54\nvmqr e8n3 yl6s 8uet xr`
    expect(formatBTCAddress(input)).toBe(expected)
  })

  it('handles shorter P2PKH addresses', () => {
    const input = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    const expected = `1A1z P1eP 5QGe fi2D MPTf TL5S\nLmv7 Divf Na`
    expect(formatBTCAddress(input)).toBe(expected)
  })

  it('formats addresses that do not fill all 6 groups per line', () => {
    const input = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    const expected = `bc1q xy2k gdyg jrsq tzq2 n0yr\nf249 3p83 kkfj hx0w lh`
    expect(formatBTCAddress(input)).toBe(expected)
  })

  it('returns an empty string when the input is empty', () => {
    expect(formatBTCAddress('')).toBe('')
  })
})
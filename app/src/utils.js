import BN from 'bn.js';
const DECIMALS = (new BN(10)).pow(new BN(18))
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"
const EMPTY_CALLSCRIPT = '0x00000001'

function decimalize(amount){
  return (new BN(amount)).mul(DECIMALS)
}

function dedecimalize(amount){
  return (new BN(amount)).div(DECIMALS)
}

export {
  decimalize,
  dedecimalize,
  NULL_ADDRESS,
  EMPTY_CALLSCRIPT
}

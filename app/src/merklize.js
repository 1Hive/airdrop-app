const MerkleTree = require("merkle-tree-solidity").default
const { bufferToHex, keccak256, setLengthLeft, setLengthRight, toBuffer } = require("ethereumjs-util")
const csv = require('csvtojson')
const BigNumber = require('bignumber.js')

const decimals = BigNumber(10).pow(18)

module.exports = function(data, addressField, amountField, include) {
  const awards = data.reduce((prev, curr)=>{
    const address = curr[addressField]
    const existing = prev.find(u=>u.address===address)
    const amount = BigNumber(curr[amountField])
    if(existing) existing.amount = existing.amount ? existing.amount.plus(amount) : amount
    else {
      const award = {address, amount}
      if(Array.isArray(include)) include.forEach(f=>award[f]=curr[f])
      prev.push(award)
    }
    return prev
  }, [])

  const awardHashBuffers = awards.map(r=>{
    r.amount = r.amount.times(decimals)
    const addressBuffer = toBuffer(r.address)
    const amountBuffer = setLengthLeft(toBuffer("0x"+r.amount.toString(16)), 32)
    const hashBuffer = keccak256(Buffer.concat([addressBuffer, amountBuffer]))
    const hash = bufferToHex(hashBuffer)
    r.amount = r.amount.toFixed()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(awardHashBuffers)

  const root = bufferToHex(merkleTree.getRoot())

  awards.forEach((award,idx)=>{
    award.proof = merkleTree.getProof(awardHashBuffers[idx]).map(p=>bufferToHex(p))
    return award
  })

  console.log(`root:`, root)

  return {root, awards}
}

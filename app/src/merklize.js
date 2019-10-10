const MerkleTree = require("merkle-tree-solidity").default
const utils = require("ethereumjs-util")
const setLengthLeft = utils.setLengthLeft
const setLengthRight = utils.setLengthRight
const csv = require('csvtojson')
const BigNumber = require('bignumber.js')

const decimals = BigNumber(10).pow(18)

module.exports = function(data, amountField, include) {
  const awards = data.reduce((prev, curr)=>{
    const address = curr.address
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
    const addressBuffer = utils.toBuffer(r.address)
    const amountBuffer = setLengthLeft(utils.toBuffer("0x"+r.amount.toString(16)), 32)
    const hashBuffer = utils.keccak256(Buffer.concat([addressBuffer, amountBuffer]))
    const hash = utils.bufferToHex(hashBuffer)
    r.amount = r.amount.toFixed()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(awardHashBuffers)

  const root = utils.bufferToHex(merkleTree.getRoot())

  awards.forEach((award,idx)=>{
    award.proof = merkleTree.getProof(awardHashBuffers[idx]).map(p=>utils.bufferToHex(p))
    return award
  })

  console.log(`root:`, root)

  return {root, awards}
}

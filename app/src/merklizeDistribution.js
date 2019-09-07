const MerkleTree = require("merkle-tree-solidity").default
const utils = require("ethereumjs-util")
const setLengthLeft = utils.setLengthLeft
const setLengthRight = utils.setLengthRight
const csv = require('csvtojson')
const BN = require('bn.js');
const decimals = (new BN(10)).pow(new BN(18))

function merklizeDistribution(id, recipients) {
  recipients = recipients.reduce((prev, curr)=>{
    let username = curr.username.replace('u/','')
    let existing = prev.find(u=>u.username===username)
    let karma = new BN(curr.points)
    if(existing && existing.karma) existing.karma = existing.karma.add(karma)
    let currency = new BN(curr.points)
    if(existing && existing.currency) existing.currency = existing.currency.add(karma)
    else prev.push({username,karma,currency})
    return prev
  }, [])

  const recipientHashBuffers = recipients.map(r=>{
    r.karma = r.karma.mul(decimals)
    r.currency = r.currency.mul(decimals)
    // r.awardHex = web3.utils.toHex(r.award)
    // r.award = r.award.toFixed()
    // console.log(typeof u.award)
    // let usernameBuffer = utils.setLengthRight(utils.toBuffer(u.username), 32)
    let usernameBuffer = utils.toBuffer(r.username)
    // let uintBuffer = setLengthLeft(utils.toBuffer(r.awardHex), 32)
    let karmaBuffer = setLengthLeft(utils.toBuffer(r.karma), 32)
    let currencyBuffer = setLengthLeft(utils.toBuffer(r.currency), 32)
    let hashBuffer = utils.keccak256(Buffer.concat([usernameBuffer, karmaBuffer, currencyBuffer]))
    let hash = utils.bufferToHex(hashBuffer)
    // console.log(hash)
    // r.award = r.award.toFixed()
    r.karma = r.karma.toString()
    r.currency = r.currency.toString()

    return hashBuffer
  })

  const merkleTree = new MerkleTree(recipientHashBuffers)

  const root = utils.bufferToHex(merkleTree.getRoot())

  recipients = recipients.map((recipient,idx)=>{
    // recipient.root = root
    recipient.proof = merkleTree.getProof(recipientHashBuffers[idx]).map(p=>utils.bufferToHex(p))
    return recipient
  })

  console.log(`root:`, root)

  return {id, root, data: recipients}
}

export default merklizeDistribution

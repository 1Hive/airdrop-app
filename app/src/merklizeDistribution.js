const MerkleTree = require("merkle-tree-solidity").default
const utils = require("ethereumjs-util")
const setLengthLeft = utils.setLengthLeft
const setLengthRight = utils.setLengthRight
const csv = require('csvtojson')
const BN = require('bn.js');
const decimals = (new BN(10)).pow(new BN(18))

function merklizeDistribution(id, recipients) {
  recipients = recipients.reduce((prev, curr)=>{
    // let username = curr.username.replace('u/','')
    let address = curr.address
    let existing = prev.find(u=>u.address===address)
    let amount = new BN(curr.points)
    if(existing && existing.amount) existing.amount = existing.amount.add(amount)
    else prev.push({address,amount})
    return prev
  }, [])

  const recipientHashBuffers = recipients.map(r=>{
    r.amount = r.amount.mul(decimals)
    // r.awardHex = web3.utils.toHex(r.award)
    // r.award = r.award.toFixed()
    // console.log(typeof u.award)
    // let usernameBuffer = utils.setLengthRight(utils.toBuffer(u.username), 32)
    let addressBuffer = utils.toBuffer(r.address)
    let amountBuffer = setLengthLeft(utils.toBuffer(r.amount), 32)
    let hashBuffer = utils.keccak256(Buffer.concat([addressBuffer, amountBuffer]))
    let hash = utils.bufferToHex(hashBuffer)
    // console.log(hash)
    // r.award = r.award.toFixed()
    r.amount = r.amount.toString()

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

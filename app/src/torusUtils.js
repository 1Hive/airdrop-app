const enums = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  TWITCH: 'twitch',
  REDDIT: 'reddit',
  DISCORD: 'discord'
}
const verifierList = Object.values(enums)
const configuration = {
  torusNodeEndpoints: [
    'https://binance-main-3.torusnode.com/jrpc',
    'https://waseda-main-3.torusnode.com/jrpc',
    'https://vgr-main-3.torusnode.com/jrpc',
    'https://torus-main-3.torusnode.com/jrpc',
    'https://etc-main-3.torusnode.com/jrpc'
  ],
  networkList: ['mainnet', 'rinkeby', 'ropsten', 'kovan', 'goerli', 'localhost', 'matic'],
  enums: enums,
  verifierList: verifierList,
  supportedVerifierList: [enums.GOOGLE, enums.REDDIT, enums.DISCORD]
}

const post = (url, data) => {
  const options = {
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(data),
    method: 'POST'
  }
  return fetch(url, options).then(response => {
    if (response.ok) {
      return response.json()
    } else throw new Error('Could not connect', response)
  })
}

const generateJsonRPCObject = (method, params) => {
  return {
    jsonrpc: '2.0',
    method: method,
    id: 10,
    params: params
  }
}

const getLookupPromise = el => {
  return new Promise((resolve, reject) => resolve(el))
}

export { getPublicAddress }

/**
 * Gets the public address of an user with email
 * @param {String} verifier Oauth Provider
 * @param {String} verifierId Unique idenfier of oauth provider
 */
async function getPublicAddress({ verifier, verifierId }) {
  // Select random node from the list of endpoints
  const randomNumber = Math.floor(Math.random() * configuration.torusNodeEndpoints.length)
  const node = configuration.torusNodeEndpoints[randomNumber]
  return new Promise((resolve, reject) => {
    if (!configuration.supportedVerifierList.includes(verifier)) reject(new Error('Unsupported verifier'))
    post(
      node,
      generateJsonRPCObject('VerifierLookupRequest', {
        verifier: verifier,
        verifier_id: verifierId.toString().toLowerCase()
      })
    )
      .catch(err => log.error(err))
      .then(lookupShare => {
        if (lookupShare.error) {
          return post(
            node,
            generateJsonRPCObject('KeyAssign', {
              verifier: verifier,
              verifier_id: verifierId.toString().toLowerCase()
            })
          )
        } else if (lookupShare.result) {
          return getLookupPromise(lookupShare)
        }
      })
      .catch(err => log.error(err))
      .then(lookupShare => {
        var ethAddress = lookupShare.result.keys[0].address
        resolve(ethAddress)
      })
      .catch(err => {
        log.error(err)
        reject(err)
      })
  })
}

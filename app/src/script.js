import '@babel/polyfill'
import { of } from 'rxjs'
import AragonApi from '@aragon/api'

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

const api = new AragonApi()

api.store(
  async (state, event) => {
    let newState

    console.log("distribution", event)

    switch (event.event) {
      case INITIALIZATION_TRIGGER:
        newState = { }
        break
      case 'Awarded':
        newState = {...state}
        break
      case 'Started':
        let distribution = await marshalDistribution(parseInt(event.returnValues.id, 10))
        newState = {...state, distributions: [distribution].concat(state.distributions || []) }
        break
      case 'Increment':
        newState = { ...state }
        break
      case 'Decrement':
        newState = { ...state }
        break
      default:
        newState = state
    }

    return newState
  },
  [
    // Always initialize the store with our own home-made event
    of({ event: INITIALIZATION_TRIGGER }),
  ]
)

async function marshalDistribution(id) {
  // let ipfsGateway = location.hostname === 'localhost' ? 'http://localhost:8080/ipfs' : 'https://ipfs.eth.aragon.network/ipfs'
  let {root, dataURI} = await api.call('distributions', id).toPromise()
  // let data = await fetch(`${ipfsGateway}/${dataURI.split(':')[1]}`).then(r=>r.json())
  return { id, root, dataURI }
}

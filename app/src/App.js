import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import AirdropDetail from './AirdropDetail'
import Airdrops from './Airdrops'
import NewAirdrop from './NewAirdrop'

const ipfsGateway = location.hostname === 'localhost' ? 'http://localhost:8080/ipfs' : 'https://ipfs.eth.aragon.network/ipfs'

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { count, rawAirdrops = [], awarded, syncing } = appState

  const [panelOpen, setPanelOpen] = useState(false)

  const [airdrops, setAirdrops] = useState([])
  useEffect(()=>{
    if(!rawAirdrops || !rawAirdrops.length) return
    if(!airdrops.length) setAirdrops(rawAirdrops)
    Promise.all(rawAirdrops.map(async (a)=>{
      a.awarded = await api.call('awarded', a.id, connectedAccount).toPromise()
      if(!a.data) a.data = await (await fetch(`${ipfsGateway}/${a.dataURI.split(':')[1]}`)).json()
      a.userData = a.data.awards.find(d=>d.address===connectedAccount)
      setAirdrops(rawAirdrops.slice())
    }))
  }, [rawAirdrops, connectedAccount])

  const [selected, setSelected] = useState()

  return (
    <Main>
      <Header primary="Airdrop" secondary={!selected && <Button mode="strong" onClick={()=>setPanelOpen(true)}>New airdrop</Button>} />
      {selected
        ? <AirdropDetail airdrop={selected} onBack={()=>setSelected()} />
        : <Airdrops airdrops={airdrops} onSelect={setSelected} />
      }
      <SidePanel title={"New Airdrop"} opened={panelOpen} onClose={()=>setPanelOpen(false)}>
        <NewAirdrop />
      </SidePanel>
    </Main>
  )
}

export default App

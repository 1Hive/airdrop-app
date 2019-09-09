import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { AppBar, AppView, Button, Checkbox, EmptyStateCard, Field, IconFundraising, Info, Main, SidePanel, Text, TextInput, theme } from '@aragon/ui'
import { Grid, Card, Content, Label } from './components'
import { NULL_ADDRESS } from './utils'
import csv from 'csvtojson'
import merklizeDistribution from './merklizeDistribution'
import ipfsClient from 'ipfs-http-client'
import BigNumber from "bignumber.js"
import manualMapping from './manualMapping';

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { distributions } = appState

  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState({})

  const emptyContainerStyles = {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  }

  return (
    <Main>
      <AppView appBar={<AppBar title="Distribution" endContent={<Button mode="strong" onClick={()=>setPanelOpen(true)}>New distribution</Button>} />} >
        { distributions.length ?
          <React.Fragment>
            <Text size="xlarge">Distributions:</Text>
            <Grid>{distributions.map((d, i)=><Distribution distribution={d} selected={!!selected[d.id]} onSelect={(state, args)=>{if(state) selected[d.id]=args; else delete selected[d.id]; setSelected({...selected})}} />)}</Grid>
          </React.Fragment> :
          <div style={emptyContainerStyles}>
            <EmptyStateCard
              actionText="Create distribution"
              onActivate={()=>setPanelOpen(true)}
              text="There are no distributions."
              icon={() => <IconFundraising color="green" />}
            />
          </div>
        }
      </AppView>
      <SidePanel title={"New Distribution"} opened={panelOpen} onClose={()=>setPanelOpen(false)}>
        <Merklize />
      </SidePanel>
    </Main>
  )
}

function Merklize() {
  const [file, setFile] = useState()
  const [data, setData] = useState()

  useEffect(()=>{
    console.log("file", file)
    if(file){
      let reader = new FileReader()
      reader.onload = async (e)=>{
        if(file.name.includes('.csv')){
          let recipients = await csv().fromString(e.target.result)
          let merklized = merklizeDistribution(file.name.replace('.csv', ''), recipients)
          setData(merklized)
        } else if(file.name.includes('.json')){
          let addressToCred = JSON.parse(e.target.result)[1].credJSON.addressToCred
          let recipients = []
          for(key in Object.keys(addressToCred)){
            for(name in Object.keys(manualMapping)){
              if(key.includes(name)){
                recipients.push(manualMapping[name],"cred",addressToCred[key][addressToCred[key].length-2])
              }
            }
          }
          let merklized = merklizeDistribution(file.name.replace('.json', ''), recipients)
          setData(merklized)
        }
      }
      reader.readAsText(file)
    } else {
      console.log("no file")
      console.log("data", data)
      setData()
    }
  }, [file])

  return (
    <Field label="Load distribution csv:">
      <input type="file" onChange={(e)=>{e.target.files && e.target.files.length && setFile(e.target.files[0])}} />
      <ValidationData data={data} />
      <Button onClick={()=>setFile()}>Clear</Button>
    </Field>
  )
}

function ValidationData({data}){
  const { api } = useAragonApi()

  const [hash, setHash] = useState()
  useEffect(()=>{
    if(!data) {
      setHash()
      return
    }
    (async function(){
      console.log("YO")
      let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
      let res = await ipfs.add(Buffer.from(JSON.stringify(data), 'utf8'))
      if(!res) return
      let hash = res[0].hash
      setHash(hash)
      await api.start(data.root, `ipfs:${hash}`).toPromise()
    })()
  }, [data])

  return (
    <React.Fragment>
      {data &&
        (hash ?
          <p>You're data with merkle root ({data.root}) and ipfs hash ({hash}) has been added to ipfs but may need to propagate through the network if it doesn't already appear <a href={`https://ipfs.eth.aragon.network/ipfs/${hash}`} target="_blank">here</a>.</p> :
          <p>no ipfs hash generated. missing local ipfs node?</p>
        )
      }
    </React.Fragment>
  )
}

function Distribution({distribution, username, selected, onSelect}) {
  const { id, dataURI } = distribution
  const { api, connectedAccount } = useAragonApi()

  const [data, setData] = useState()
  useEffect(()=>{
    let ipfsGateway = location.hostname === 'localhost' ? 'http://localhost:8080/ipfs' : 'https://ipfs.eth.aragon.network/ipfs'
    fetch(`${ipfsGateway}/${dataURI.split(':')[1]}`)
      .then(r=>r.json())
      .then(setData)
  }, [dataURI])

  const [claimed, setClaimed] = useState()
  const [userData, setUserData] = useState()
  useEffect(()=>{
    connectedAccount ? api.call('claimed', id, connectedAccount).toPromise().then(setClaimed) : setClaimed()

    data && Array.isArray(data.data) && setUserData(data.data.find(d=>d.address===connectedAccount))

  }, [data, distribution, connectedAccount])

  return (
    <Card>
      <Content>
        <Label>
          <Text color={theme.textTertiary}>#{id} </Text>
        </Label>
        {!data &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Retrieving distribution data...</Info.Alert>
        }
        {data && !userData && !claimed &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Nothing to claim for {connectedAccount.slice(0,8)+'...'}</Info.Alert>
        }
        {data && claimed &&
          <Info style={{"margin-bottom": "10px"}}>No longer valid</Info>
        }
        {!claimed && userData &&
          <React.Fragment>
            <Info.Action style={{"margin-bottom": "10px"}}>You can claim <br/>{BigNumber(userData.amount).div("1e+18").toFixed()}</Info.Action>
            <Field>
              <Button mode="strong" emphasis="positive" onClick={async () => {console.log(id, connectedAccount, BigNumber(userData.amount).toFixed(), userData.proof); await api.award(id, connectedAccount, BigNumber(userData.amount).toFixed(), userData.proof).toPromise()}}>Claim</Button>
            </Field>
          </React.Fragment>
        }
      </Content>
    </Card>
  )
}

function NewDistribution(){
  const { api, connectedAccount } = useAragonApi()
  const [newRoot, setNewRoot] = useState('0x5609d105d857abed30fff2bfd4dfd572c6115a4437b99d631b8e1c0c5bd79bb0')
  const [newIPFSHash, setNewIPFSHash] = useState('QmY4uJQHBWZx5T9RXMtogHjaVQoWb3KjCFr3k4ivdQawJw')
  return (
    <React.Fragment>
      <Field label="Merkle root:">
        <TextInput value={newRoot} onChange={(e)=>setNewRoot(e.target.value)} />
      </Field>
      <Field label="IPFS Content Hash:">
        <TextInput value={newIPFSHash} onChange={(e)=>setNewIPFSHash(e.target.value)} />
      </Field>
      <Field>
        <Button onClick={()=>api.start(newRoot, `ipfs:${newIPFSHash}`)}>Start</Button>
      </Field>
    </React.Fragment>
  )
}

export default App

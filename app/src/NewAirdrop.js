import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, BackButton, Bar, Button, Card, CardLayout, Checkbox, DropDown, Field, GU, Header, IconSettings,
  Info, Main, Modal, Radio, RadioGroup, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import AwardsView from './AwardsView'
import BigNumber from 'bignumber.js'
import merklize from './merklize'
import ipfsClient from 'ipfs-http-client'
import csv from 'csvtojson'
import { isValidAddress } from 'ethereumjs-util'
import { getPublicAddress as getPublicAddressTorus } from './torusUtils'

function NewAirdrop({onBack}) {
  const { api } = useAragonApi()
  const [files, setFiles] = useState()
  const [raw, setRaw] = useState()
  const [data, setData] = useState()
  const [hash, setHash] = useState()
  const [addressField, setAddressField] = useState()
  const [amountField, setAmountField] = useState()
  const form = React.createRef();

  useEffect(()=>{
    if(!files || !files.length) {
      setRaw()
      setData()
      setHash()
      if(form.current) form.current.reset()
      return
    }
    let reader = new FileReader()
    reader.onload = async (e)=>{
      let awards = await csv().fromString(e.target.result)
      setRaw(awards)
      if(awards[0]){
        let fields = Object.keys(awards[0])
        setAmountField( fields.find(f=>!BigNumber(awards[0][f]).isNaN()) )
        setAddressField( fields.find(f=>isValidAddress(awards[0][f])) )
      }
    }
    reader.readAsText(files[0])
  }, [files])

  useEffect(()=>{
    if(!raw || !addressField || !amountField) return
    setData( merklize(raw, addressField, amountField) )
  }, [raw, addressField, amountField])

  useEffect(()=>{
    if(!data) return setHash()
    addToIPFS(data).then(setHash)
  }, [data])

  const [changeFields, setChangeFields] = useState(false)
  const [viewData, setViewData] = useState(false)
  const [doingLookup, setDoingLookup] = useState(false)
  const [count, setCount] = useState(0)
  const [activeProviderIdx, setActiveProviderIdx] = useState(0)
  const providerActions = {
    "torus:reddit": async (raw)=>{
      setDoingLookup(true)
      for (let i=0;i<raw.length;i++){
        raw[i].address = await getPublicAddressTorus({verifier:"reddit", verifierId: raw[i].username.replace("u/", "")})
        setCount(i+1)
      }
      setAddressField("address")
      setDoingLookup(false)
    }
  }
  const providers = Object.keys(providerActions)

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Header>Create a new airdrop</Header>
      <form ref={form} onSubmit={null}>
        <Field label="Load from csv:">
          <input type="file" onChange={(e)=>setFiles(e.target.files)} />
          {!!files && <Button onClick={()=>setFiles()}>Clear</Button>}
        </Field>
        {raw && raw[0] &&
        <Info style={{marginBottom: "10px"}}>
          Found address column ({addressField || "unknown"}) <br/>
          Found amount column ({amountField}) <br/>
          <Button size="mini" onClick={()=>setChangeFields(true)}>Change this</Button>
        </Info>}
        {raw && raw[0] && changeFields &&
        <React.Fragment>
          <Field label="Address column:">
            <RadioGroup onChange={(field)=>setAddressField(field)} selected={addressField}>
              {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
            </RadioGroup>
          </Field>
          <Field label="Amount column:">
            <RadioGroup onChange={(field)=>setAmountField(field)} selected={amountField}>
              {Object.keys(raw[0]).map((field, i) => <label key={i}><Radio id={field} /> {field}</label>)}
            </RadioGroup>
          </Field>
        </React.Fragment>}
      </form>
      {raw && !addressField &&
      <Field>
        <Info.Alert style={{marginBottom: "10px"}}>No address field detected. You can lookup addresses from a username field using the following providers:</Info.Alert>
        <DropDown style={{marginRight: "1em"}} items={providers} selected={activeProviderIdx} onChange={(idx)=>setActiveProviderIdx(idx)} />
        <Button onClick={()=>providerActions[providers[activeProviderIdx]](raw)}>Go</Button>
      </Field>}
      {doingLookup &&
      <Field>
        <Info style={{marginBottom: "10px"}}>Please wait for the address lookups to complete. {raw.length - count} left.</Info>
      </Field>}
      {data && data.root && hash &&
      <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
        <Field>
          <Button onClick={()=>setViewData(true)}>View data</Button>
        </Field>
        <Field>
          <Button mode="strong" onClick={()=>api.start(data.root, `ipfs:${hash}`).toPromise()}>Submit</Button>
        </Field>
      </div>}
      {viewData && data && <AwardsView root={data.root} ipfsHash={hash} awards={data.awards} />}
    </React.Fragment>
  )
}
// <Info style={{marginBottom: "10px"}}>csv amount field name is <strong>{amountField}</strong>. <Button onClick={()=>{}} size="mini">Change this</Button></Info>
// {data && ( hash
//   ? <Info style={{marginBottom: "10px"}}>You're data with merkle root ({data.root}) and ipfs hash ({hash}) has been added to ipfs but may need to propagate through the network if it doesn't already appear <a href={`https://ipfs.eth.aragon.network/ipfs/${hash}`} target="_blank">here</a>.</Info>
//   : <Info.Alert style={{marginBottom: "10px"}}>no ipfs hash generated. missing ipfs node?</Info.Alert> )}

async function addToIPFS(data){
  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let res = await ipfs.add(Buffer.from(JSON.stringify(data), 'utf8'))
  return res ? res[0].hash : null
}

export default NewAirdrop

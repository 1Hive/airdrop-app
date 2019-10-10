import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, BackButton, Bar, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, Radio, RadioGroup, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import merklize from './merklize'
import ipfsClient from 'ipfs-http-client'
import csv from 'csvtojson'
import { isValidAddress } from 'ethereumjs-util'

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
    if(!addressField || !amountField) return
    setData( merklize(raw, addressField, amountField) )
  }, [raw, addressField, amountField])

  useEffect(()=>{
    if(!data) return setHash()
    addToIPFS(data).then(setHash)
  }, [data])
  //
  // useEffect(()=>{
  //   if(!hash) return
  //   api.start(data.root, `ipfs:${hash}`).toPromise().then(console.log)
  // }, [hash])

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      <Header>Create a new airdrop</Header>
      <form ref={form} onSubmit={null}>
        <Field label="Load from csv:">
          <input type="file" onChange={(e)=>setFiles(e.target.files)} />
        </Field>
        {raw && raw[0] &&
          <React.Fragment>
            <Field label="Address column name:">
              <RadioGroup onChange={(e)=>setAddressField(e.target.value)} selected={addressField}>
                {Object.keys(raw[0]).map((label, i) => <label key={i}><Radio id={label} /> {label}</label>)}
              </RadioGroup>
            </Field>
            <Field label="Amount column name:">
              <RadioGroup onChange={(e)=>setAmountField(e.target.value)} selected={amountField}>
                {Object.keys(raw[0]).map((label, i) => <label key={i}><Radio id={label} /> {label}</label>)}
              </RadioGroup>
            </Field>
          </React.Fragment>}
      </form>
      <Field>
        <Button onClick={()=>setFiles()}>Clear</Button>
        {data && data.root && hash && <Button mode="strong" onClick={()=>api.start(data.root, `ipfs:${hash}`).toPromise()}>Submit</Button>}
      </Field>
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

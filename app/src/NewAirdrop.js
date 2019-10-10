import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import merklize from './merklize'
import ipfsClient from 'ipfs-http-client'
import csv from 'csvtojson'

function NewAirdrop() {
  const { api } = useAragonApi()
  const [files, setFiles] = useState()
  const [data, setData] = useState()
  const [hash, setHash] = useState()
  const [amountField, setAmountField] = useState("points")
  const form = React.createRef();

  useEffect(()=>{
    if(!files || !files.length) {
      setData()
      if(form.current) form.current.reset()
      return
    }
    let reader = new FileReader()
    reader.onload = async (e)=>{
      let recipients = await csv().fromString(e.target.result)
      setData(merklize(recipients, amountField))
    }
    reader.readAsText(files[0])
  }, [files])

  useEffect(()=>{
    if(!data) return setHash()
    addToIPFS(data).then(setHash)
  }, [data])

  useEffect(()=>{
    if(!hash) return
    api.start(data.root, `ipfs:${hash}`).toPromise().then(console.log)
  }, [hash])

  return (
    <React.Fragment>
      <Header>Create a new airdrop</Header>
      <Info style={{marginBottom: "10px"}}>csv amount field name is <strong>{amountField}</strong>. <Button onClick={()=>{}} size="mini">Change this</Button></Info>
      <form ref={form} onSubmit={null}>
        <Field label="Load from csv:">
          <input type="file" onChange={(e)=>setFiles(e.target.files)} />
        </Field>
      </form>
      {data && ( hash
        ? <Info style={{marginBottom: "10px"}}>You're data with merkle root ({data.root}) and ipfs hash ({hash}) has been added to ipfs but may need to propagate through the network if it doesn't already appear <a href={`https://ipfs.eth.aragon.network/ipfs/${hash}`} target="_blank">here</a>.</Info>
        : <Info.Alert style={{marginBottom: "10px"}}>no ipfs hash generated. missing ipfs node?</Info.Alert> )}
      <Field>
        <Button onClick={()=>setFiles()}>Clear</Button>
      </Field>
    </React.Fragment>
  )
}

async function addToIPFS(data){
  let ipfs = ipfsClient('/ip4/127.0.0.1/tcp/5001')
  let res = await ipfs.add(Buffer.from(JSON.stringify(data), 'utf8'))
  return res ? res[0].hash : null
}

export default NewAirdrop

import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import { AppBar, AppView, Button, Checkbox, Field, Info, Main, SidePanel, Text, TextInput, theme } from '@aragon/ui'
import { Grid, Card, Content, Label } from '@daonuts/common/lib/components'
import { NULL_ADDRESS } from '@daonuts/common/lib/utils'
import { abi as NamesABI } from '../../build/contracts/Names.json'
import csv from 'csvtojson'
import merklizeDistribution from './merklizeDistribution'
import ipfsClient from 'ipfs-http-client'
import { ethers } from 'ethers';

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { count, distributions = [], syncing } = appState

  const [namesInstance, setNamesInstance] = useState()
  useEffect(()=>{
    api && api.call('names').toPromise()
      .then(addr=>api.external(addr, NamesABI))
      .then(setNamesInstance)
  }, [api, network])

  const [username, setUsername] = useState()
  useEffect(()=>{
    namesInstance && namesInstance.nameOf(connectedAccount).toPromise()
      .then(setUsername)
  }, [namesInstance, connectedAccount])

  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState({})

  return (
    <Main>
      <AppView appBar={<AppBar title="Distribution" endContent={<Button mode="strong" onClick={()=>setPanelOpen(true)}>New distribution</Button>} />} >
        <h1>{username}</h1>
        <h1>{connectedAccount}</h1>
        <Text size="xlarge">Distributions:</Text>
        <Field>
          <Button disabled={Object.values(selected).length == 0} mode="strong" emphasis="positive" onClick={()=>{let args=Object.values(selected); api.awardFromMany(args.map(a=>a.id), username, args.map(a=>a.karma), args.map(a=>a.currency), "0x"+args.map(a=>a.proof.map(p=>p.slice(2)).join("")).join(""), args.map(a=>a.proof.length))}}>Claim multiple</Button>
        </Field>
        <Grid>{distributions.map((d, i)=><Distribution namesInstance={namesInstance} distribution={d} username={username} selected={!!selected[d.id]} onSelect={(state, args)=>{if(state) selected[d.id]=args; else delete selected[d.id]; setSelected({...selected})}} />)}</Grid>
        <Merklize />
      </AppView>
      <SidePanel title={"New Distribution"} opened={panelOpen} onClose={()=>setPanelOpen(false)}>
        <NewDistribution />
      </SidePanel>
    </Main>
  )
}

function Merklize() {
  const [file, setFile] = useState()
  const [data, setData] = useState()


  useEffect(()=>{
    if(file){
      let reader = new FileReader()
      reader.onload = async (e)=>{
        let recipients = await csv().fromString(e.target.result)
        let merklized = merklizeDistribution(file.name.replace('.csv', ''), recipients)
        setData(merklized)
      }
      reader.readAsText(file)
    } else setData()
  }, [file])

  return (
    <Field label="Load raw distribution file:">
      <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
      {data && <ValidationData data={data} />}
    </Field>
  )
}

function ValidationData({data}){
  const { api } = useAragonApi()

  const [ipfs, setIPFS] = useState()
  useEffect(()=>{
    setIPFS(ipfsClient('/ip4/127.0.0.1/tcp/5001'))
  }, [])

  const [hash, setHash] = useState()
  useEffect(()=>{
    if(data && ipfs){
      let buf = Buffer.from(JSON.stringify(data), 'utf8')
      ipfs.add(buf, {onlyHash: true}, (err, res)=>{
        if(res)
          setHash(res[0].hash)
      })
    }
  }, [data, ipfs])

  const [added, setAdded] = useState(false)

  return (
    <div>
      <div>root: {data.root}</div>
      <div>hash: {hash ? hash : 'no ipfs hash generated. missing local ipfs node?'}</div>
      {!added && hash &&
        <Field label="Add to ipfs:">
          <Button onClick={()=>ipfs.add(Buffer.from(JSON.stringify(data), 'utf8'), (err, res)=>{if(res) setAdded(true); setHash(res[0].hash)})}>Add</Button>
        </Field>
      }
      {added &&
        <div>You're data has been added to ipfs but may need to propagate through the network if it doesn't already appear <a href={`https://ipfs.eth.aragon.network/ipfs/${hash}`} target="_blank">here</a>.</div>
      }
      {added && hash &&
        <Field label="Start new distribution:">
          <Button onClick={()=>api.start(data.root, `ipfs:${hash}`)}>Start</Button>
        </Field>
      }
    </div>
  )
}

function Distribution({distribution, username, selected, onSelect, namesInstance}) {
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
    username ? api.call('claimed', id, username).toPromise().then(setClaimed) : setClaimed()

    data && Array.isArray(data.data) && setUserData(data.data.find(d=>d.username===username))
  }, [data, distribution, username])

  return (
    <Card>
      <Content>
        <Label>
          <Text color={theme.textTertiary}>#{id} </Text>
        </Label>
        {!data &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Retrieving distribution data...</Info.Alert>
        }
        {data && !userData &&
          <Info.Alert style={{"margin-bottom": "10px"}}>Nothing to claim for {username}</Info.Alert>
        }
        {!username &&
          <Info.Alert style={{"margin-bottom": "10px"}}>{connectedAccount.slice(0,8)}... has not registered</Info.Alert>
        }
        {claimed &&
          <Info style={{"margin-bottom": "10px"}}>You claimed in this distribution</Info>
        }
        {!claimed && userData &&
          <React.Fragment>
            <Info.Action style={{"margin-bottom": "10px"}}>You can claim <br/>{web3.toBigNumber(userData.karma).div("1e+18").toFixed()} (karma) <br/>{web3.toBigNumber(userData.currency).div("1e+18").toFixed()} (currency)</Info.Action>
            <Checkbox checked={selected} onChange={(state)=>onSelect(state, {id, karma: web3.toBigNumber(userData.karma).toFixed(), currency: web3.toBigNumber(userData.currency).toFixed(), proof: userData.proof})} />
            <Field>
              <Button mode="strong" emphasis="positive" onClick={()=>api.award(id, userData.username, web3.toBigNumber(userData.karma).toFixed(), web3.toBigNumber(userData.currency).toFixed(), userData.proof)}>Claim</Button>
            </Field>
          </React.Fragment>
        }
        {data &&
          <Field>
            <Button mode="strong" emphasis="positive" onClick={()=>awardMany(api, namesInstance, id, data)}>Award Many</Button>
          </Field>
        }
      </Content>
    </Card>
  )
}

async function awardMany(api, namesInstance, id, data){
  // filter first 50 that
  // 1. is registered
  // 2. last claim is id-1
  // 3. above some value threshold?

  let idx = 0, usernames = [], karmaAwards = [], currencyAwards = [], proofLengths = [], proofs = "0x"
  while (usernames.length < 50 && idx < data.data.length){
    let claim = data.data[idx]
    let address = await namesInstance.ownerOf(claim.username).toPromise()
    if(address === NULL_ADDRESS)
      continue
    let last = await api.call('lastClaimed', ethers.utils.id(claim.username)).toPromise()
    if(parseInt(last) !== (parseInt(id)-1))
      continue

    usernames.push(web3.fromAscii(claim.username))
    karmaAwards.push(web3.toBigNumber(claim.karma).toFixed())
    currencyAwards.push(web3.toBigNumber(claim.currency).toFixed())
    proofs += claim.proof.map(p=>p.slice(2)).join("")
    proofLengths.push(claim.proof.length)
    idx++
  }

  console.log(usernames.length)

  // let size = 50
  // let usernames = new Array(size)
  // let karmaAwards = new Array(size)
  // let currencyAwards = new Array(size)
  // let proofs = "0x"
  // let proofLengths = new Array(size)
  // data.data.slice(0,size).forEach((d,idx)=>{
  //   usernames[idx] = web3.fromAscii(d.username)
  //   karmaAwards[idx] = web3.toBigNumber(d.karma).toFixed()
  //   currencyAwards[idx] = web3.toBigNumber(d.currency).toFixed()
  //   proofs += d.proof.map(p=>p.slice(2)).join("")
  //   proofLengths[idx] = d.proof.length
  // })
  // console.log(usernames, karmaAwards, currencyAwards, proofs, proofLengths)
  // await api.awardTest0(id).toPromise()
  // await api.awardTest1(id, usernames).toPromise()
  // await api.awardTest2(id, usernames, karmaAwards).toPromise()
  // await api.awardTest3(id, usernames, karmaAwards, currencyAwards).toPromise()
  // await api.awardTest4(id, usernames, karmaAwards, currencyAwards, proofs).toPromise()
  // await api.awardTest5(id, usernames, karmaAwards, currencyAwards, proofs, proofLengths).toPromise()
  // let str2 = await api.call("testConvertBytes32", "0x64756d6d79303100000000000000000000000000000000000000000000000000").toPromise()
  // console.log(str2)
  // let str3 = await api.call("testConvertString", "dummy01").toPromise()
  // console.log(str3)
  //
  // let str4 = await api.call("testBytes32ToString1", "0x64756d6d79303100000000000000000000000000000000000000000000000000").toPromise()
  // console.log(str4)
  // let str5 = await api.call("testBytes32ToString2", "0x64756d6d79303100000000000000000000000000000000000000000000000000").toPromise()
  // console.log(str5)
  //
  // let str6 = await api.call("testOwner1", ["0x64756d6d79303100000000000000000000000000000000000000000000000000"]).toPromise()
  // console.log(str6)
  // let str7 = await api.call("testOwner2", ["0x64756d6d79303100000000000000000000000000000000000000000000000000"]).toPromise()
  // console.log(str7)

  await api.awardToMany(id, usernames, karmaAwards, currencyAwards, proofs, proofLengths).toPromise()

  // let str1 = await api.call("testConvert", "0x64756d6d79303100000000000000000000000000000000000000000000000000").toPromise()
  // console.log(str1)
  // // let str2 = await api.call("testConvertFromArray", ["0x64756d6d79303100000000000000000000000000000000000000000000000000"]).toPromise()
  // let str2 = await api.testConvertFromArray(["0x64756d6d79303100000000000000000000000000000000000000000000000000"]).toPromise()
  // // '0x4e69636b00000000000000000000000000000000000000000000000000000000'
  // // '0x64756d6d79303100000000000000000000000000000000000000000000000000'
  // console.log(str2)
  // let str1 = await api.call("testConvertBytes32", "0x64756d6d793031").toPromise()
  // console.log(str1)
  // let str2 = await api.call("testConvertBytes32", "0x64756d6d79303100000000000000000000000000000000000000000000000000").toPromise()
  // console.log(str2)
  // let str3 = await api.call("testConvertString", "dummy01").toPromise()
  // console.log(str3)
  // let bytes = await api.call("toBytes", "dummy01").toPromise()
  // console.log(bytes)
  // let str4 = await api.call("bytes32ToString", "0x64756d6d793031").toPromise()
  // console.log(str4 === "dummy01")
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

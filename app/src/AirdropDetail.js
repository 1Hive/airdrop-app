import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AddressField, AppBar, AppView, BackButton, Bar, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Table, TableCell, TableHeader, TableRow, Text, TextInput, theme
} from '@aragon/ui'
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"

function Airdrop({airdrop, onBack}){
  const { api, connectedAccount } = useAragonApi()
  const { id, root, dataURI, data, awarded, userData } = airdrop

  const [batchSize, setBatchSize] = useState(50)

  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={onBack} />
      </Bar>
      {data &&
        <React.Fragment>
          <Field label="Batch size:">
            <TextInput.Number value={batchSize} onChange={(e)=>setBatchSize(e.target.value)} />
          </Field>
          <Field>
            <Button mode="strong" emphasis="positive" onClick={()=>awardToMany(api, id, data.awards)}>Award Many</Button>
          </Field>
        </React.Fragment>}
      <section>
        {data && <AwardsTable awards={data.awards} />}
      </section>
    </React.Fragment>
  )
}

function AwardsTable({awards}){
  return (
    <Table header={<TableRow><TableHeader title="Awards" /></TableRow>}>
      <TableRow>
        <TableCell>
          <Text>Recipient</Text>
        </TableCell>
        <TableCell>
          <Text>Amount</Text>
        </TableCell>
      </TableRow>
      {awards.map((award,idx)=>(
        <TableRow key={idx}>
          <TableCell><AddressField address={award.address} /></TableCell>
          <TableCell><Text>{award.amount}</Text></TableCell>
        </TableRow>
      ))}
    </Table>
  )
}

async function awardToMany(api, id, awards, batchSize){
  // filter first 50 that
  // 1. is registered
  // 2. last award is id-1
  // 3. above some value threshold?

  let idx = 0, recipients = [], amounts = [], proofLengths = [], proofs = "0x"
  while (recipients.length < batchSize && idx < awards.length){
    let award = awards[idx]
    let awarded = await api.call('awarded', id, award.address).toPromise()
    if(awarded)
      continue

    recipients.push(award.address)
    amounts.push(award.amount)
    proofs += award.proof.map(p=>p.slice(2)).join("")
    proofLengths.push(award.proof.length)
    idx++
  }

  console.log(recipients.length)

  await api.awardToMany(id, recipients, amounts, proofs, proofLengths).toPromise()
}

export default Airdrop

import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconArrowRight,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'

function Airdrops({airdrops, onSelect}){
  return (
    <React.Fragment>
      <section>
        <h2 size="xlarge">Ready to claim:</h2>
        <CardLayout columnWidthMin={30 * GU} rowHeight={250}>
          {airdrops.filter(a=>(!a.awarded && a.userData)).map((d, i)=><AirdropCard airdrop={d} key={d.id} onSelect={onSelect} />)}
        </CardLayout>
      </section>
      <section>
        <h2 size="xlarge">Archive:</h2>
        <CardLayout columnWidthMin={30 * GU} rowHeight={150}>
          {airdrops.filter(a=>(a.awarded || !a.userData)).map((d, i)=><AirdropCard airdrop={d} key={d.id} onSelect={onSelect} />)}
        </CardLayout>
      </section>
    </React.Fragment>
  )
}

function AirdropCard({airdrop, onSelect}) {
  const { api, connectedAccount } = useAragonApi()
  const { id, root, dataURI, data, awarded, userData } = airdrop

  return (
    <Card css={`
        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: ${1 * GU}px;
        padding: ${3 * GU}px;
        cursor: pointer;
    `} onClick={()=>onSelect(airdrop)}>
      <header style={{display: "flex", justifyContent: "space-between"}}>
        <Text color={theme.textTertiary}>#{id}</Text>
        <IconArrowRight color={theme.textTertiary} />
      </header>
      <section>
        {!awarded && !data &&
        <Info.Alert style={{marginBottom: "10px"}}>Retrieving airdrop data...</Info.Alert>}
        {data && !userData &&
        <Info.Alert style={{marginBottom: "10px"}}>Nothing to claim</Info.Alert>}
        {awarded &&
        <Info style={{marginBottom: "10px"}}>You were awarded</Info>}
        {!awarded && userData &&
        <Info.Action style={{marginBottom: "10px"}}>You can claim <br/>{BigNumber(userData.amount).div("1e+18").toFixed()}</Info.Action>}
      </section>
      <footer style={{display: "flex", justifyContent: "flex-end"}}>
        {!awarded && userData &&
        <Button mode="strong" emphasis="positive" onClick={(e)=>{e.stopPropagation();api.award(id, connectedAccount, userData.amount, userData.proof).toPromise()}}>Claim</Button>}
      </footer>
    </Card>
  )
}

export default Airdrops

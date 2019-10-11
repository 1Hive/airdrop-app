import React, { useState, useEffect } from 'react'
import { AddressField, Table, TableCell, TableHeader, TableRow, Text, theme } from '@aragon/ui'

function AwardsView({root, ipfsHash, awards}){

  const [hasNameField, setHasNameField] = useState()
  useEffect(()=>{
    setHasNameField(!!awards[0] && !!awards[0].name)
  }, [awards])

  return (
    <React.Fragment>
      <Text>merkle root: {root}</Text>
      <Text>ipfs hash: {ipfsHash}</Text>
      <Table header={<TableRow><TableHeader title="Awards" /></TableRow>}>
        <TableRow>
          {hasNameField && <TableCell>
            <Text>Name</Text>
          </TableCell>}
          <TableCell>
            <Text>Address</Text>
          </TableCell>
          <TableCell>
            <Text>Amount</Text>
          </TableCell>
        </TableRow>
        {awards.map((award,idx)=>(
          <TableRow key={idx}>
            {hasNameField && <TableCell><Text>{award.name}</Text></TableCell>}
            <TableCell><AddressField address={award.address} /></TableCell>
            <TableCell><Text>{award.amount}</Text></TableCell>
          </TableRow>
        ))}
      </Table>
    </React.Fragment>
  )
}

export default AwardsView

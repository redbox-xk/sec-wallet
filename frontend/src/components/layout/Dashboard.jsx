
import React from 'react'
import SpotTrading from '../trading/SpotTrading'
import FuturesPanel from '../futures/FuturesPanel'
import WalletPanel from '../wallet/WalletPanel'

export default function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold">SEC Exchange Platform</h1>
      <WalletPanel />
      <SpotTrading />
      <FuturesPanel />
    </div>
  )
}

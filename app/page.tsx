"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ethers } from "ethers"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Copy,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Wallet,
  Settings,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Fuel,
  Globe,
  KeyRound,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Network Configuration
// ---------------------------------------------------------------------------
const NETWORKS: Record<
  string,
  { name: string; rpc: string; chainId: number; symbol: string; explorer: string; decimals: number }
> = {
  mainnet: {
    name: "Ethereum Mainnet",
    rpc: "https://eth.llamarpc.com",
    chainId: 1,
    symbol: "ETH",
    explorer: "https://etherscan.io",
    decimals: 18,
  },
  sepolia: {
    name: "Sepolia Testnet",
    rpc: "https://rpc.sepolia.org",
    chainId: 11155111,
    symbol: "SepoliaETH",
    explorer: "https://sepolia.etherscan.io",
    decimals: 18,
  },
  polygon: {
    name: "Polygon",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    symbol: "MATIC",
    explorer: "https://polygonscan.com",
    decimals: 18,
  },
  bsc: {
    name: "BNB Smart Chain",
    rpc: "https://bsc-dataseed.binance.org",
    chainId: 56,
    symbol: "BNB",
    explorer: "https://bscscan.com",
    decimals: 18,
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    symbol: "ETH",
    explorer: "https://arbiscan.io",
    decimals: 18,
  },
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TxRecord {
  hash: string
  to: string
  from: string
  value: string
  timestamp: number
  status: "pending" | "confirmed" | "failed"
  network: string
}

type AppView = "onboarding" | "dashboard"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function shortAddr(addr: string) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}

const SEC_LOGO = "/sec-logo.jpeg"

// ---------------------------------------------------------------------------
// Logo Badge Component
// ---------------------------------------------------------------------------
function SecBadge({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src={SEC_LOGO}
      alt="SecWallet"
      width={size}
      height={size}
      className={`rounded-full ring-1 ring-primary/30 ${className}`}
      priority
    />
  )
}

// ---------------------------------------------------------------------------
// Animated Pulse Ring
// ---------------------------------------------------------------------------
function PulseRing({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20" />
      <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-primary/10" />
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function SecWalletApp() {
  const [view, setView] = useState<AppView>("onboarding")
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null)
  const [mnemonic, setMnemonic] = useState("")
  const [balance, setBalance] = useState("0")
  const [networkKey, setNetworkKey] = useState("mainnet")
  const [transactions, setTransactions] = useState<TxRecord[]>([])
  const [gasPrice, setGasPrice] = useState("0")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [activeTab, setActiveTab] = useState("wallet")

  // Send form
  const [sendTo, setSendTo] = useState("")
  const [sendAmount, setSendAmount] = useState("")
  const [sendGasLimit, setSendGasLimit] = useState("21000")
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState("")

  // Dialogs
  const [showReceive, setShowReceive] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTxResult, setShowTxResult] = useState(false)
  const [txError, setTxError] = useState("")

  // Recovery
  const [recoverPhrase, setRecoverPhrase] = useState("")
  const [recoverError, setRecoverError] = useState("")

  const network = NETWORKS[networkKey]
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null)

  // Get provider for current network
  const getProvider = useCallback(() => {
    if (!providerRef.current || providerRef.current._network?.chainId !== BigInt(network.chainId)) {
      providerRef.current = new ethers.JsonRpcProvider(network.rpc, network.chainId)
    }
    return providerRef.current
  }, [network.rpc, network.chainId])

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!wallet) return
    try {
      const provider = getProvider()
      const bal = await provider.getBalance(wallet.address)
      setBalance(ethers.formatEther(bal))
    } catch {
      setBalance("--")
    }
  }, [wallet, getProvider])

  // Fetch gas price
  const fetchGas = useCallback(async () => {
    try {
      const provider = getProvider()
      const fee = await provider.getFeeData()
      if (fee.gasPrice) {
        setGasPrice(ethers.formatUnits(fee.gasPrice, "gwei"))
      }
    } catch {
      setGasPrice("--")
    }
  }, [getProvider])

  // Poll balance and gas
  useEffect(() => {
    if (view !== "dashboard" || !wallet) return
    fetchBalance()
    fetchGas()
    const interval = setInterval(() => {
      fetchBalance()
      fetchGas()
    }, 15000)
    return () => clearInterval(interval)
  }, [view, wallet, fetchBalance, fetchGas])

  // Force refresh on network change
  useEffect(() => {
    providerRef.current = null
    if (wallet) {
      fetchBalance()
      fetchGas()
    }
  }, [networkKey, wallet, fetchBalance, fetchGas])

  // Load saved wallet from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("sec_mnemonic")
      const savedNet = sessionStorage.getItem("sec_network")
      const savedTx = sessionStorage.getItem("sec_tx")
      if (saved) {
        const w = ethers.HDNodeWallet.fromPhrase(saved)
        setWallet(w)
        setMnemonic(saved)
        setView("dashboard")
      }
      if (savedNet && NETWORKS[savedNet]) {
        setNetworkKey(savedNet)
      }
      if (savedTx) {
        setTransactions(JSON.parse(savedTx))
      }
    } catch {
      // No saved wallet
    }
  }, [])

  // Save network preference
  useEffect(() => {
    sessionStorage.setItem("sec_network", networkKey)
  }, [networkKey])

  // Save transactions
  useEffect(() => {
    if (transactions.length > 0) {
      sessionStorage.setItem("sec_tx", JSON.stringify(transactions))
    }
  }, [transactions])

  // ---------------------------------------------------------------------------
  // Wallet Actions
  // ---------------------------------------------------------------------------
  function createWallet() {
    setIsLoading(true)
    setTimeout(() => {
      const w = ethers.HDNodeWallet.createRandom()
      setWallet(w)
      setMnemonic(w.mnemonic!.phrase)
      sessionStorage.setItem("sec_mnemonic", w.mnemonic!.phrase)
      setShowMnemonic(true)
      setIsLoading(false)
      setView("dashboard")
    }, 600)
  }

  function recoverWallet() {
    setRecoverError("")
    try {
      const phrase = recoverPhrase.trim().toLowerCase()
      if (!ethers.Mnemonic.isValidMnemonic(phrase)) {
        setRecoverError("Invalid mnemonic phrase. Please check and try again.")
        return
      }
      const w = ethers.HDNodeWallet.fromPhrase(phrase)
      setWallet(w)
      setMnemonic(phrase)
      sessionStorage.setItem("sec_mnemonic", phrase)
      setView("dashboard")
    } catch {
      setRecoverError("Failed to recover wallet. Check your phrase.")
    }
  }

  function lockWallet() {
    sessionStorage.removeItem("sec_mnemonic")
    sessionStorage.removeItem("sec_tx")
    setWallet(null)
    setMnemonic("")
    setBalance("0")
    setTransactions([])
    setView("onboarding")
    setShowMnemonic(false)
    setShowPrivateKey(false)
    setActiveTab("wallet")
  }

  async function sendTransaction() {
    if (!wallet || !sendTo || !sendAmount) return
    setSending(true)
    setTxError("")
    setTxHash("")

    try {
      const provider = getProvider()
      const signer = new ethers.Wallet(wallet.privateKey, provider)

      const tx = await signer.sendTransaction({
        to: sendTo,
        value: ethers.parseEther(sendAmount),
        gasLimit: BigInt(sendGasLimit),
      })

      setTxHash(tx.hash)

      const record: TxRecord = {
        hash: tx.hash,
        to: sendTo,
        from: wallet.address,
        value: sendAmount,
        timestamp: Date.now(),
        status: "pending",
        network: networkKey,
      }
      setTransactions((prev) => [record, ...prev])

      setShowSend(false)
      setShowTxResult(true)

      // Wait for confirmation
      const receipt = await tx.wait()
      setTransactions((prev) =>
        prev.map((t) =>
          t.hash === tx.hash ? { ...t, status: receipt?.status === 1 ? "confirmed" : "failed" } : t
        )
      )
      fetchBalance()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed"
      setTxError(message.length > 200 ? message.slice(0, 200) + "..." : message)
      setShowTxResult(true)
    } finally {
      setSending(false)
      setSendTo("")
      setSendAmount("")
    }
  }

  function handleCopyAddress() {
    if (!wallet) return
    copyText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ---------------------------------------------------------------------------
  // Onboarding Screen
  // ---------------------------------------------------------------------------
  if (view === "onboarding") {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="mb-8 flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PulseRing>
              <SecBadge size={80} className="ring-2 ring-primary/40" />
            </PulseRing>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">SecWallet</h1>
              <p className="mt-1 text-sm text-muted-foreground">Secure. Lightweight. Yours.</p>
            </div>
          </div>

          <Tabs defaultValue="create" className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="create" className="gap-1.5 min-h-[44px]">
                <Wallet className="size-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="recover" className="gap-1.5 min-h-[44px]">
                <KeyRound className="size-4" />
                Recover
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold text-card-foreground">New Wallet</h2>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  Generate a brand new Ethereum wallet with a secure 12-word recovery phrase. Your keys
                  never leave this device.
                </p>
                <Button
                  onClick={createWallet}
                  disabled={isLoading}
                  className="w-full min-h-[44px] text-base font-semibold"
                  size="lg"
                >
                  {isLoading ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Wallet className="size-4" />
                  )}
                  {isLoading ? "Generating..." : "Create Wallet"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="recover" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <KeyRound className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold text-card-foreground">Recover Wallet</h2>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Enter your 12-word mnemonic phrase to restore access to your existing wallet.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mnemonic-input" className="text-sm text-muted-foreground">
                      Recovery Phrase
                    </Label>
                    <Textarea
                      id="mnemonic-input"
                      placeholder="Enter your 12-word recovery phrase..."
                      value={recoverPhrase}
                      onChange={(e) => setRecoverPhrase(e.target.value)}
                      className="mt-1.5 min-h-[88px] resize-none font-mono text-sm"
                    />
                  </div>
                  {recoverError && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertTriangle className="size-4 shrink-0" />
                      {recoverError}
                    </div>
                  )}
                  <Button
                    onClick={recoverWallet}
                    disabled={!recoverPhrase.trim()}
                    className="w-full min-h-[44px] text-base font-semibold"
                    size="lg"
                  >
                    <Download className="size-4" />
                    Recover Wallet
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground animate-in fade-in duration-1000 delay-300">
            Client-side only. Keys never leave your browser.
          </p>
        </div>
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // Dashboard Screen
  // ---------------------------------------------------------------------------
  return (
    <main className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <SecBadge size={28} />
          <span className="text-base font-bold tracking-tight text-foreground">SecWallet</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={networkKey} onValueChange={setNetworkKey}>
            <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground min-h-[44px]">
              <Globe className="size-3.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(NETWORKS).map(([key, net]) => (
                <SelectItem key={key} value={key}>
                  {net.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="min-h-[44px] min-w-[44px]"
          >
            <Settings className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Balance Card */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 rounded-2xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Balance
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                fetchBalance()
                fetchGas()
              }}
              className="min-h-[44px] min-w-[44px]"
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex items-end gap-2 mb-1">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {parseFloat(balance).toFixed(6)}
            </span>
            <span className="mb-1 text-sm font-medium text-primary">{network.symbol}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Fuel className="size-3" />
              <span>{parseFloat(gasPrice).toFixed(1)} Gwei</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1 transition-colors hover:text-foreground min-h-[44px]"
            >
              {copied ? (
                <CheckCircle2 className="size-3 text-primary" />
              ) : (
                <Copy className="size-3" />
              )}
              <span className="font-mono">{wallet ? shortAddr(wallet.address) : ""}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={() => setShowSend(true)}
            className="min-h-[52px] rounded-xl text-sm font-semibold"
            size="lg"
          >
            <ArrowUpRight className="size-4" />
            Send
          </Button>
          <Button
            onClick={() => setShowReceive(true)}
            variant="outline"
            className="min-h-[52px] rounded-xl text-sm font-semibold"
            size="lg"
          >
            <ArrowDownLeft className="size-4" />
            Receive
          </Button>
        </div>

        {/* Mnemonic Backup Banner */}
        {showMnemonic && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Back up your recovery phrase
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mnemonic.split(" ").map((word, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5"
                >
                  <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                  <span className="font-mono text-xs text-foreground">{word}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyText(mnemonic)
                }}
                className="min-h-[44px]"
              >
                <Copy className="size-3.5" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMnemonic(false)}
                className="text-muted-foreground min-h-[44px]"
              >
                I saved it
              </Button>
            </div>
          </div>
        )}

        {/* Tabs: Activity / Info */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-11">
            <TabsTrigger value="wallet" className="flex-1 min-h-[44px]">Wallet</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-h-[44px]">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="mt-4 space-y-3 animate-in fade-in duration-300">
            {/* Wallet Info Cards */}
            <InfoRow label="Address" value={wallet?.address ?? ""} mono copyable />
            <InfoRow label="Network" value={network.name} />
            <InfoRow label="Chain ID" value={String(network.chainId)} />
            <InfoRow label="Symbol" value={network.symbol} />
            <InfoRow
              label="Explorer"
              value={network.explorer}
              link={`${network.explorer}/address/${wallet?.address}`}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4 animate-in fade-in duration-300">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No transactions yet</p>
                <p className="text-xs mt-1">Send or receive to see activity here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <TxCard key={tx.hash} tx={tx} myAddress={wallet?.address ?? ""} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/90 px-4 py-2 backdrop-blur-md">
        <NavButton
          icon={<Wallet className="size-5" />}
          label="Wallet"
          active={activeTab === "wallet"}
          onClick={() => setActiveTab("wallet")}
        />
        <NavButton
          icon={<Send className="size-5" />}
          label="Send"
          onClick={() => setShowSend(true)}
        />
        <button
          onClick={() => setShowReceive(true)}
          className="flex flex-col items-center justify-center -mt-4 min-h-[44px] min-w-[44px]"
        >
          <div className="flex items-center justify-center size-12 rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95">
            <SecBadge size={28} className="ring-0" />
          </div>
          <span className="text-[10px] mt-1 text-primary font-medium">Receive</span>
        </button>
        <NavButton
          icon={<Clock className="size-5" />}
          label="Activity"
          active={activeTab === "activity"}
          onClick={() => setActiveTab("activity")}
        />
        <NavButton
          icon={<Settings className="size-5" />}
          label="Settings"
          onClick={() => setShowSettings(true)}
        />
      </nav>

      {/* ===== SEND DIALOG ===== */}
      <Dialog open={showSend} onOpenChange={setShowSend}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <SecBadge size={24} />
              <DialogTitle>Send {network.symbol}</DialogTitle>
            </div>
            <DialogDescription>
              Transfer {network.symbol} on {network.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="send-to">Recipient Address</Label>
              <Input
                id="send-to"
                placeholder="0x..."
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="send-amount">Amount ({network.symbol})</Label>
              <Input
                id="send-amount"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="mt-1.5 font-mono text-sm"
              />
              <button
                onClick={() => setBalance((b) => { setSendAmount(b); return b })}
                className="mt-1 text-xs text-primary hover:underline min-h-[44px] px-1"
              >
                Max: {parseFloat(balance).toFixed(6)} {network.symbol}
              </button>
            </div>
            <div>
              <Label htmlFor="gas-limit">Gas Limit</Label>
              <Input
                id="gas-limit"
                type="number"
                value={sendGasLimit}
                onChange={(e) => setSendGasLimit(e.target.value)}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Current gas: {parseFloat(gasPrice).toFixed(1)} Gwei
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button
              onClick={sendTransaction}
              disabled={sending || !sendTo || !sendAmount}
              className="min-h-[44px]"
            >
              {sending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending..." : "Confirm Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== RECEIVE DIALOG ===== */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <SecBadge size={24} />
              <DialogTitle>Receive {network.symbol}</DialogTitle>
            </div>
            <DialogDescription>Share your address or scan the QR code</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-2xl bg-foreground p-3">
              <QRCodeSVG
                value={wallet?.address ?? ""}
                size={200}
                bgColor="transparent"
                fgColor="var(--background, #0a0f1a)"
                imageSettings={{
                  src: SEC_LOGO,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>
            <div className="w-full rounded-xl border border-border bg-secondary p-3 text-center">
              <p className="break-all font-mono text-xs text-foreground">{wallet?.address}</p>
            </div>
            <Button
              onClick={handleCopyAddress}
              variant="outline"
              className="w-full min-h-[44px]"
            >
              {copied ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied!" : "Copy Address"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== TX RESULT DIALOG ===== */}
      <Dialog open={showTxResult} onOpenChange={setShowTxResult}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <SecBadge size={24} />
              <DialogTitle>{txError ? "Transaction Failed" : "Transaction Sent"}</DialogTitle>
            </div>
          </DialogHeader>
          {txError ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10">
                <AlertTriangle className="size-7 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{txError}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 animate-in zoom-in duration-300">
                <CheckCircle2 className="size-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Your transaction has been broadcast.</p>
              {txHash && (
                <a
                  href={`${network.explorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline min-h-[44px]"
                >
                  View on Explorer
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowTxResult(false)} className="w-full min-h-[44px]">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SETTINGS DIALOG ===== */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <SecBadge size={24} />
              <DialogTitle>Wallet Settings</DialogTitle>
            </div>
            <DialogDescription>Manage your wallet and security</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Recovery Phrase */}
            <div className="rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Recovery Phrase</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="min-h-[44px]"
                >
                  {showMnemonic ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              {showMnemonic && (
                <div className="animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {mnemonic.split(" ").map((word, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 rounded bg-background px-2 py-1"
                      >
                        <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                        <span className="font-mono text-[11px] text-foreground">{word}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(mnemonic)}
                    className="min-h-[44px]"
                  >
                    <Copy className="size-3" />
                    Copy Phrase
                  </Button>
                </div>
              )}
            </div>

            {/* Private Key */}
            <div className="rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Private Key</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="min-h-[44px]"
                >
                  {showPrivateKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              {showPrivateKey && wallet && (
                <div className="animate-in fade-in duration-200">
                  <p className="break-all rounded bg-background p-2 font-mono text-[11px] text-foreground mb-2">
                    {wallet.privateKey}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(wallet.privateKey)}
                    className="min-h-[44px]"
                  >
                    <Copy className="size-3" />
                    Copy Key
                  </Button>
                </div>
              )}
            </div>

            {/* Network */}
            <div className="rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="size-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Network</span>
              </div>
              <Select value={networkKey} onValueChange={setNetworkKey}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NETWORKS).map(([key, net]) => (
                    <SelectItem key={key} value={key}>
                      {net.name} ({net.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={lockWallet} className="w-full min-h-[44px]">
              <LogOut className="size-4" />
              Lock & Clear Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function InfoRow({
  label,
  value,
  mono = false,
  copyable = false,
  link,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
  link?: string
}) {
  const [didCopy, setDidCopy] = useState(false)

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs text-foreground ${mono ? "font-mono" : ""} max-w-[180px] truncate`}>
          {mono && value.length > 16 ? shortAddr(value) : value}
        </span>
        {copyable && (
          <button
            onClick={() => {
              copyText(value)
              setDidCopy(true)
              setTimeout(() => setDidCopy(false), 1500)
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {didCopy ? (
              <CheckCircle2 className="size-3.5 text-primary" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground" />
            )}
          </button>
        )}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ExternalLink className="size-3.5 text-primary" />
          </a>
        )}
      </div>
    </div>
  )
}

function TxCard({ tx, myAddress }: { tx: TxRecord; myAddress: string }) {
  const isSend = tx.from.toLowerCase() === myAddress.toLowerCase()
  const net = NETWORKS[tx.network] || NETWORKS.mainnet

  return (
    <a
      href={`${net.explorer}/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary min-h-[56px]"
    >
      <div
        className={`flex items-center justify-center size-9 rounded-full ${
          isSend ? "bg-destructive/10" : "bg-primary/10"
        }`}
      >
        {isSend ? (
          <ArrowUpRight className="size-4 text-destructive" />
        ) : (
          <ArrowDownLeft className="size-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {isSend ? "Sent" : "Received"}
          </span>
          <Badge
            variant={
              tx.status === "confirmed"
                ? "default"
                : tx.status === "pending"
                ? "secondary"
                : "destructive"
            }
            className="text-[10px] px-1.5 py-0"
          >
            {tx.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {isSend ? `To: ${shortAddr(tx.to)}` : `From: ${shortAddr(tx.from)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${isSend ? "text-destructive" : "text-primary"}`}>
          {isSend ? "-" : "+"}
          {tx.value}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(tx.timestamp).toLocaleDateString()}
        </p>
      </div>
    </a>
  )
}

function NavButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] px-2 transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

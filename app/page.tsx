"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Image from "next/image"
import { ethers } from "ethers"
import { QRCodeSVG } from "qrcode.react"
import useSWR from "swr"
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
  Lock,
  Search,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldCheck,
  Fingerprint,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Network Configuration
// ---------------------------------------------------------------------------
const NETWORKS: Record<
  string,
  { name: string; rpc: string; chainId: number; symbol: string; explorer: string; decimals: number; coingeckoId: string }
> = {
  mainnet: {
    name: "Ethereum",
    rpc: "https://eth.llamarpc.com",
    chainId: 1,
    symbol: "ETH",
    explorer: "https://etherscan.io",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  sepolia: {
    name: "Sepolia Testnet",
    rpc: "https://rpc.sepolia.org",
    chainId: 11155111,
    symbol: "SepoliaETH",
    explorer: "https://sepolia.etherscan.io",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  polygon: {
    name: "Polygon",
    rpc: "https://polygon-rpc.com",
    chainId: 137,
    symbol: "MATIC",
    explorer: "https://polygonscan.com",
    decimals: 18,
    coingeckoId: "matic-network",
  },
  bsc: {
    name: "BNB Smart Chain",
    rpc: "https://bsc-dataseed.binance.org",
    chainId: 56,
    symbol: "BNB",
    explorer: "https://bscscan.com",
    decimals: 18,
    coingeckoId: "binancecoin",
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    symbol: "ETH",
    explorer: "https://arbiscan.io",
    decimals: 18,
    coingeckoId: "ethereum",
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

interface CoinData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap: number
  market_cap_rank: number
  total_volume: number
  sparkline_in_7d?: { price: number[] }
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

function formatUsd(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(6)}`
}

const SEC_LOGO = "/sec-logo.jpeg"

// ---------------------------------------------------------------------------
// CoinGecko Free API fetcher
// ---------------------------------------------------------------------------
const COINGECKO_MARKETS =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=120&page=1&sparkline=true&price_change_percentage=24h"

async function fetchMarkets(url: string): Promise<CoinData[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error("CoinGecko API error")
  return res.json()
}

// ---------------------------------------------------------------------------
// Minion Guard SVG Component
// ---------------------------------------------------------------------------
function MinionGuard({ side, className = "" }: { side: "left" | "right"; className?: string }) {
  const flip = side === "right"
  return (
    <div
      className={`select-none ${className}`}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <svg width="64" height="80" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* body */}
        <ellipse cx="32" cy="48" rx="22" ry="28" fill="#F5D442" />
        {/* overalls */}
        <rect x="14" y="52" width="36" height="22" rx="6" fill="#5B7EC2" />
        <rect x="22" y="46" width="20" height="14" rx="3" fill="#5B7EC2" />
        {/* strap left */}
        <line x1="22" y1="46" x2="18" y2="34" stroke="#5B7EC2" strokeWidth="3" strokeLinecap="round" />
        {/* strap right */}
        <line x1="42" y1="46" x2="46" y2="34" stroke="#5B7EC2" strokeWidth="3" strokeLinecap="round" />
        {/* goggle band */}
        <rect x="8" y="32" width="48" height="4" rx="2" fill="#8A8A8A" />
        {/* goggle */}
        <circle cx="32" cy="34" r="10" fill="#C0C0C0" stroke="#8A8A8A" strokeWidth="2" />
        <circle cx="32" cy="34" r="7" fill="white" />
        <circle cx="33" cy="33" r="4.5" fill="#6B4226" />
        <circle cx="34" cy="32" r="2" fill="black" />
        <circle cx="35.5" cy="30.5" r="1" fill="white" />
        {/* mouth */}
        <path d="M26 50 Q32 55 38 50" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* arm holding shield */}
        <ellipse cx="8" cy="48" rx="6" ry="4" fill="#F5D442" />
        {/* shield */}
        <path d="M2 38 L8 32 L14 38 L8 52 Z" fill="var(--primary)" opacity="0.9" />
        <path d="M8 36 L8 46" stroke="var(--primary-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 40 L11 40" stroke="var(--primary-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        {/* feet */}
        <ellipse cx="24" cy="74" rx="6" ry="3" fill="#333" />
        <ellipse cx="40" cy="74" rx="6" ry="3" fill="#333" />
        {/* hair */}
        <path d="M28 20 Q30 14 32 20" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M34 20 Q36 12 38 20" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Animated floating minion pair
// ---------------------------------------------------------------------------
function GuardMinions() {
  return (
    <div className="flex items-center justify-center gap-2 my-4">
      <div className="animate-bounce" style={{ animationDuration: "2.2s", animationDelay: "0s" }}>
        <MinionGuard side="left" />
      </div>
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
        <div className="relative z-10 rounded-full border-2 border-primary/30 p-1">
          <SecBadge size={56} className="ring-2 ring-primary/40" />
        </div>
      </div>
      <div className="animate-bounce" style={{ animationDuration: "2.2s", animationDelay: "0.3s" }}>
        <MinionGuard side="right" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small inline minion for decor
// ---------------------------------------------------------------------------
function MiniMinion({ className = "" }: { className?: string }) {
  return (
    <svg width="24" height="30" viewBox="0 0 64 80" fill="none" className={className}>
      <ellipse cx="32" cy="48" rx="22" ry="28" fill="#F5D442" />
      <rect x="14" y="52" width="36" height="22" rx="6" fill="#5B7EC2" />
      <rect x="22" y="46" width="20" height="14" rx="3" fill="#5B7EC2" />
      <rect x="8" y="32" width="48" height="4" rx="2" fill="#8A8A8A" />
      <circle cx="32" cy="34" r="10" fill="#C0C0C0" stroke="#8A8A8A" strokeWidth="2" />
      <circle cx="32" cy="34" r="7" fill="white" />
      <circle cx="33" cy="33" r="4.5" fill="#6B4226" />
      <circle cx="34" cy="32" r="2" fill="black" />
      <circle cx="35.5" cy="30.5" r="1" fill="white" />
      <path d="M26 50 Q32 55 38 50" stroke="#333" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="24" cy="74" rx="6" ry="3" fill="#333" />
      <ellipse cx="40" cy="74" rx="6" ry="3" fill="#333" />
    </svg>
  )
}

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
// Sparkline mini chart
// ---------------------------------------------------------------------------
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 60
  const h = 20
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "var(--primary)" : "var(--destructive)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  const [activeTab, setActiveTab] = useState("wallet")
  const [coinSearch, setCoinSearch] = useState("")

  // Privacy: phrase & key only visible via Settings
  const [settingsShowPhrase, setSettingsShowPhrase] = useState(false)
  const [settingsShowKey, setSettingsShowKey] = useState(false)

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

  // -------------------------------------------------------------------------
  // Fetch 120 coins from CoinGecko (free, no key)
  // -------------------------------------------------------------------------
  const { data: coins } = useSWR<CoinData[]>(
    view === "dashboard" ? COINGECKO_MARKETS : null,
    fetchMarkets,
    { refreshInterval: 60000, revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  const filteredCoins = useMemo(() => {
    if (!coins) return []
    if (!coinSearch.trim()) return coins
    const q = coinSearch.toLowerCase()
    return coins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    )
  }, [coins, coinSearch])

  // Compute USD value of current balance
  const balanceUsd = useMemo(() => {
    if (!coins) return null
    const match = coins.find((c) => c.id === network.coingeckoId)
    if (!match) return null
    return parseFloat(balance) * match.current_price
  }, [coins, balance, network.coingeckoId])

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
    setSettingsShowPhrase(false)
    setSettingsShowKey(false)
    setActiveTab("wallet")
    setShowSettings(false)
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
          {/* Minion guards flanking logo */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <GuardMinions />
          </div>

          <div className="mb-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SecWallet</h1>
            <p className="mt-1 text-sm text-muted-foreground">Guarded by minions. Secured by you.</p>
          </div>

          <Tabs defaultValue="create" className="w-full animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
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
                  Generate a brand new Ethereum wallet with a secure 12-word recovery phrase.
                  Your keys never leave this device.
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
                  Enter your 12-word mnemonic phrase to restore access to your wallet.
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

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground animate-in fade-in duration-1000 delay-300">
            <Lock className="size-3" />
            <span>Client-side only. Keys never leave your browser.</span>
          </div>
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
            <div className="flex items-center gap-2">
              <MiniMinion className="opacity-70" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Balance
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { fetchBalance(); fetchGas() }}
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

          {balanceUsd !== null && (
            <p className="text-sm text-muted-foreground mb-2">
              {formatUsd(balanceUsd)} USD
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
            className="min-h-[52px] rounded-xl text-sm font-semibold border-border text-foreground"
            size="lg"
          >
            <ArrowDownLeft className="size-4" />
            Receive
          </Button>
        </div>

        {/* Tabs: Wallet / Markets / Activity */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-11">
            <TabsTrigger value="wallet" className="flex-1 min-h-[44px]">Wallet</TabsTrigger>
            <TabsTrigger value="markets" className="flex-1 min-h-[44px]">
              <Coins className="size-3.5 mr-1" />
              Markets
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-h-[44px]">Activity</TabsTrigger>
          </TabsList>

          {/* ---- Wallet Tab ---- */}
          <TabsContent value="wallet" className="mt-4 space-y-3 animate-in fade-in duration-300">
            <InfoRow label="Address" value={wallet?.address ?? ""} mono copyable />
            <InfoRow label="Network" value={network.name} />
            <InfoRow label="Chain ID" value={String(network.chainId)} />
            <InfoRow label="Symbol" value={network.symbol} />
            <InfoRow
              label="Explorer"
              value={network.explorer.replace("https://", "")}
              link={`${network.explorer}/address/${wallet?.address}`}
            />

            {/* Security status */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center size-10 rounded-full bg-primary/10">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Wallet Secured</p>
                  <p className="text-xs text-muted-foreground">Your keys are guarded locally</p>
                </div>
                <MiniMinion className="ml-auto opacity-60" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Fingerprint className="size-3 text-primary" />
                  Client-side keys
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="size-3 text-primary" />
                  Session encrypted
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Shield className="size-3 text-primary" />
                  No server storage
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <KeyRound className="size-3 text-primary" />
                  Keys in Settings
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ---- Markets Tab (100+ coins) ---- */}
          <TabsContent value="markets" className="mt-4 animate-in fade-in duration-300">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search 120+ tokens..."
                value={coinSearch}
                onChange={(e) => setCoinSearch(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>

            {!coins ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <RefreshCw className="size-6 animate-spin mb-3 opacity-40" />
                <p className="text-sm">Loading live prices...</p>
              </div>
            ) : filteredCoins.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Search className="size-8 mb-3 opacity-30" />
                <p className="text-sm">No tokens found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredCoins.map((coin) => {
                  const positive = coin.price_change_percentage_24h >= 0
                  return (
                    <div
                      key={coin.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">
                          {coin.market_cap_rank}
                        </span>
                        <Image
                          src={coin.image}
                          alt={coin.name}
                          width={28}
                          height={28}
                          className="rounded-full shrink-0"
                          crossOrigin="anonymous"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{coin.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{coin.symbol}</p>
                        </div>
                      </div>
                      <Sparkline
                        data={coin.sparkline_in_7d?.price ?? []}
                        positive={positive}
                      />
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {formatUsd(coin.current_price)}
                        </p>
                        <p className={`text-[10px] font-medium tabular-nums flex items-center justify-end gap-0.5 ${
                          positive ? "text-primary" : "text-destructive"
                        }`}>
                          {positive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ---- Activity Tab ---- */}
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
          icon={<Coins className="size-5" />}
          label="Markets"
          active={activeTab === "markets"}
          onClick={() => setActiveTab("markets")}
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
                onClick={() => setSendAmount(balance)}
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

      {/* ===== SETTINGS DIALOG (phrase + key access) ===== */}
      <Dialog open={showSettings} onOpenChange={(open) => {
        setShowSettings(open)
        if (!open) {
          setSettingsShowPhrase(false)
          setSettingsShowKey(false)
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <SecBadge size={24} />
              <DialogTitle>Settings & Security</DialogTitle>
            </div>
            <DialogDescription>Manage your wallet, keys, and privacy</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Minion guard banner */}
            <div className="flex items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="animate-bounce" style={{ animationDuration: "2s" }}>
                <MiniMinion />
              </div>
              <p className="text-xs text-muted-foreground text-center flex-1">
                Your secrets are guarded. Only reveal them in a safe environment.
              </p>
              <div className="animate-bounce" style={{ animationDuration: "2s", animationDelay: "0.4s" }}>
                <MiniMinion />
              </div>
            </div>

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
                  onClick={() => setSettingsShowPhrase(!settingsShowPhrase)}
                  className="min-h-[44px]"
                >
                  {settingsShowPhrase ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              {!settingsShowPhrase ? (
                <div className="flex items-center gap-2 rounded-lg bg-background/50 p-3">
                  <Lock className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Tap the eye icon to reveal your 12-word phrase
                  </span>
                </div>
              ) : (
                <div className="animate-in fade-in duration-200">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 mb-3">
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Never share your phrase. Anyone with it can access your funds.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {mnemonic.split(" ").map((word, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 rounded bg-background px-2 py-1.5"
                      >
                        <span className="text-[10px] text-muted-foreground w-3 text-right">{i + 1}</span>
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
                  onClick={() => setSettingsShowKey(!settingsShowKey)}
                  className="min-h-[44px]"
                >
                  {settingsShowKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              {!settingsShowKey ? (
                <div className="flex items-center gap-2 rounded-lg bg-background/50 p-3">
                  <Lock className="size-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Tap the eye icon to reveal your private key
                  </span>
                </div>
              ) : wallet && (
                <div className="animate-in fade-in duration-200">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 mb-3">
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Never share your private key. It gives full access to your wallet.
                    </p>
                  </div>
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

            {/* Privacy Info */}
            <div className="rounded-xl border border-border bg-secondary p-4">
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="size-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Privacy</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                  <span>Keys stored in session memory only, cleared on lock</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                  <span>No server communication for key material</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                  <span>Recovery phrase hidden by default everywhere</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-3.5 text-primary mt-0.5 shrink-0" />
                  <span>All RPC calls are read-only except signed transactions</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
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

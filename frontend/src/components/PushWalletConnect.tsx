import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Extend Window interface for Web3 providers
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

export default function PushWalletConnect() {
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [isConnectingEvm, setIsConnectingEvm] = useState(false);
  const [isConnectingSolana, setIsConnectingSolana] = useState(false);

  // Load saved addresses from localStorage on mount
  useEffect(() => {
    const savedEvmAddress = localStorage.getItem('evmWalletAddress');
    const savedSolanaAddress = localStorage.getItem('solanaWalletAddress');
    if (savedEvmAddress) setEvmAddress(savedEvmAddress);
    if (savedSolanaAddress) setSolanaAddress(savedSolanaAddress);
  }, []);

  const connectEvmWallet = async () => {
    if (!window.ethereum) {
      toast.error('No EVM wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    setIsConnectingEvm(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      const address = accounts[0];
      setEvmAddress(address);
      localStorage.setItem('evmWalletAddress', address);
      toast.success('EVM wallet connected successfully');
    } catch (error: any) {
      console.error('EVM wallet connection error:', error);
      toast.error(error.message || 'Failed to connect EVM wallet');
    } finally {
      setIsConnectingEvm(false);
    }
  };

  const disconnectEvmWallet = () => {
    setEvmAddress(null);
    localStorage.removeItem('evmWalletAddress');
    toast.success('EVM wallet disconnected');
  };

  const connectSolanaWallet = async () => {
    if (!window.solana) {
      toast.error('No Solana wallet detected. Please install Phantom or another Solana wallet.');
      return;
    }

    setIsConnectingSolana(true);
    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();
      setSolanaAddress(address);
      localStorage.setItem('solanaWalletAddress', address);
      toast.success('Solana wallet connected successfully');
    } catch (error: any) {
      console.error('Solana wallet connection error:', error);
      toast.error(error.message || 'Failed to connect Solana wallet');
    } finally {
      setIsConnectingSolana(false);
    }
  };

  const disconnectSolanaWallet = () => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setSolanaAddress(null);
    localStorage.removeItem('solanaWalletAddress');
    toast.success('Solana wallet disconnected');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* EVM Wallet Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">EVM Wallet</h3>
          </div>
          {evmAddress ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>

        {evmAddress ? (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-mono text-muted-foreground">
                {truncateAddress(evmAddress)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectEvmWallet}
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={connectEvmWallet}
            disabled={isConnectingEvm}
            className="w-full"
          >
            {isConnectingEvm ? 'Connecting...' : 'Connect EVM Wallet'}
          </Button>
        )}
      </div>

      {/* Solana Wallet Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Solana Wallet</h3>
          </div>
          {solanaAddress ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>

        {solanaAddress ? (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-mono text-muted-foreground">
                {truncateAddress(solanaAddress)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={disconnectSolanaWallet}
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            onClick={connectSolanaWallet}
            disabled={isConnectingSolana}
            className="w-full"
          >
            {isConnectingSolana ? 'Connecting...' : 'Connect Solana Wallet'}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Connect your crypto wallets to manage assets within Hyvmind
      </p>
    </div>
  );
}

import { ethers } from 'ethers';
import { SUPPORTED_CHAINS } from '../constants/AppConfig';
import { logger } from '../utils/Logger';

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  chainId: string;
  logoUri?: string | any;
  isNative?: boolean;
  isStablecoin?: boolean;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  formattedBalance: string;
}

export interface TokenTransaction {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  chainId: string;
  blockExplorer?: string;
}

export class TokenWalletManager {
  private providers: { [key: string]: ethers.JsonRpcProvider } = {};
  private logger = logger;
  private initialized = false;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    try {
      this.logger.info('[TokenWallet] Initializing providers...');
      this.logger.info('[TokenWallet] SUPPORTED_CHAINS:', Object.keys(SUPPORTED_CHAINS));
      
      for (const [chainKey, chain] of Object.entries(SUPPORTED_CHAINS)) {
        try {
          this.logger.info(`[TokenWallet] Processing chain: ${chainKey}`, {
            name: chain.name,
            rpcUrl: chain.rpcUrl,
            chainId: chain.chainId
          });
          
          if (!chain.rpcUrl) {
            this.logger.error(`[TokenWallet] No RPC URL configured for chain ${chainKey}`);
            continue;
          }
          
          if (chain.rpcUrl === '') {
            this.logger.error(`[TokenWallet] Empty RPC URL for chain ${chainKey}`);
            continue;
          }
          
          const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
          this.providers[chainKey] = provider;
          this.logger.info(`[TokenWallet] Successfully initialized provider for ${chain.name} with key ${chainKey} and RPC URL: ${chain.rpcUrl}`);
        } catch (error) {
          this.logger.error(`[TokenWallet] Failed to create provider for ${chain.name}:`, error);
        }
      }
      
      this.initialized = true;
      this.logger.info(`[TokenWallet] Provider initialization complete. Available providers: ${Object.keys(this.providers).join(', ')}`);
      this.logger.info(`[TokenWallet] Providers object:`, this.providers);
    } catch (error) {
      this.logger.error('[TokenWallet] Failed to initialize providers:', error);
      throw new Error('Failed to initialize blockchain providers');
    }
  }

  private ensureProvidersInitialized() {
    if (!this.initialized) {
      this.logger.warn('[TokenWallet] Providers not initialized, attempting to reinitialize...');
      this.initializeProviders();
    }
    
    if (!this.providers || Object.keys(this.providers).length === 0) {
      this.logger.error('[TokenWallet] No providers available after initialization, attempting fallback...');
      this.createFallbackProviders();
    }
    
    if (!this.providers || Object.keys(this.providers).length === 0) {
      throw new Error('No blockchain providers available');
    }
  }

  private createFallbackProviders() {
    this.logger.info('[TokenWallet] Creating fallback providers...');
    
    try {
      // Create providers with hardcoded URLs as fallback
      const fallbackUrls = {
        base_sepolia: 'https://sepolia.base.org',
        core_testnet: 'https://rpc.test2.btcs.network'
      };
      
      for (const [chainKey, rpcUrl] of Object.entries(fallbackUrls)) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          this.providers[chainKey] = provider;
          this.logger.info(`[TokenWallet] Created fallback provider for ${chainKey} with URL: ${rpcUrl}`);
        } catch (error) {
          this.logger.error(`[TokenWallet] Failed to create fallback provider for ${chainKey}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('[TokenWallet] Failed to create fallback providers:', error);
    }
  }

  // Public method to get provider status for debugging
  getProviderStatus() {
    return {
      initialized: this.initialized,
      availableProviders: Object.keys(this.providers),
      providersCount: Object.keys(this.providers).length,
      supportedChains: Object.keys(SUPPORTED_CHAINS)
    };
  }

  // Public method to manually reinitialize providers
  async reinitializeProviders() {
    this.logger.info('[TokenWallet] Manually reinitializing providers...');
    this.initialized = false;
    this.providers = {};
    this.initializeProviders();
    return this.getProviderStatus();
  }

  async getTokenBalance(walletAddress: string, token: TokenInfo): Promise<TokenBalance> {
    this.ensureProvidersInitialized();
    
    const chainConfig = SUPPORTED_CHAINS[token.chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${token.chainId}`);
    }

    const provider = this.providers[token.chainId];
    if (!provider) {
      this.logger.error(`[TokenWallet] Provider not found for chainId: ${token.chainId}. Available provider keys:`, Object.keys(this.providers));
      throw new Error(`Provider not initialized for chain ${token.chainId}`);
    }

    try {
      let balance = '0';
      let formattedBalance = '0';

      if (token.isNative) {
        const rawBalance = await provider.getBalance(walletAddress);
        balance = rawBalance.toString();
        formattedBalance = ethers.formatEther(rawBalance);
      } else {
        const tokenContract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );
        const rawBalance = await tokenContract.balanceOf(walletAddress);
        balance = rawBalance.toString();
        formattedBalance = ethers.formatUnits(rawBalance, token.decimals);
      }

      return {
        token,
        balance,
        formattedBalance
      };
    } catch (error) {
      this.logger.error(`[TokenWallet] Failed to get token balance for ${token.symbol}:`, error);
      throw error;
    }
  }

  async sendTokenTransaction(
    privateKey: string,
    toAddress: string,
    amount: string,
    tokenInfo: TokenInfo,
    paymentReference?: string,
    gasPrice?: string
  ): Promise<TokenTransaction> {
    // Ensure providers are initialized
    this.ensureProvidersInitialized();
    
    // Robust validation and logging
    logger.info('[TokenWallet] sendTokenTransaction debug', {
      privateKey: privateKey ? privateKey.slice(0, 8) + '...' : privateKey,
      toAddress,
      amount,
      tokenInfo,
      paymentReference
    });
    
    if (!privateKey || typeof privateKey !== 'string' || !privateKey.startsWith('0x')) {
      throw new Error('Invalid or missing private key');
    }
    if (!toAddress || typeof toAddress !== 'string' || !toAddress.startsWith('0x')) {
      throw new Error('Invalid or missing recipient address');
    }
    if (!amount || isNaN(Number(amount))) {
      throw new Error('Invalid or missing amount');
    }
    if (!tokenInfo || typeof tokenInfo !== 'object') {
      throw new Error('Invalid or missing token info');
    }
    if (!tokenInfo.chainId || typeof tokenInfo.chainId !== 'string') {
      throw new Error('Invalid or missing tokenInfo.chainId');
    }
    if (tokenInfo.isNative === false && (!tokenInfo.address || !tokenInfo.address.startsWith('0x'))) {
      throw new Error('Invalid or missing token contract address');
    }
    
    const chainConfig = SUPPORTED_CHAINS[tokenInfo.chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${tokenInfo.chainId}`);
    }
    
    // Check if providers object exists and has the required chain
    if (!this.providers) {
      this.logger.error('[TokenWallet] Providers object is undefined');
      throw new Error('Blockchain providers not initialized');
    }
    
    const provider = this.providers[tokenInfo.chainId];
    if (!provider) {
      this.logger.error(`[TokenWallet] Provider not found for chainId: ${tokenInfo.chainId}. Available provider keys:`, Object.keys(this.providers));
      throw new Error(`Provider not initialized for chain ${tokenInfo.chainId}`);
    }
    
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Prepare transaction options with gas price if provided
      const txOptions: any = {
        to: toAddress,
        data: paymentReference ? ethers.hexlify(new TextEncoder().encode(paymentReference)) : undefined
      };

      if (tokenInfo.isNative) {
        txOptions.value = ethers.parseEther(amount);
      }

      // Add gas price if provided
      if (gasPrice) {
        txOptions.gasPrice = BigInt(gasPrice);
        logger.info('[TokenWallet] Using custom gas price', {
          gasPrice: gasPrice,
          gasPriceGwei: Number(ethers.formatUnits(BigInt(gasPrice), 'gwei'))
        });
      }

      if (tokenInfo.isNative) {
        const tx = await wallet.sendTransaction(txOptions);
        return {
          hash: tx.hash,
          status: 'pending',
          chainId: tokenInfo.chainId,
          blockExplorer: chainConfig.blockExplorer ? `${chainConfig.blockExplorer}/tx/${tx.hash}` : undefined
        };
      } else {
        const tokenContract = new ethers.Contract(
          tokenInfo.address,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          wallet
        );
        const decimals = await tokenContract.decimals();
        const tx = await tokenContract.transfer(
          toAddress,
          ethers.parseUnits(amount, decimals),
          gasPrice ? { gasPrice: BigInt(gasPrice) } : undefined
        );
        return {
          hash: tx.hash,
          status: 'pending',
          chainId: tokenInfo.chainId,
          blockExplorer: chainConfig.blockExplorer ? `${chainConfig.blockExplorer}/tx/${tx.hash}` : undefined
        };
      }
    } catch (error) {
      logger.error(`[TokenWallet] Failed to send token transaction:`, error instanceof Error ? error.stack || error.message : error);
      throw error;
    }
  }
}

export default new TokenWalletManager(); 
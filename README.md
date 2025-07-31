![AirChainPay Logo](https://rose-imaginative-lion-87.mypinata.cloud/ipfs/bafybeiaer2oyqh5qpkmtuewgqcbaxjjvrleblkisor37nkib3nhesgency)

# AirChainPay Wallet

AirChainPay Wallet is a next-generation multi-chain mobile wallet for seamless, secure, and instant crypto transactions—online and offline. Built with React Native and Expo, it enables payments across multiple networks, even with limited or no internet. Designed for interoperability, privacy, and ease of use for merchants and consumers.

---

## Features

### Multi-Chain Support
- **Base Sepolia** - Ethereum Layer 2 testnet
- **Core Testnet** - Core blockchain testnet
- Extensible architecture for additional networks

### Token Support
- **Native tokens** (ETH, CORE)
- **ERC-20 tokens** (USDC, USDT)
- Mock tokens for testing and development

### Offline Payments
- **Bluetooth (BLE) peer-to-peer transfer** for offline payments
- Secure device pairing and communication
- Offline transaction queue with automatic retry

### Security Features
- **Hardware-backed secure storage** (iOS Keychain, Android Keystore)
- **Encrypted wallet data** with secure key management
- **Hybrid storage** (Keychain + SecureStore fallback)
- **Zero memory exposure** for private keys and sensitive data

### User Experience
- **QR code scanning** for payment addresses
- **Transaction history** and status tracking
- **Multi-token balance view** with real-time updates
- **Cross-wallet security warnings** and offline transaction expiry notifications
- **Modern, responsive UI** with dark/light theme support

### Development Features
- **EVM wallet and signing** capabilities
- **Gas price validation** and optimization
- **Comprehensive error handling** and user feedback
- **Debug scripts** for development and testing

---

## Project Structure

```
airchainpay-wallet/
├── app/                    # Expo Router app screens
│   ├── (tabs)/            # Tab-based navigation
│   ├── _layout.tsx        # Root layout
│   └── *.tsx              # Individual screens
├── components/             # Reusable UI components
├── constants/              # App constants and configuration
├── hooks/                  # Custom React hooks
├── src/                    # Core application code
│   ├── bluetooth/         # BLE communication
│   ├── components/        # App-specific components
│   ├── constants/         # App constants
│   ├── hooks/             # Custom hooks
│   ├── screens/           # Screen components
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── wallet/            # Wallet management
├── android/               # Android-specific files
├── ios/                   # iOS-specific files
├── assets/                # Static assets
└── scripts/               # Development and deployment scripts
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Airchainpay/airchainpay-wallet.git
   cd airchainpay-wallet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp sample.env.staging .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run start
   ```

### Development

#### Running on Different Platforms
```bash
# Start Expo development server
npm run start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web
npm run web
```

#### Debug Scripts
The project includes various debug and fix scripts in the `scripts/` directory:
- `fix-ble-issues.js` - Fix common BLE issues
- `fix-camera-error.js` - Resolve camera permissions
- `start-emulator.sh` - Start Android emulator
- `test-ble-advertising.js` - Test BLE advertising

---

## Configuration

### Environment Variables
Create a `.env` file based on `sample.env.staging`:

```env
# Blockchain RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CORE_TESTNET_RPC_URL=https://rpc.test.btcs.network

# Relay Server URLs
RELAY_SERVER_URL=https://your-relay-server.com

# API Keys (if required)
ETHERSCAN_API_KEY=your_etherscan_api_key

# App Configuration
APP_ENV=development
DEBUG_MODE=true
```

### Network Configuration
The app supports multiple blockchain networks. Configuration is handled in `src/constants/config.ts`.

---

## Security

### Key Management
- **Hardware-backed storage** using iOS Keychain and Android Keystore
- **Encrypted wallet data** with secure key derivation
- **Zero memory exposure** for sensitive data
- **Secure BLE communication** with device pairing

### Best Practices
- Never commit secrets or API keys to git
- Use environment variables for sensitive configuration
- Regularly update dependencies for security patches
- Follow secure coding practices for wallet applications

---

## Architecture

### Core Components
- **BluetoothManager** - Handles BLE communication and device discovery
- **MultiChainWalletManager** - Manages wallet operations across different networks
- **TransactionService** - Handles transaction creation, signing, and broadcasting
- **SecureStorageService** - Manages encrypted storage of sensitive data

### Data Flow
1. **Wallet Creation** → Secure key generation and storage
2. **Transaction Initiation** → Gas estimation and transaction building
3. **Signing** → Secure transaction signing with hardware-backed keys
4. **Broadcasting** → Transaction submission to blockchain networks
5. **Confirmation** → Transaction status monitoring and updates

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Follow the existing code style and patterns

---

## Troubleshooting

### Common Issues

#### BLE Issues
```bash
npm run fix-ble-issues
```

#### Camera Permissions
```bash
npm run fix-camera-error
```

#### Android Emulator
```bash
./scripts/start-emulator.sh
```

#### Dependencies
```bash
npm run fix-ethers-deps
```

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the debug scripts in the `scripts/` directory

---

## Roadmap

- [ ] Additional blockchain network support
- [ ] Enhanced offline transaction capabilities
- [ ] Advanced security features
- [ ] Performance optimizations
- [ ] Additional token support 

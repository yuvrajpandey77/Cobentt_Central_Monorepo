import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, arbitrum, optimism, sepolia, polygonMumbai, arbitrumSepolia, optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Cogerphere',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    mainnet,
    polygon,
    arbitrum,
    optimism,
    sepolia,
    polygonMumbai,
    arbitrumSepolia,
    optimismSepolia,
  ],
  ssr: true,
});

// Chain configurations for easy access
export const CHAIN_CONFIGS = {
  ethereum: {
    mainnet: mainnet,
    testnet: sepolia,
  },
  polygon: {
    mainnet: polygon,
    testnet: polygonMumbai,
  },
  arbitrum: {
    mainnet: arbitrum,
    testnet: arbitrumSepolia,
  },
  optimism: {
    mainnet: optimism,
    testnet: optimismSepolia,
  },
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIGS;
export type NetworkType = 'mainnet' | 'testnet';

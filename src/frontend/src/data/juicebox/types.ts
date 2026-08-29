export interface JuiceboxContractData {
  address: string;
}

export interface JuiceboxDeployment {
  chainId: number;
  contracts: Record<string, JuiceboxContractData>;
}

import base from "./base";
import baseSepolia from "./baseSepolia";
import type { JuiceboxContractData, JuiceboxDeployment } from "./types";

export type { JuiceboxContractData, JuiceboxDeployment } from "./types";

const DEPLOYMENTS: JuiceboxDeployment[] = [base, baseSepolia];

export function deploymentForChain(
  chainId: number,
): JuiceboxDeployment | undefined {
  return DEPLOYMENTS.find((d) => d.chainId === chainId);
}

export function contractOf(
  chainId: number,
  name: string,
): JuiceboxContractData | undefined {
  return deploymentForChain(chainId)?.contracts[name];
}

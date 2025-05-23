import { memo, useEffect, useState } from 'react';
import { webcontainer } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

interface ContractABI {
  inputs: Array<{
    name: string;
    type: string;
    internalType: string;
  }>;
  stateMutability: string;
  type: string;
}

interface ContractBuild {
  abi: ContractABI[];
  bytecode: string;
  contractName: string;
}

interface SolidityOutput {
  abi: ContractABI[];
  evm: {
    bytecode: {
      object: string;
    };
  };
}

interface RPCConfig {
  url: string;
  chainId: number;
  privateKey: string;
}

interface DeployedContract {
  address: string;
  contractName: string;
  network: string;
  deployedAt: string;
  constructorArgs: Record<string, string>;
}

interface DeploymentFormProps {
  contractName: string;
  constructorInputs: ContractABI['inputs'];
  onDeploy: (values: Record<string, string>) => Promise<void>;
  rpcConfig: RPCConfig;
}

const DeploymentForm = memo(({ contractName, constructorInputs, onDeploy, rpcConfig }: DeploymentFormProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    try {
      await onDeploy(values);
      toast.success('Contract deployed successfully!');
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Failed to deploy contract');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary">{contractName}</h3>
      {constructorInputs.map((input) => (
        <div key={input.name} className="space-y-1">
          <label className="block text-sm font-medium text-bolt-elements-textSecondary">
            {input.name} ({input.type})
          </label>
          <input
            type="text"
            value={values[input.name] || ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [input.name]: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder={`Enter ${input.name}`}
            required
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={isDeploying || !rpcConfig.url || !rpcConfig.privateKey}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeploying ? 'Deploying...' : 'Deploy Contract'}
      </button>
    </form>
  );
});

const RPCSettings = memo(({ config, onChange }: { config: RPCConfig; onChange: (config: RPCConfig) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-bolt-elements-borderColor">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 text-left flex items-center justify-between text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 transition-colors"
      >
        <span className="flex items-center gap-2">
          <div className="i-ph:gear" />
          RPC Settings
        </span>
        <div className={`i-ph:caret-${isExpanded ? 'up' : 'down'}`} />
      </button>
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-bolt-elements-textSecondary">RPC URL</label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => onChange({ ...config, url: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-bolt-elements-textSecondary">Chain ID</label>
            <input
              type="number"
              value={config.chainId}
              onChange={(e) => onChange({ ...config, chainId: parseInt(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="1"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-bolt-elements-textSecondary">Private Key</label>
            <input
              type="password"
              value={config.privateKey}
              onChange={(e) => onChange({ ...config, privateKey: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="0x..."
            />
          </div>
        </div>
      )}
    </div>
  );
});

const DeployedContracts = memo(({ contracts }: { contracts: DeployedContract[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (contracts.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 w-80">
      <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 text-left flex items-center justify-between text-bolt-elements-textPrimary bg-bolt-elements-background-depth-1 transition-colors rounded-t-lg"
        >
          <span className="flex items-center gap-2">
            <div className="i-ph:cube" />
            Deployed Contracts
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-500 rounded-full">
              {contracts.length}
            </span>
          </span>
          <div className={`i-ph:caret-${isExpanded ? 'up' : 'down'}`} />
        </button>
        {isExpanded && (
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {contracts.map((contract) => (
              <div
                key={contract.address}
                className="p-3 bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-bolt-elements-textPrimary truncate">
                      {contract.contractName}
                    </h4>
                    <p className="text-xs text-bolt-elements-textSecondary mt-1 break-all">
                      {contract.address}
                    </p>
                    <p className="text-xs text-bolt-elements-textTertiary mt-1">
                      {new Date(contract.deployedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contract.address);
                      toast.success('Address copied to clipboard');
                    }}
                    className="p-1 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary rounded-lg hover:bg-bolt-elements-background-depth-2 transition-colors"
                    title="Copy address"
                  >
                    <div className="i-ph:copy" />
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-bolt-elements-borderColor">
                  <p className="text-xs text-bolt-elements-textSecondary">Network: {contract.network}</p>
                  {Object.entries(contract.constructorArgs).length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-bolt-elements-textSecondary">Constructor Args:</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(contract.constructorArgs).map(([key, value]) => (
                          <div key={key} className="text-xs text-bolt-elements-textTertiary">
                            {key}: {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export const DeploymentsView = memo(() => {
  const [contracts, setContracts] = useState<Record<string, ContractBuild>>({});
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [rpcConfig, setRPCConfig] = useState<RPCConfig>(() => {
    const saved = localStorage.getItem('rpcConfig');
    return saved ? JSON.parse(saved) : { url: '', chainId: 1, privateKey: '' };
  });
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>(() => {
    const saved = localStorage.getItem('deployedContracts');
    return saved ? JSON.parse(saved) : [];
  });

  // Save RPC config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('rpcConfig', JSON.stringify(rpcConfig));
  }, [rpcConfig]);

  // Save deployed contracts to localStorage when they change
  useEffect(() => {
    localStorage.setItem('deployedContracts', JSON.stringify(deployedContracts));
  }, [deployedContracts]);

  const loadContracts = async () => {
    try {
      const wc = await webcontainer;
      const buildDir = await wc.fs.readdir('/build');
      const contractFiles = buildDir.filter((file) => file.endsWith('.json'));

      const loadedContracts: Record<string, ContractBuild> = {};
      for (const file of contractFiles) {
        const content = await wc.fs.readFile(`/build/${file}`, 'utf-8');
        const contractData = JSON.parse(content) as SolidityOutput;
        
        // Extract contract name from filename
        const contractName = file.replace('.json', '');
        
        loadedContracts[file] = {
          abi: contractData.abi,
          bytecode: contractData.evm.bytecode.object,
          contractName: contractName
        };
      }

      setContracts(loadedContracts);
      if (Object.keys(loadedContracts).length > 0) {
        setSelectedContract(Object.keys(loadedContracts)[0]);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Failed to load contract build files');
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleDeploy = async (values: Record<string, string>) => {
    if (!selectedContract) return;

    const contract = contracts[selectedContract];
    const constructor = contract.abi.find((item) => item.type === 'constructor');

    if (!constructor) {
      throw new Error('No constructor found in contract ABI');
    }

    try {
      // Create provider and signer
      const provider = new ethers.JsonRpcProvider(rpcConfig.url);
      const wallet = new ethers.Wallet(rpcConfig.privateKey, provider);

      // Create contract factory
      const factory = new ethers.ContractFactory(contract.abi, contract.bytecode, wallet);

      // Convert constructor arguments to the correct types
      const constructorArgs = constructor.inputs.map((input, index) => {
        const value = values[input.name];
        switch (input.type) {
          case 'uint256':
            return BigInt(value);
          case 'address':
            return value;
          case 'bool':
            return value === 'true';
          case 'string':
            return value;
          default:
            return value;
        }
      });

      // Deploy contract
      const contractInstance = await factory.deploy(...constructorArgs);
      await contractInstance.waitForDeployment();

      const address = await contractInstance.getAddress();
      
      // Add to deployed contracts
      const network = await provider.getNetwork();
      const newDeployedContract: DeployedContract = {
        address,
        contractName: contract.contractName,
        network: `${network.name} (${network.chainId})`,
        deployedAt: new Date().toISOString(),
        constructorArgs: values
      };
      
      setDeployedContracts(prev => [...prev, newDeployedContract]);
      
      toast.success(`Contract deployed to: ${address}`);
      console.log('Contract deployed to:', address);
    } catch (error) {
      console.error('Deployment error:', error);
      let errorMessage = 'Failed to deploy contract';
      
      if (error instanceof Error) {
        // Handle common ethers.js errors
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for deployment';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please try again';
        } else if (error.message.includes('gas')) {
          errorMessage = 'Gas estimation failed. Check constructor arguments';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  if (Object.keys(contracts).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 mb-4 text-bolt-elements-textTertiary">
          <div className="i-ph:file-dashed" />
        </div>
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary">No Contracts Found</h3>
        <p className="mt-2 text-sm text-bolt-elements-textSecondary">
          Build your smart contracts first to see them here.
        </p>
        <button
          onClick={() => loadContracts()}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center gap-2"
        >
          <div className="i-ph:arrows-clockwise" />
          Refresh Contracts
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-64 border-r border-bolt-elements-borderColor">
        <RPCSettings config={rpcConfig} onChange={setRPCConfig} />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-bolt-elements-textPrimary">Contracts</h2>
            <button
              onClick={() => loadContracts()}
              className="p-1.5 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary rounded-lg hover:bg-bolt-elements-background-depth-1 transition-colors"
              title="Refresh contracts"
            >
              <div className="i-ph:arrows-clockwise" />
            </button>
          </div>
          <div className="space-y-2">
            {Object.keys(contracts).map((contractName) => (
              <button
                key={contractName}
                onClick={() => setSelectedContract(contractName)}
                className={`w-full px-3 py-2 text-left rounded-lg transition-colors ${
                  selectedContract === contractName
                    ? ''
                    : 'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary'
                }`}
              >
                {contracts[contractName].contractName || contractName.replace('.json', '')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 relative">
        <DeployedContracts contracts={deployedContracts} />
        {selectedContract && (
          <div className="max-w-2xl">
            <DeploymentForm
              contractName={contracts[selectedContract].contractName}
              constructorInputs={
                contracts[selectedContract].abi.find((item) => item.type === 'constructor')?.inputs || []
              }
              onDeploy={handleDeploy}
              rpcConfig={rpcConfig}
            />
          </div>
        )}
      </div>
    </div>
  );
});
const BLOCKCHAIR_API_BASE = 'https://api.blockchair.com/bitcoin';

export interface BlockchairResponse {
  data: {
    best_block_height: number;
    best_block_time: string;
    blocks?: Array<{
      id: number;
      time: string;
      transaction_count: number;
      difficulty: number;
    }>;
    suggested_transaction_fee_per_byte_sat?: number;
  };
  context: {
    code: number;
    source: string;
    state?: number;
  };
}

export interface BlockchairBlock {
  height: number;
  time: number;
}

export interface BlockchairService {
  latestBlock: BlockchairBlock | null;
  status: 'connecting' | 'connected' | 'error';
  error: string | null;
  lastUpdate: string;
}

const blockchairState: BlockchairService = {
  latestBlock: null,
  status: 'connecting',
  error: null,
  lastUpdate: '',
};

export const getBlockchairStatus = () => ({ ...blockchairState });

export async function getLatestBlockInfo(): Promise<{ height: number; time: number } | null> {
  // This can now be a fallback/backup source
  // Main block height updates will come from Electrum subscription
  try {
    const response = await fetch(`${BLOCKCHAIR_API_BASE}/stats`);
    const json: BlockchairResponse = await response.json();
    
    if (json?.data?.best_block_height) {
      return {
        height: json.data.best_block_height,
        time: Math.floor(new Date(json.data.best_block_time).getTime() / 1000),
      };
    }
    
    // Fallback to old format if needed
    if (json?.data?.blocks?.[0]) {
      return {
        height: json.data.blocks[0].id,
        time: Math.floor(new Date(json.data.blocks[0].time).getTime() / 1000),
      };
    }
  } catch (error) {
    console.error('[BlockchairAPI] Error fetching latest block:', error);
  }
  return null;
}

export async function getRecommendedFee(): Promise<number | null> {
  try {
    const response = await fetch(`${BLOCKCHAIR_API_BASE}/stats`);
    const json: BlockchairResponse = await response.json();
    return json?.data?.suggested_transaction_fee_per_byte_sat ?? null;
  } catch (error) {
    console.error('[BlockchairAPI] Error fetching recommended fee:', error);
    return null;
  }
}

export async function getAddressInfo(address: string) {
  try {
    const response = await fetch(`${BLOCKCHAIR_API_BASE}/dashboards/address/${address}`);
    const json = await response.json();
    return json?.data?.[address];
  } catch (error) {
    console.error('Blockchair API Error:', error);
    return null;
  }
}

// Isolate Blockchair updates to this service only
export const startBlockchairPolling = (intervalMs = 120000) => {
  const poll = async () => {
    try {
      const block = await getLatestBlockInfo();
      if (block) {
        blockchairState.latestBlock = block;
        blockchairState.status = 'connected';
        blockchairState.error = null;
      }
    } catch (error) {
      blockchairState.status = 'error';
      blockchairState.error = error instanceof Error ? error.message : 'Unknown error';
    }
    blockchairState.lastUpdate = new Date().toLocaleString();
  };

  poll(); // Initial poll
  return setInterval(poll, intervalMs);
};
